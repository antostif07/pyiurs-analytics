// app/inventory/audits/_lib/rfid-actions.ts
'use server';

import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";
import {
    OdooProduct,
    StockAuditItemInsert,
} from "./types";
import { Json } from "@/lib/supabase/database.types";
import { extractOdooMany2oneName, toJson } from "./helpers";
import {
    resolveListPrice,
    resolvePositiveLocationsForProducts,
    resolveUnitCost,
} from "./audits-actions-helpers";
import {
    incrementAuditTotalsAtomic,
    resolvePosCategoryNames,
} from "./audits-actions";

/* ════════════════════════════════════════════════════════════════════ */
/* TYPES                                                                */
/* ════════════════════════════════════════════════════════════════════ */

export interface RfidBatchResult {
    success: boolean;
    error?: string;
    message?: string;
    batchId?: string;
    added: number;
    ignoredDuplicates: number;
    alreadyCounted: number;
    unknownEpcs: number;
    unexpectedAdded: number;
    productsAffected: number;
    /** IDs Odoo des items dont counted_qty a bougé → pour optimistic UI */
    affectedProductIds?: number[];   // ← AJOUT
}

interface OdooProductWithRfid extends OdooProduct {
    x_studio_rfid?: string | false | null;
}

/* ════════════════════════════════════════════════════════════════════ */
/* HELPERS                                                              */
/* ════════════════════════════════════════════════════════════════════ */

/**
 * Normalise un EPC : trim + uppercase + filtre les vides.
 * Utilisé côté serveur, mais aussi côté client avant envoi.
 */
function normalizeEpc(raw: string): string {
    return raw.trim().toUpperCase();
}

function normalizeEpcList(raw: string[]): string[] {
    if (!Array.isArray(raw)) return [];
    const set = new Set<string>();
    for (const e of raw) {
        if (typeof e !== "string") continue;
        const clean = normalizeEpc(e);
        if (clean.length > 0) set.add(clean);
    }
    return Array.from(set);
}

/* ════════════════════════════════════════════════════════════════════ */
/* ACTION PRINCIPALE                                                    */
/* ════════════════════════════════════════════════════════════════════ */

