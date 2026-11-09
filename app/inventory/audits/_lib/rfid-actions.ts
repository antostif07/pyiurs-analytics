// app/inventory/audits/_lib/rfid-actions.ts
'use server';

import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";
import { OdooProduct, StockAuditItemInsert } from "./types";
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
    affectedProductIds?: number[];
}

interface OdooProductWithRfid extends OdooProduct {
    x_studio_rfid?: string | false | null;
}

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { ...empty, error: "Non authentifié." };

        const epcs = normalizeEpcList(rawEpcs);
        if (epcs.length === 0) {
            return { ...empty, error: "Aucun EPC valide fourni." };
        }
        if (epcs.length > 1000) {
            return {
                ...empty,
                error: `Maximum 1000 EPC par batch (reçu ${epcs.length}).`,
            };
        }

        const batchId = crypto.randomUUID();

        /* ─── 1. Check audit status ────────────────────────── */
        const { data: audit, error: auditErr } = await supabase
            .from("stock_audits")
            .select("id, status")
            .eq("id", auditId)
            .single();

        if (auditErr || !audit) return { ...empty, error: "Audit introuvable." };
        if (audit.status === "validated" || audit.status === "completed") {
            return {
                ...empty,
                error: "Cet audit est verrouillé, aucune lecture RFID supplémentaire n'est autorisée.",
            };
        }

        /* ─── 2. Match local dans le snapshot ──────────────── */
        // On tente de trouver les items par rfid_epc (rapide, 1 requête)
        const { data: snapshotByEpc, error: snapErr } = await supabase
            .from("stock_audit_items")
            .select("id, odoo_product_id, counted_qty, unit_cost, rfid_epc")
            .eq("audit_id", auditId)
            .in("rfid_epc", epcs);

        if (snapErr) {
            return { ...empty, error: `Chargement snapshot échoué : ${snapErr.message}` };
        }

        // Map EPC → item (1 EPC = 1 item grâce à UNIQUE(audit_id, rfid_epc))
        const matchedByEpc = new Map<
            string,
            { id: string; odoo_product_id: number; counted_qty: number; unit_cost: number }
        >();
        for (const item of snapshotByEpc ?? []) {
            if (item.rfid_epc) {
                matchedByEpc.set(normalizeEpc(item.rfid_epc), {
                    id: item.id,
                    odoo_product_id: item.odoo_product_id,
                    counted_qty: item.counted_qty ?? 0,
                    unit_cost: Number(item.unit_cost) || 0,
                });
            }
        }

        const matchedEpcs = new Set(matchedByEpc.keys());
        const unmatchedEpcs = epcs.filter((e) => !matchedEpcs.has(e));

        /* ─── 3. Insert dans stock_audit_rfid_reads ────────── */
        // Trace forensic : on enregistre TOUS les EPC reçus (matched ou pas)
        const readRows = epcs.map((epc) => {
            const match = matchedByEpc.get(epc);
            return {
                audit_id: auditId,
                epc,
                odoo_product_id: match?.odoo_product_id ?? null,
                internal_barcode: null,
                is_unexpected: false,   // mis à jour plus bas si fallback Odoo
                batch_id: batchId,
                reader_id: readerId ?? null,
            };
        });

        const { data: insertedRows, error: insertErr } = await supabase
            .from("stock_audit_rfid_reads")
            .upsert(readRows, {
                onConflict: "audit_id,epc",
                ignoreDuplicates: true,
            })
            .select("epc");

        if (insertErr) {
            return { ...empty, error: `Insertion RFID échouée : ${insertErr.message}` };
        }

        const added = (insertedRows ?? []).length;
        const ignoredDuplicates = epcs.length - added;

        /* ─── 4. Update counted_qty pour les items matchés ─── */
        const itemsToUpdate: {
            id: string;
            odoo_product_id: number;
            oldCounted: number;
            cost: number;
        }[] = [];

        for (const item of matchedByEpc.values()) {
            if (item.counted_qty === 1) continue;   // déjà compté
            itemsToUpdate.push({
                id: item.id,
                odoo_product_id: item.odoo_product_id,
                oldCounted: item.counted_qty,
                cost: item.unit_cost,
            });
        }

        let productsAffected = 0;
        if (itemsToUpdate.length > 0) {
            const now = new Date().toISOString();
            const { data: updated, error: updErr } = await supabase
                .from("stock_audit_items")
                .update({ counted_qty: 1, scanned_at: now })
                .eq("audit_id", auditId)
                .in("id", itemsToUpdate.map((i) => i.id))
                .neq("counted_qty", 1)
                .select("id");

            if (updErr) {
                return {
                    ...empty,
                    added,
                    ignoredDuplicates,
                    error: `Update snapshot échoué : ${updErr.message}`,
                };
            }
            productsAffected = (updated ?? []).length;
        }

        /* ─── 5. Fallback Odoo pour les EPC non trouvés localement ── */
        let unknownEpcs = 0;
        let unexpectedAdded = 0;
        const unexpectedProductIds: number[] = [];

        if (unmatchedEpcs.length > 0) {
            let odooProducts: OdooProductWithRfid[] = [];
            try {
                odooProducts = await odooClient.searchRead<OdooProductWithRfid>(
                    "product.product",
                    {
                        domain: [
                            ["active", "=", true],
                            ["x_studio_rfid", "in", unmatchedEpcs],
                        ],
                        fields: [
                            "id", "name", "barcode", "default_code", "hs_code",
                            "standard_price", "list_price", "create_date",
                            "x_studio_segment",
                            "x_studio_many2one_field_21bvh",
                            "x_studio_many2one_field_Arl5D",
                            "x_studio_rfid",
                            "pos_categ_ids",
                        ],
                        limit: unmatchedEpcs.length,
                    },
                );
            } catch (err) {
                console.error("[RFID_FALLBACK_ODOO_ERROR]", err);
            }

            const productByEpc = new Map<string, OdooProductWithRfid>();
            for (const p of odooProducts) {
                const rawRfid = p.x_studio_rfid;
                if (typeof rawRfid === "string" && rawRfid.trim()) {
                    productByEpc.set(normalizeEpc(rawRfid), p);
                }
            }

            unknownEpcs = unmatchedEpcs.filter((e) => !productByEpc.has(e)).length;

            // Ajouter les EPC trouvés dans Odoo comme "inattendus"
            if (productByEpc.size > 0) {
                // Déduplication par product_id
                const uniqueUnexpected = new Map<number, OdooProductWithRfid>();
                for (const [, p] of productByEpc) {
                    if (!uniqueUnexpected.has(p.id)) {
                        uniqueUnexpected.set(p.id, p);
                    }
                }

                const unexpectedIds = Array.from(uniqueUnexpected.keys());

                // Résolution POS + locations
                const allCategIds = new Set<number>();
                uniqueUnexpected.forEach((p) => {
                    if (Array.isArray(p.pos_categ_ids)) {
                        p.pos_categ_ids.forEach((id) => {
                            if (Number.isInteger(id)) allCategIds.add(id);
                        });
                    }
                });
                const categNameMap = await resolvePosCategoryNames(Array.from(allCategIds));

                let foundLocationsMap = new Map<number, { id: number; name: string; quantity: number; company_id: number; company_name: string }[]>();
                try {
                    foundLocationsMap = await resolvePositiveLocationsForProducts(unexpectedIds);
                } catch (err) {
                    console.error("[RFID_UNEXPECTED_LOCATIONS_ERROR]", err);
                }

                const now = new Date().toISOString();
                const itemsToInsert: StockAuditItemInsert[] = unexpectedIds.map((pid) => {
                    const p = uniqueUnexpected.get(pid)!;
                    const rawCode = (p.barcode || p.default_code || "") as string;
                    const code = rawCode.trim().toUpperCase();
                    const rfid = typeof p.x_studio_rfid === "string"
                        ? normalizeEpc(p.x_studio_rfid)
                        : null;

                    const categIds = Array.isArray(p.pos_categ_ids)
                        ? p.pos_categ_ids.filter((id): id is number => Number.isInteger(id))
                        : [];
                    const categNames = categIds.map((id) => categNameMap.get(id) ?? `#${id}`);

                    return {
                        audit_id: auditId,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode: code || `RFID-${pid}-${now.slice(0, 10)}`,
                        supplier_ref: "Hors Périmètre RFID",
                        hs_code: typeof p.hs_code === "string" && p.hs_code ? p.hs_code : "Inattendu",
                        brand: extractOdooMany2oneName(p.x_studio_many2one_field_21bvh, "N/A"),
                        color: extractOdooMany2oneName(p.x_studio_many2one_field_Arl5D, "N/A"),
                        odoo_create_date: typeof p.create_date === "string" ? p.create_date : null,
                        sold_locations: toJson([]),
                        found_locations: toJson(foundLocationsMap.get(p.id) ?? []),
                        theoretical_qty: 0,
                        counted_qty: 1,
                        unit_cost: resolveUnitCost(p),
                        pos_category_ids: categIds,
                        pos_category_names: categNames,
                        scanned_at: now,
                        rfid_epc: rfid,   // ← persiste l'EPC
                    } as StockAuditItemInsert;
                });

                const { data: insertedUnexpected, error: insErr } = await supabase
                    .from("stock_audit_items")
                    .insert(itemsToInsert)
                    .select("id");

                if (insErr) {
                    console.error("[RFID_UNEXPECTED_INSERT_ERROR]", insErr);
                } else {
                    unexpectedAdded = (insertedUnexpected ?? []).length;
                    unexpectedProductIds.push(...unexpectedIds);
                }
            }
        }

        /* ─── 6. Delta atomique totals ─────────────────────── */
        let deltaScanned = 0;
        let deltaQty = 0;
        let deltaValue = 0;

        for (const item of itemsToUpdate) {
            deltaScanned += 1;
            deltaQty += 1 - item.oldCounted;
            deltaValue += (1 - item.oldCounted) * item.cost;
        }

        for (const pid of unexpectedProductIds) {
            const p = (await Promise.resolve(null)) as null;   // déjà inséré à 1, on compte son coût via RPC séparé ci-dessous
        }

        // Pour les inattendus, on a déjà les infos : +1 scanned, +1 qty, +cost
        // On recalcule depuis les items insérés (simple : on relit)
        if (unexpectedAdded > 0) {
            // Simplification : le coût exact est dans les items, mais on peut
            // approximer avec un delta global. Pour rester précis :
            // on aurait besoin des coûts exacts → relire les items insérés.
            // → faire un recalc complet après (safe)
            deltaScanned += unexpectedAdded;
            deltaQty += unexpectedAdded;
            // Pour la value, on ne l'ajoute pas ici et on fait un recalc full
            // à la fin pour être sûr. Voir plus bas.
        }

        if (deltaScanned > 0 || deltaQty !== 0) {
            await incrementAuditTotalsAtomic(supabase, auditId, {
                scanned: deltaScanned,
                qty: deltaQty,
                value: deltaValue,
            });
        }

        // Si on a ajouté des inattendus, on refait un recalc full pour
        // récupérer la value exacte (peu fréquent → OK)
        if (unexpectedAdded > 0) {
            const { data: allItems } = await supabase
                .from("stock_audit_items")
                .select("counted_qty, theoretical_qty, unit_cost")
                .eq("audit_id", auditId);

            if (allItems) {
                let totalScanned = 0;
                let totalDiffQty = 0;
                let totalDiffVal = 0;
                for (const i of allItems) {
                    const c = i.counted_qty ?? 0;
                    const t = i.theoretical_qty ?? 0;
                    const cost = Number(i.unit_cost) || 0;
                    if (c === 1) totalScanned++;
                    totalDiffQty += c - t;
                    totalDiffVal += (c - t) * cost;
                }
                await supabase
                    .from("stock_audits")
                    .update({
                        total_items_scanned: totalScanned,
                        total_discrepancy_qty: totalDiffQty,
                        total_discrepancy_value: totalDiffVal,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", auditId);
            }
        }

        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            batchId,
            added,
            ignoredDuplicates,
            alreadyCounted: itemsToUpdate.length - productsAffected,
            unknownEpcs,
            unexpectedAdded,
            productsAffected,
            affectedProductIds: [
                ...itemsToUpdate.map((i) => i.odoo_product_id),
                ...unexpectedProductIds,
            ],
            message:
                `${added} nouveau(x) EPC · ${ignoredDuplicates} doublon(s) · ` +
                `${unknownEpcs} inconnu(s) · ${unexpectedAdded} hors périmètre`,
        };
    } catch (err: unknown) {
        console.error("[RECORD_RFID_BATCH_ERROR]", err);
        return {
            ...empty,
            error: err instanceof Error ? err.message : "Erreur lors du batch RFID.",
        };
    }
}