export async function recordRfidBatchAction(
    auditId: string,
    rawEpcs: string[],
    readerId?: string,
): Promise<RfidBatchResult> {
    const empty: RfidBatchResult = {
        success: false,
        added: 0,
        ignoredDuplicates: 0,
        alreadyCounted: 0,
        unknownEpcs: 0,
        unexpectedAdded: 0,
        productsAffected: 0,
    };

    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { ...empty, error: "Non authentifié." };
        }

        /* ─── 1. Normalisation ──────────────────────────────── */
        const epcs = normalizeEpcList(rawEpcs);
        if (epcs.length === 0) {
            return { ...empty, error: "Aucun EPC valide fourni." };
        }

        const MAX_BATCH = 1000;
        if (epcs.length > MAX_BATCH) {
            return {
                ...empty,
                error: `Batch trop important (${epcs.length} EPC). Maximum ${MAX_BATCH} par appel.`,
            };
        }

        const batchId = crypto.randomUUID();

        /* ─── 2. Vérification statut audit ──────────────────── */
        const { data: audit, error: auditErr } = await supabase
            .from("stock_audits")
            .select("id, status")
            .eq("id", auditId)
            .single();

        if (auditErr || !audit) {
            return { ...empty, error: "Audit introuvable." };
        }
        if (audit.status === "validated" || audit.status === "completed") {
            return {
                ...empty,
                error:
                    "Cet audit est verrouillé, aucune lecture RFID supplémentaire n'est autorisée.",
            };
        }

        /* ─── 3. Lookup Odoo des produits par EPC ───────────── */
        const odooProducts = await odooClient.searchRead<OdooProductWithRfid>(
            "product.product",
            {
                domain: [
                    ["active", "=", true],
                    ["x_studio_rfid", "in", epcs],
                ],
                fields: [
                    "id",
                    "name",
                    "barcode",
                    "default_code",
                    "hs_code",
                    "standard_price",
                    "list_price",
                    "create_date",
                    "x_studio_segment",
                    "x_studio_many2one_field_21bvh",
                    "x_studio_many2one_field_Arl5D",
                    "x_studio_rfid",
                    "pos_categ_ids",
                ],
                limit: epcs.length,
            },
        );

        // Map : EPC → OdooProduct
        const productByEpc = new Map<string, OdooProductWithRfid>();
        for (const p of odooProducts || []) {
            const epcRaw = p.x_studio_rfid;
            if (typeof epcRaw === "string" && epcRaw.trim()) {
                productByEpc.set(normalizeEpc(epcRaw), p);
            }
        }

        const unknownEpcs = epcs.filter((e) => !productByEpc.has(e)).length;

        /* ─── 4. Récupération des items existants du snapshot ─ */
        const { data: existingItems, error: itemsErr } = await supabase
            .from("stock_audit_items")
            .select("id, odoo_product_id, counted_qty, unit_cost")
            .eq("audit_id", auditId);

        if (itemsErr) {
            return {
                ...empty,
                error: `Impossible de charger le snapshot : ${itemsErr.message}`,
            };
        }

        const snapshotByProductId = new Map<
            number,
            { id: string; counted_qty: number; unit_cost: number }
        >();
        (existingItems ?? []).forEach((i) => {
            snapshotByProductId.set(i.odoo_product_id, {
                id: i.id,
                counted_qty: i.counted_qty ?? 0,
                unit_cost: Number(i.unit_cost) || 0,
            });
        });

        /* ─── 5. Insert batched dans stock_audit_rfid_reads ─── */
        // On prépare tous les reads AVANT l'insert, y compris les inconnus
        // (on garde la trace même si le produit est introuvable → forensic)
        const readRows = epcs.map((epc) => {
            const product = productByEpc.get(epc);
            const barcode = product
                ? ((product.barcode || product.default_code || "") as string)
                    .trim()
                    .toUpperCase()
                : null;
            const inSnapshot = product
                ? snapshotByProductId.has(product.id)
                : false;
            return {
                audit_id: auditId,
                epc,
                odoo_product_id: product?.id ?? null,
                internal_barcode: barcode && barcode.length > 0 ? barcode : null,
                is_unexpected: product ? !inSnapshot : false,
                batch_id: batchId,
                reader_id: readerId ?? null,
            };
        });

        // Supabase JS : upsert avec onConflict + ignoreDuplicates
        const { data: insertedRows, error: insertErr } = await supabase
            .from("stock_audit_rfid_reads")
            .upsert(readRows, {
                onConflict: "audit_id,epc",
                ignoreDuplicates: true,
            })
            .select("epc, odoo_product_id, is_unexpected");

        if (insertErr) {
            console.error("[RFID_INSERT_ERROR]", insertErr);
            return {
                ...empty,
                error: `Insertion RFID échouée : ${insertErr.message}`,
            };
        }

        const added = (insertedRows ?? []).length;
        const ignoredDuplicates = epcs.length - added;

        /* ─── 6. Update des items snapshot → counted_qty = 1 ── */
        const productIdsToMark: number[] = [];
        const productsInSnapshot: {
            productId: number;
            itemId: string;
            oldCounted: number;
            cost: number;
        }[] = [];

        for (const product of productByEpc.values()) {
            const snap = snapshotByProductId.get(product.id);
            if (!snap) continue; // Hors snapshot → traité plus bas
            if (snap.counted_qty === 1) continue; // Déjà compté → no-op

            productIdsToMark.push(product.id);
            productsInSnapshot.push({
                productId: product.id,
                itemId: snap.id,
                oldCounted: snap.counted_qty,
                cost: snap.unit_cost,
            });
        }

        let productsAffected = 0;

        if (productIdsToMark.length > 0) {
            const now = new Date().toISOString();
            const { data: updatedRows, error: updateErr } = await supabase
                .from("stock_audit_items")
                .update({ counted_qty: 1, scanned_at: now })
                .eq("audit_id", auditId)
                .in("odoo_product_id", productIdsToMark)
                .neq("counted_qty", 1)
                .select("id");

            if (updateErr) {
                console.error("[RFID_UPDATE_SNAPSHOT_ERROR]", updateErr);
                return {
                    ...empty,
                    added,
                    ignoredDuplicates,
                    unknownEpcs,
                    error: `Mise à jour du snapshot échouée : ${updateErr.message}`,
                };
            }

            productsAffected = (updatedRows ?? []).length;
        }

        /* ─── 7. Produits hors snapshot → insert "inattendu" ── */
        const unexpectedProducts = Array.from(productByEpc.values()).filter(
            (p) => !snapshotByProductId.has(p.id),
        );

        // Filtrer ceux déjà enregistrés en inattendu (cas rare : plusieurs
        // EPC du même produit hors snapshot)
        const unexpectedByProduct = new Map<number, OdooProductWithRfid>();
        for (const p of unexpectedProducts) {
            if (!unexpectedByProduct.has(p.id)) {
                unexpectedByProduct.set(p.id, p);
            }
        }

        let unexpectedAdded = 0;

        if (unexpectedByProduct.size > 0) {
            const unexpectedProductIds = Array.from(unexpectedByProduct.keys());

            // Résolution POS categories + locations pour ces produits
            const allCategIds = new Set<number>();
            unexpectedByProduct.forEach((p) => {
                if (Array.isArray(p.pos_categ_ids)) {
                    p.pos_categ_ids.forEach((id) => {
                        if (Number.isInteger(id)) allCategIds.add(id);
                    });
                }
            });
            const categNameMap = await resolvePosCategoryNames(
                Array.from(allCategIds),
            );

            let foundLocationsMap = new Map<
                number,
                { id: number; name: string }[]
            >();
            try {
                foundLocationsMap =
                    await resolvePositiveLocationsForProducts(
                        unexpectedProductIds,
                    );
            } catch (err) {
                console.error("[RFID_UNEXPECTED_LOCATIONS_ERROR]", err);
            }

            const now = new Date().toISOString();
            const itemsToInsert: StockAuditItemInsert[] =
                unexpectedProductIds.map((pid) => {
                    const p = unexpectedByProduct.get(pid)!;
                    const rawCode = (p.barcode ||
                        p.default_code ||
                        "") as string;
                    const code = rawCode.trim().toUpperCase();

                    const categIds = Array.isArray(p.pos_categ_ids)
                        ? p.pos_categ_ids.filter((id): id is number =>
                            Number.isInteger(id),
                        )
                        : [];
                    const categNames = categIds.map(
                        (id) => categNameMap.get(id) ?? `#${id}`,
                    );

                    return {
                        audit_id: auditId,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode:
                            code || `RFID-${pid}-${now.slice(0, 10)}`,
                        supplier_ref: "Hors Périmètre RFID",
                        hs_code:
                            typeof p.hs_code === "string" && p.hs_code
                                ? p.hs_code
                                : "Inattendu",
                        brand: extractOdooMany2oneName(
                            p.x_studio_many2one_field_21bvh,
                            "N/A",
                        ),
                        color: extractOdooMany2oneName(
                            p.x_studio_many2one_field_Arl5D,
                            "N/A",
                        ),
                        odoo_create_date:
                            typeof p.create_date === "string"
                                ? p.create_date
                                : null,
                        sold_locations: toJson([]),
                        found_locations: toJson(
                            foundLocationsMap.get(p.id) ?? [],
                        ),
                        theoretical_qty: 0,
                        counted_qty: 1,
                        unit_cost: resolveUnitCost(p),
                        pos_category_ids: categIds,
                        pos_category_names: categNames,
                        scanned_at: now,
                    } satisfies StockAuditItemInsert;
                });

            const { data: insertedUnexpected, error: insertUnexpectedErr } =
                await supabase
                    .from("stock_audit_items")
                    .insert(itemsToInsert)
                    .select("id");

            if (insertUnexpectedErr) {
                console.error(
                    "[RFID_UNEXPECTED_INSERT_ERROR]",
                    insertUnexpectedErr,
                );
                // On continue : on ne bloque pas le reste
            } else {
                unexpectedAdded = (insertedUnexpected ?? []).length;
            }
        }

        /* ─── 8. Delta atomique totals ──────────────────────── */
        // scanned : +1 pour chaque item qui passe à counted_qty = 1
        //           (items existants modifiés + items inattendus insérés)
        // qty     : sum(newCounted - oldCounted)
        //           - item existant 0 → 1  : +1
        //           - item existant -1 → 1 : +2
        //           - item inattendu 0→1   : +1 (theoretical = 0)
        // value   : sum((newCounted - oldCounted) * cost)

        let deltaScanned = 0;
        let deltaQty = 0;
        let deltaValue = 0;

        // Items existants modifiés
        for (const p of productsInSnapshot) {
            const newCounted = 1;
            const diff = newCounted - p.oldCounted;
            deltaScanned += 1;
            deltaQty += diff;
            deltaValue += diff * p.cost;
        }

        // Items inattendus insérés
        if (unexpectedAdded > 0) {
            // Recalcul : on a besoin du cost de chaque produit inséré
            for (const [pid] of unexpectedByProduct) {
                const p = unexpectedByProduct.get(pid)!;
                const cost = resolveUnitCost(p);
                deltaScanned += 1;
                deltaQty += 1; // counted 0 → 1, theoretical = 0
                deltaValue += cost;
            }
        }

        if (deltaScanned > 0 || deltaQty !== 0 || deltaValue !== 0) {
            await incrementAuditTotalsAtomic(supabase, auditId, {
                scanned: deltaScanned,
                qty: deltaQty,
                value: deltaValue,
            });
        }

        /* ─── 9. Revalidation Next.js ──────────────────────── */
        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            batchId,
            added,
            ignoredDuplicates,
            alreadyCounted: productIdsToMark.length - productsAffected,
            unknownEpcs,
            unexpectedAdded,
            productsAffected,
            affectedProductIds: [
                ...productIdsToMark,
                ...Array.from(unexpectedByProduct.keys()),
            ],   // ← AJOUT
            message: `${added} nouvel(aux) EPC · ${ignoredDuplicates} doublon(s) · ${unknownEpcs} inconnu(s) · ${unexpectedAdded} hors périmètre`,
        };
    } catch (err: unknown) {
        console.error("[RECORD_RFID_BATCH_ERROR]", err);
        return {
            ...empty,
            error:
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'enregistrement du batch RFID.",
        };
    }
}