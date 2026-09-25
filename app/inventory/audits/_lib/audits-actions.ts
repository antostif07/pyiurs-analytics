'use server';

import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import type { OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";
import { SupabaseClient } from "@supabase/supabase-js";
import {
    AuditFilters,
    StockAudit,
    OdooQuant,
    OdooProduct,
    SoldLocation,
    StockAuditItemInsert,
    OdooPosCategory,
    FoundLocation,
    SyncItemPatch,
} from "./types";
import { Json } from "@/lib/supabase/database.types";
import { extractOdooMany2oneName, toJson } from "./helpers";
import { resolvePositiveLocationsForProducts, resolveUnitCost } from "./audits-actions-helpers";

/**
 * Brouillon local d'un item d'audit — utilise les types métier (SoldLocation[],
 * number[], string[]) pendant toute la construction. La conversion finale
 * vers `Json` se fait UNE SEULE FOIS au moment de l'appel RPC.
 */
type AuditItemDraft = {
    odoo_product_id: number;
    product_name: string;
    internal_barcode: string;
    supplier_ref: string;
    hs_code: string;
    brand: string;
    color: string;
    odoo_create_date: string | null;
    sold_locations: SoldLocation[];
    theoretical_qty: number;
    counted_qty: number;
    unit_cost: number;
    pos_category_ids: number[];
    pos_category_names: string[];
};

/* ──────────────────────────────────────────────────────────────────── */
/* HELPERS                                                              */
/* ──────────────────────────────────────────────────────────────────── */
/* ──────────────────────────────────────────────────────────────────── */
/* TYPE GUARDS / NORMALISATION JSONB                                    */
/* ──────────────────────────────────────────────────────────────────── */

/** Narrow un `Json` en `number[]` */
function normalizeNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is number => typeof v === "number" && Number.isInteger(v));
}

/** Narrow un `Json` en `string[]` */
function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string");
}

/** Extraction sécurisée des IDs de boutiques autorisées depuis JSONB */
function extractAllowedShopIds(assignedShops: unknown): string[] {
    if (!Array.isArray(assignedShops)) return [];
    return assignedShops.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

/**
 * Résout les noms des catégories POS Odoo depuis un set d'IDs.
 * Cache local par appel. Retourne une map { id → name }.
 */
async function resolvePosCategoryNames(ids: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (ids.length === 0) return map;

    try {
        const categories = await odooClient.searchRead<OdooPosCategory>(
            "pos.category",
            { domain: [["id", "in", ids]], fields: ["id", "name"] }
        );
        (categories || []).forEach((c) => map.set(c.id, c.name));
    } catch (err) {
        console.error("[RESOLVE_POS_CATEG_ERROR]", err);
    }
    return map;
}

/**
 * Recalcul complet des totaux (utilisé uniquement en sanity-check / validation).
 * Pour les scans unitaires, préférer la RPC atomique increment_audit_totals.
 */
async function recalcAuditTotalsFull(supabase: SupabaseClient, auditId: string) {
    const { data: allItems, error } = await supabase
        .from("stock_audit_items")
        .select("counted_qty, theoretical_qty, unit_cost")
        .eq("audit_id", auditId);

    if (error || !allItems) {
        console.error("[RECALC_AUDIT_TOTALS_ERROR]", error);
        return;
    }

    let totalScanned = 0;
    let totalDiffQty = 0;
    let totalDiffVal = 0;

    for (const i of allItems) {
        const counted = i.counted_qty ?? 0;
        const theoretical = i.theoretical_qty ?? 0;
        const cost = Number(i.unit_cost) || 0;

        if (counted === 1) totalScanned++;

        const diff = counted - theoretical;
        totalDiffQty += diff;
        totalDiffVal += diff * cost;
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

/** Delta atomique via RPC Postgres (fix race condition B4) */
async function incrementAuditTotalsAtomic(
    supabase: SupabaseClient,
    auditId: string,
    delta: { scanned: number; qty: number; value: number }
) {
    if (delta.scanned === 0 && delta.qty === 0 && delta.value === 0) return;

    const { error } = await supabase.rpc("increment_audit_totals", {
        p_audit_id: auditId,
        p_scanned_delta: delta.scanned,
        p_qty_delta: delta.qty,
        p_value_delta: delta.value,
    });

    if (error) {
        console.error("[INCREMENT_AUDIT_TOTALS_ERROR]", error);
        throw new Error(error.message);
    }
}

/**
 * HELPER DE PERFORMANCE : Recalcul Atomique des Totaux de l'Audit Parent
 */
async function updateAuditTotals(supabase: SupabaseClient, auditId: string) {
    const { data: allItems, error } = await supabase
        .from("stock_audit_items")
        .select("counted_qty, theoretical_qty, unit_cost")
        .eq("audit_id", auditId);

    if (error || !allItems) {
        console.error("[UPDATE_AUDIT_TOTALS_ERROR]", error);
        return;
    }

    let totalScanned = 0;
    let totalDiffQty = 0;
    let totalDiffVal = 0;

    for (const i of allItems) {
        const counted = i.counted_qty ?? 0;
        const theoretical = i.theoretical_qty ?? 0;
        const cost = Number(i.unit_cost) || 0;

        if (counted === 1) {
            totalScanned++;
        }

        const diff = counted - theoretical;
        totalDiffQty += diff;
        totalDiffVal += diff * cost;
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

/* ════════════════════════════════════════════════════════════════════ */
/* 1. CRÉATION D'AUDIT — transactionnelle + POS categories              */
/* ════════════════════════════════════════════════════════════════════ */
export async function createAuditSessionAction(
    shopIds: string[],
    departments: string[],
    notes?: string,
    auditDate?: string
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? null;

        const cleanShopIds = (shopIds || []).filter(
            (id): id is string => typeof id === "string" && id.trim().length > 0
        );

        if (cleanShopIds.length === 0) {
            return { success: false, error: "Veuillez sélectionner au moins une boutique valide." };
        }

        /* ─── Boutiques ─── */
        const { data: shops, error: shopError } = await supabase
            .from("shops")
            .select("id, name, odoo_company_id")
            .in("id", cleanShopIds);

        if (shopError || !shops?.length) {
            return { success: false, error: "Boutique(s) introuvable(s)." };
        }

        const shopNames = shops.map((s) => s.name).join(", ");
        const odooCompanyIds = [
            ...new Set(
                shops
                    .map((s) => s.odoo_company_id)
                    .filter((id): id is number => typeof id === "number" && id > 0)
            ),
        ];

        if (odooCompanyIds.length === 0) {
            return {
                success: false,
                error: "Aucun `odoo_company_id` associé aux boutiques sélectionnées.",
            };
        }

        /* ─── Métadonnées audit ─── */
        const departmentLabel = departments.length > 0 ? departments.join(", ") : "Tous";
        const selectedDate = auditDate ? new Date(auditDate) : new Date();
        const todayStr = new Date().toISOString().split("T")[0];
        const isHistorical = !!auditDate && auditDate !== todayStr;

        const datePrefix = selectedDate.toISOString().slice(0, 7).replace("-", "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const reference = `AUD-${datePrefix}-${randomSuffix}`;

        const notesFinal = notes
            ? isHistorical ? `[Historique du ${auditDate}] ${notes}` : notes
            : isHistorical ? `[Historique du ${auditDate}]` : null;

        const auditDateStr = selectedDate.toISOString().split("T")[0];

        /* ─── Appels Odoo séquentiels (jamais Promise.all sur Odoo JSON-RPC) ─── */

        // A. Quants positifs de la société cible
        const positiveQuants = await odooClient.searchRead<OdooQuant>("stock.quant", {
            domain: [
                ["company_id", "in", odooCompanyIds],
                ["location_id.usage", "=", "internal"],
                ["quantity", ">", 0],
            ],
            fields: ["product_id", "location_id", "quantity"],
            limit: 25000,
        });

        // B. Quants négatifs (toutes compagnies du groupe)
        const negativeQuants = await odooClient.searchRead<OdooQuant>("stock.quant", {
            domain: [
                ["location_id.usage", "=", "internal"],
                ["quantity", "<", 0],
            ],
            fields: ["product_id", "location_id", "quantity", "company_id"],
            limit: 25000,
        });

        const productQuantMap = new Map<number, Array<{ locationName: string; quantity: number }>>();
        const soldLocationsMap = new Map<number, SoldLocation[]>();

        /* ═══════════════════════════════════════════════════════════════
           VALIDATION STRICTE — Un quant sans location valide est un BUG Odoo.
           On l'ignore + log l'anomalie. Aucun fallback fictif ("Stock Principal").
           ═══════════════════════════════════════════════════════════════ */

        /* ─── Quants positifs (company ciblée) ─── */
        (positiveQuants || []).forEach((q) => {
            const pid = Array.isArray(q.product_id) ? q.product_id[0] : null;
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : null;
            const locName = Array.isArray(q.location_id) ? q.location_id[1] : null;

            /* Validation stricte */
            if (typeof pid !== "number" || pid <= 0) {
                console.warn(
                    "[CREATE_AUDIT] Quant positif ignoré — product_id invalide :",
                    JSON.stringify(q)
                );
                return;
            }
            if (
                typeof locId !== "number" ||
                locId <= 0 ||
                typeof locName !== "string" ||
                !locName.trim()
            ) {
                console.warn(
                    `[CREATE_AUDIT] Quant positif ignoré — location_id invalide (product ${pid}) :`,
                    JSON.stringify(q)
                );
                return;
            }

            const qty = Math.round(q.quantity || 0);
            if (qty <= 0) return;

            if (!productQuantMap.has(pid)) productQuantMap.set(pid, []);
            productQuantMap.get(pid)!.push({ locationName: locName.trim(), quantity: qty });
        });

        /* ─── Quants négatifs (toutes companies) ─── */
        (negativeQuants || []).forEach((q) => {
            const pid = Array.isArray(q.product_id) ? q.product_id[0] : null;
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : null;
            const locName = Array.isArray(q.location_id) ? q.location_id[1] : null;

            if (typeof pid !== "number" || pid <= 0) {
                console.warn(
                    "[CREATE_AUDIT] Quant négatif ignoré — product_id invalide :",
                    JSON.stringify(q)
                );
                return;
            }
            if (
                typeof locId !== "number" ||
                locId <= 0 ||
                typeof locName !== "string" ||
                !locName.trim()
            ) {
                console.warn(
                    `[CREATE_AUDIT] Quant négatif ignoré — location_id invalide (product ${pid}) :`,
                    JSON.stringify(q)
                );
                return;
            }

            if (!soldLocationsMap.has(pid)) soldLocationsMap.set(pid, []);
            const arr = soldLocationsMap.get(pid)!;
            if (!arr.some((l) => l.id === locId)) {
                arr.push({ id: locId, name: locName.trim() });
            }
        });

        const uniqueProductIds = Array.from(
            new Set([...productQuantMap.keys(), ...soldLocationsMap.keys()])
        );

        /* ─── Cas vide : pas de stock Odoo → audit vide mais valide ─── */
        if (uniqueProductIds.length === 0) {
            const { data: auditId, error: rpcError } = await supabase.rpc("create_audit_session", {
                p_reference: reference,
                p_shop_id: cleanShopIds[0],
                p_shop_name: shopNames,
                p_department: departmentLabel,
                p_notes: notesFinal || "",
                p_created_by: userId || "",
                p_audit_date: auditDateStr,
                p_items: [] as unknown as Json,
            });
            if (rpcError) throw new Error(rpcError.message);

            revalidatePath("/inventory/audits");
            return {
                success: true,
                auditId,
                reference,
                warning: "Aucun stock Odoo trouvé pour cette société.",
            };
        }

        /* ─── Produits Odoo ─── */
        const productDomain: OdooDomain = [
            ["id", "in", uniqueProductIds],
            ["active", "=", true],
            ["available_in_pos", "=", true],
        ];

        const isAllSelected = departments.includes("Tous") || departments.length === 0;
        if (!isAllSelected) {
            productDomain.push(["x_studio_segment", "in", departments]);
        }

        const products = await odooClient.searchRead<OdooProduct>("product.product", {
            domain: productDomain,
            fields: [
                "id", "name", "barcode", "default_code", "hs_code",
                "standard_price", "list_price",
                "create_date", "x_studio_segment",
                "x_studio_many2one_field_21bvh",
                "x_studio_many2one_field_Arl5D",
                "pos_categ_ids",
            ],
            limit: uniqueProductIds.length,
        });

        /* ─── Résolution POS categories (1 seul appel Odoo) ─── */
        const allCategIds = new Set<number>();
        (products || []).forEach((p) => {
            if (Array.isArray(p.pos_categ_ids)) {
                p.pos_categ_ids.forEach((id) => {
                    if (Number.isInteger(id)) allCategIds.add(id);
                });
            }
        });
        const categNameMap = await resolvePosCategoryNames(Array.from(allCategIds));

        /* ─── Construction du snapshot ─── */
        const barcodeMap = new Map<string, AuditItemDraft>();
        let skippedNoLocation = 0;

        (products || []).forEach((p) => {
            const rawBarcode = (p.barcode || p.default_code || "") as string;
            const barcodeVal = rawBarcode.trim().toUpperCase();
            if (!barcodeVal) return;

            const quantList = productQuantMap.get(p.id) || [];
            const soldLocs = soldLocationsMap.get(p.id) || [];

            /* ═══════════════════════════════════════════════════════
               RÈGLE MÉTIER — Un produit DOIT avoir au moins une location.
               - quantList vide ET soldLocs vide → BUG Odoo → on skip.
               - quantList non vide → location réelle (source).
               - quantList vide MAIS soldLocs non vide → produit
                 uniquement détecté en négatif ailleurs. On le garde
                 avec supplier_ref = "—" (pas de localisation source).
               ═══════════════════════════════════════════════════════ */
            if (quantList.length === 0 && soldLocs.length === 0) {
                skippedNoLocation++;
                console.warn(
                    "[CREATE_AUDIT] Produit ignoré — aucune location valide (ni positive ni négative) :",
                    JSON.stringify({
                        productId: p.id,
                        barcode: p.barcode,
                        name: p.name,
                    })
                );
                return;
            }

            const totalQty = quantList.reduce((sum, q) => sum + q.quantity, 0);
            const locations = [...new Set(quantList.map((q) => q.locationName))].join(", ");

            const brandVal = extractOdooMany2oneName(p.x_studio_many2one_field_21bvh, "N/A");
            const colorVal = extractOdooMany2oneName(p.x_studio_many2one_field_Arl5D, "N/A");

            const categIds = Array.isArray(p.pos_categ_ids)
                ? p.pos_categ_ids.filter((id): id is number => Number.isInteger(id))
                : [];
            const categNames = categIds.map((id) => categNameMap.get(id) ?? `#${id}`);

            const existing = barcodeMap.get(barcodeVal);

            if (existing) {
                /* Fusion */
                existing.theoretical_qty += totalQty;

                if (soldLocs.length > 0) {
                    soldLocs.forEach((sl) => {
                        if (!existing.sold_locations.some((el) => el.id === sl.id)) {
                            existing.sold_locations.push(sl);
                        }
                    });
                }

                /* Fusion des locations texte si plusieurs quants */
                if (locations) {
                    const existingLocs = existing.supplier_ref
                        .split(", ")
                        .filter(Boolean);
                    const newLocs = locations.split(", ").filter(Boolean);
                    const merged = [...new Set([...existingLocs, ...newLocs])].join(", ");
                    existing.supplier_ref = merged;
                }

                existing.pos_category_ids = Array.from(
                    new Set([...existing.pos_category_ids, ...categIds])
                );
                existing.pos_category_names = Array.from(
                    new Set([...existing.pos_category_names, ...categNames])
                );
            } else {
                barcodeMap.set(barcodeVal, {
                    odoo_product_id: p.id,
                    product_name: p.name,
                    internal_barcode: barcodeVal,
                    /* "—" si le produit n'a QUE des locations négatives (pas de stock source) */
                    supplier_ref: locations || "—",
                    hs_code: typeof p.hs_code === "string" && p.hs_code ? p.hs_code : "N/A",
                    brand: brandVal,
                    color: colorVal,
                    odoo_create_date: typeof p.create_date === "string" ? p.create_date : null,
                    sold_locations: [...soldLocs],
                    theoretical_qty: totalQty,
                    counted_qty: 0,
                    unit_cost: resolveUnitCost(p),
                    pos_category_ids: categIds,
                    pos_category_names: categNames,
                });
            }
        });

        const snapshotItems = Array.from(barcodeMap.values());

        if (skippedNoLocation > 0) {
            console.warn(
                `[CREATE_AUDIT] ${skippedNoLocation} produit(s) ignoré(s) — aucune location valide.`
            );
        }

        /* ─── Appel RPC transactionnel (audit + items en 1 TX) ─── */
        const { data: auditId, error: rpcError } = await supabase.rpc("create_audit_session", {
            p_reference: reference,
            p_shop_id: cleanShopIds[0],
            p_shop_name: shopNames,
            p_department: departmentLabel,
            p_notes: notesFinal || "",
            p_created_by: userId || "",
            p_audit_date: auditDateStr,
            p_items: snapshotItems as unknown as Json,
        });

        if (rpcError) throw new Error(rpcError.message);

        revalidatePath("/inventory/audits");
        return { success: true, auditId, reference };

    } catch (err: unknown) {
        console.error("[CREATE_AUDIT_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Erreur de création d'audit.",
        };
    }
}

/* ════════════════════════════════════════════════════════════════════ */
/* 2. SYNCHRONISATION DES MÉTADONNÉES + EMPLACEMENTS NÉGATIFS           */
/*    - Ne recalcule PAS theoretical_qty ni counted_qty                 */
/*    - Ne touche PAS aux scans déjà effectués                         */
/*    - Ne touche PAS à supplier_ref (immuable après création)         */
/*    - Batch via RPC SQL atomique (update par id, valeurs par item)   */
/* ════════════════════════════════════════════════════════════════════ */

export async function syncAuditStockSnapshotAction(auditId: string) {
    try {
        const supabase = await createClient();

        /* ─── 1. Vérifications préalables ─── */
        const { data: audit, error: fetchAuditError } = await supabase
            .from("stock_audits")
            .select("id, shop_id, audit_date, status")
            .eq("id", auditId)
            .single();

        if (fetchAuditError || !audit) {
            throw new Error("Audit introuvable.");
        }

        if (audit.status === "validated" || audit.status === "completed") {
            return {
                success: false,
                error: "Un audit clôturé et verrouillé ne peut plus être synchronisé.",
            };
        }

        /* ─── 2. Récupération des items actuels du snapshot ─── */
        const { data: existingItems, error: fetchItemsError } = await supabase
            .from("stock_audit_items")
            .select("id, odoo_product_id, theoretical_qty")
            .eq("audit_id", auditId);

        if (fetchItemsError) {
            console.error("[SYNC_FETCH_ITEMS_ERROR]", fetchItemsError);
            throw new Error("Impossible de lire le snapshot d'items.");
        }

        if (!existingItems || existingItems.length === 0) {
            return {
                success: true,
                message: "Aucun article dans le snapshot — rien à synchroniser.",
            };
        }

        /* ─── 3. Récupération des quants négatifs (toutes compagnies) ─── */
        const negativeQuants = await odooClient.searchRead<OdooQuant>("stock.quant", {
            domain: [
                ["location_id.usage", "=", "internal"],
                ["quantity", "<", 0],
            ],
            fields: ["product_id", "location_id", "quantity"],
            limit: 25000,
        });

        const soldLocationsMap = new Map<number, SoldLocation[]>();

        /* ═══════════════════════════════════════════════════════════════
           VALIDATION STRICTE — Même règle que createAuditSessionAction.
           Un quant négatif sans location valide est un BUG Odoo → ignoré.
           ═══════════════════════════════════════════════════════════════ */
        (negativeQuants || []).forEach((q) => {
            const pid = Array.isArray(q.product_id) ? q.product_id[0] : null;
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : null;
            const locName = Array.isArray(q.location_id) ? q.location_id[1] : null;

            if (typeof pid !== "number" || pid <= 0) return;
            if (
                typeof locId !== "number" ||
                locId <= 0 ||
                typeof locName !== "string" ||
                !locName.trim()
            ) {
                console.warn(
                    `[SYNC] Quant négatif ignoré — location_id invalide (product ${pid}) :`,
                    JSON.stringify(q)
                );
                return;
            }

            if (!soldLocationsMap.has(pid)) soldLocationsMap.set(pid, []);
            const arr = soldLocationsMap.get(pid)!;
            if (!arr.some((l) => l.id === locId)) {
                arr.push({ id: locId, name: locName.trim() });
            }
        });

        /* ─── 4. Récupération des produits Odoo concernés ─── */
        const productIds = Array.from(
            new Set(existingItems.map((i) => i.odoo_product_id))
        );

        const products = await odooClient.searchRead<OdooProduct>("product.product", {
            domain: [["id", "in", productIds]],
            fields: [
                "id", "name", "barcode", "default_code", "hs_code",
                "standard_price", "create_date", "list_price",
                "x_studio_many2one_field_21bvh",
                "x_studio_many2one_field_Arl5D",
                "pos_categ_ids",
            ],
            limit: productIds.length,
        });

        const productInfoMap = new Map<number, OdooProduct>();
        (products || []).forEach((p) => productInfoMap.set(p.id, p));

        /* ─── 5. Résolution POS categories (1 seul appel Odoo) ─── */
        const allCategIds = new Set<number>();
        (products || []).forEach((p) => {
            if (Array.isArray(p.pos_categ_ids)) {
                p.pos_categ_ids.forEach((id) => {
                    if (Number.isInteger(id)) allCategIds.add(id);
                });
            }
        });
        const categNameMap = await resolvePosCategoryNames(Array.from(allCategIds));

        /* ─── 5bis. Résolution des emplacements positifs pour les HORS PÉRIMÈTRE ─── */
        const unexpectedProductIds = existingItems
            .filter((i) => (i.theoretical_qty ?? 0) === 0)
            .map((i) => i.odoo_product_id);

        let foundLocationsByProduct = new Map<number, FoundLocation[]>();

        if (unexpectedProductIds.length > 0) {
            try {
                foundLocationsByProduct = await resolvePositiveLocationsForProducts(
                    unexpectedProductIds
                );
            } catch (err) {
                console.error("[SYNC_FOUND_LOCATIONS_ERROR]", err);
                /* On continue sans bloquer le sync — found_locations restera vide */
            }
        }

        /* ─── 6. Construction du patch (types métier propres) ─── */
        const updates: SyncItemPatch[] = existingItems.map((item) => {
            const pid = item.odoo_product_id;
            const prodInfo = productInfoMap.get(pid);
            const soldLocs = soldLocationsMap.get(pid) ?? [];

            const brandVal = extractOdooMany2oneName(
                prodInfo?.x_studio_many2one_field_21bvh,
                "N/A"
            );
            const colorVal = extractOdooMany2oneName(
                prodInfo?.x_studio_many2one_field_Arl5D,
                "N/A"
            );

            const categIds = Array.isArray(prodInfo?.pos_categ_ids)
                ? prodInfo!.pos_categ_ids!.filter((id): id is number => Number.isInteger(id))
                : [];
            const categNames = categIds.map((id) => categNameMap.get(id) ?? `#${id}`);

            return {
                id: item.id,
                sold_locations: soldLocs,
                found_locations: foundLocationsByProduct.get(pid) ?? [],
                hs_code:
                    typeof prodInfo?.hs_code === "string" && prodInfo.hs_code
                        ? prodInfo.hs_code
                        : "N/A",
                brand: brandVal,
                color: colorVal,
                odoo_create_date:
                    typeof prodInfo?.create_date === "string"
                        ? prodInfo.create_date
                        : null,
                unit_cost: prodInfo ? resolveUnitCost(prodInfo) : 0,
                pos_category_ids: categIds,
                pos_category_names: categNames,
            };
        });

        /* ─── 7. Envoi batché via RPC SQL (chaque item garde ses valeurs) ─── */
        const batchSize = 500;
        let syncedCount = 0;

        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);

            const { data: affected, error: rpcError } = await supabase.rpc(
                "sync_audit_items_batch",
                { p_items: batch as unknown as Json }
            );

            if (rpcError) {
                console.error("[SYNC_RPC_ERROR]", rpcError);
                // On continue avec les batches suivants (résilience partielle)
                continue;
            }

            syncedCount += typeof affected === "number" ? affected : batch.length;
        }

        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            message: `${syncedCount} article(s) resynchronisé(s) depuis Odoo.`,
            syncedCount,
        };

    } catch (err: unknown) {
        console.error("[SYNC_SNAPSHOT_ERROR]", err);
        return {
            success: false,
            error:
                err instanceof Error
                    ? err.message
                    : "Échec de la resynchronisation.",
        };
    }
}

/* ════════════════════════════════════════════════════════════════════ */
/* 3. SCAN UNITAIRE — check statut, delta atomique, POS categories      */
/* ════════════════════════════════════════════════════════════════════ */
export async function recordBarcodeScanAction(auditId: string, barcode: string) {
    try {
        const supabase = await createClient();
        const cleanBarcode = barcode.trim().toUpperCase();

        if (!cleanBarcode) {
            return { success: false, error: "Code-barres vide fourni." };
        }

        /* ─── 1. Vérification statut de l'audit (fix B3) ─── */
        const { data: audit, error: auditErr } = await supabase
            .from("stock_audits")
            .select("id, status")
            .eq("id", auditId)
            .single();

        if (auditErr || !audit) {
            return { success: false, error: "Audit introuvable." };
        }
        if (audit.status === "validated" || audit.status === "completed") {
            return {
                success: false,
                error: "Cet audit est verrouillé, aucun scan supplémentaire n'est autorisé.",
            };
        }

        /* ─── 2. Recherche de l'item dans le snapshot ─── */
        const { data: existingItem, error: fetchError } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId)
            .eq("internal_barcode", cleanBarcode)
            .maybeSingle();

        if (fetchError) {
            console.error("[FETCH_ITEM_ERROR]", fetchError);
        }

        /* ─── CAS A : produit déjà dans le snapshot ─── */
        if (existingItem) {
            if ((existingItem.counted_qty ?? 0) === 1) {
                return {
                    success: false,
                    isDuplicate: true,
                    error: `⚠️ ALERTE : Le code-barres (${cleanBarcode}) a DÉJÀ été scanné !`,
                };
            }

            const { data: updatedItem, error: updateError } = await supabase
                .from("stock_audit_items")
                .update({
                    counted_qty: 1,
                    scanned_at: new Date().toISOString(),
                })
                .eq("id", existingItem.id)
                .select()
                .single();

            if (updateError) throw new Error(updateError.message);

            /* Delta atomique (fix B4) — 1 item scanné, +1 sur l'écart */
            const cost = Number(existingItem.unit_cost) || 0;
            await incrementAuditTotalsAtomic(supabase, auditId, {
                scanned: 1,
                qty: 1,
                value: cost,
            });

            revalidatePath(`/inventory/audits/${auditId}`);
            return { success: true, item: updatedItem, isUnexpected: false };
        }

        /* ─── CAS B : produit hors périmètre → lookup Odoo ─── */
        const odooProducts = await odooClient.searchRead<OdooProduct>("product.product", {
            domain: [
                ["active", "=", true],
                "|",
                ["barcode", "=", cleanBarcode],
                ["default_code", "=", cleanBarcode],
            ],
            fields: [
                "id", "name", "barcode", "default_code", "hs_code",
                "standard_price", "list_price",
                "create_date", "x_studio_segment",
                "x_studio_many2one_field_21bvh",
                "x_studio_many2one_field_Arl5D",
                "pos_categ_ids",
            ],
            limit: 1,
        });

        if (!odooProducts || odooProducts.length === 0) {
            return {
                success: false,
                isUnknown: true,
                error: `⛔ ERREUR : Le code-barres '${cleanBarcode}' est inconnu dans tout le catalogue Odoo.`,
            };
        }

        const odooProd = odooProducts[0];
        const brandVal = extractOdooMany2oneName(odooProd.x_studio_many2one_field_21bvh, "N/A");
        const colorVal = extractOdooMany2oneName(odooProd.x_studio_many2one_field_Arl5D, "N/A");

        /* Résolution POS categories (1 appel Odoo) */
        const categIds = Array.isArray(odooProd.pos_categ_ids)
            ? odooProd.pos_categ_ids.filter((id): id is number => Number.isInteger(id))
            : [];
        const categNameMap = await resolvePosCategoryNames(categIds);
        const categNames = categIds.map((id) => categNameMap.get(id) ?? `#${id}`);

        const foundLocationsMap = await resolvePositiveLocationsForProducts([odooProd.id]);
        const foundLocations: FoundLocation[] = foundLocationsMap.get(odooProd.id) ?? [];

        const insertPayload: StockAuditItemInsert = {
            audit_id: auditId,
            odoo_product_id: odooProd.id,
            product_name: odooProd.name,
            internal_barcode: cleanBarcode,
            supplier_ref: "Hors Périmètre Odoo / Inattendu",
            hs_code:
                typeof odooProd.hs_code === "string" && odooProd.hs_code
                    ? odooProd.hs_code
                    : "Inattendu",
            brand: brandVal,
            color: colorVal,
            odoo_create_date:
                typeof odooProd.create_date === "string" ? odooProd.create_date : null,
            sold_locations: toJson([]),
            found_locations: toJson(foundLocations),
            theoretical_qty: 0,
            counted_qty: 1,
            unit_cost: resolveUnitCost(odooProd),
            pos_category_ids: categIds,
            pos_category_names: categNames,
            scanned_at: new Date().toISOString(),
        };

        const { data: newItem, error: insertError } = await supabase
            .from("stock_audit_items")
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        await incrementAuditTotalsAtomic(supabase, auditId, {
            scanned: 1,
            qty: 1,
            value: resolveUnitCost(odooProd),
        });

        revalidatePath(`/inventory/audits/${auditId}`);
        return {
            success: true,
            item: newItem,
            isUnexpected: true,
            message: `⚠️ Produit hors périmètre Odoo détecté (${odooProd.name}). Ajouté à l'inventaire (+1).`,
        };

    } catch (err: unknown) {
        console.error("[RECORD_SCAN_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Erreur lors du scan.",
        };
    }
}

/* ════════════════════════════════════════════════════════════════════ */
/* 4. IMPORT EXCEL — compteurs corrigés (B6) + POS categories           */
/* ════════════════════════════════════════════════════════════════════ */
export async function importExcelBarcodesAction(auditId: string, barcodes: string[]) {
    try {
        const supabase = await createClient();

        /* ─── 1. Nettoyage des entrées ─── */
        const cleanBarcodes = Array.from(
            new Set(barcodes.map((b) => b.trim().toUpperCase()).filter(Boolean))
        );

        if (cleanBarcodes.length === 0) {
            return { success: false, error: "Aucun code-barres valide fourni." };
        }

        /* ─── 2. Vérification statut audit ─── */
        const { data: audit } = await supabase
            .from("stock_audits")
            .select("id, status")
            .eq("id", auditId)
            .single();

        if (!audit) return { success: false, error: "Audit introuvable." };
        if (audit.status === "validated" || audit.status === "completed") {
            return { success: false, error: "Cet audit est verrouillé." };
        }

        /* ─── 3. Chargement des items existants ─── */
        const { data: existingItems } = await supabase
            .from("stock_audit_items")
            .select("internal_barcode, counted_qty, unit_cost")
            .eq("audit_id", auditId);

        const existingItemMap = new Map<
            string,
            { counted: number; cost: number }
        >();
        (existingItems || []).forEach((i) => {
            existingItemMap.set(i.internal_barcode.toUpperCase(), {
                counted: i.counted_qty ?? 0,
                cost: Number(i.unit_cost) || 0,
            });
        });

        /* ─── 4. Classification ─── */
        const toScanBarcodes: string[] = [];
        const alreadyScannedBarcodes: string[] = [];
        const missingBarcodes: string[] = [];
        const handledSet = new Set<string>();   // ← fix B6

        cleanBarcodes.forEach((code) => {
            const existing = existingItemMap.get(code);
            if (existing) {
                if (existing.counted === 1) {
                    alreadyScannedBarcodes.push(code);
                } else {
                    toScanBarcodes.push(code);
                }
                handledSet.add(code);
            } else {
                missingBarcodes.push(code);
            }
        });

        /* ─── 5. Accumulateurs pour un seul delta atomique en fin ─── */
        let newlyScannedCount = 0;
        let unexpectedCount = 0;
        let deltaScanned = 0;
        let deltaQty = 0;
        let deltaValue = 0;

        /* ─── 6. Update batché des items existants non scannés ─── */
        if (toScanBarcodes.length > 0) {
            const batchSize = 1000;
            const now = new Date().toISOString();

            for (let i = 0; i < toScanBarcodes.length; i += batchSize) {
                const batch = toScanBarcodes.slice(i, i + batchSize);

                const { data: updatedRows, error: updateError } = await supabase
                    .from("stock_audit_items")
                    .update({ counted_qty: 1, scanned_at: now })
                    .eq("audit_id", auditId)
                    .in("internal_barcode", batch)
                    .select("internal_barcode");

                if (updateError) {
                    console.error("[IMPORT_EXCEL_BATCH_ERROR]", updateError);
                    continue;
                }

                (updatedRows || []).forEach((r) => {
                    const info = existingItemMap.get(r.internal_barcode.toUpperCase());
                    newlyScannedCount++;
                    deltaScanned += 1;
                    deltaQty += 1;
                    deltaValue += info?.cost ?? 0;
                });
            }
        }

        /* ─── 7. Traitement des barcodes absents → lookup Odoo ─── */
        if (missingBarcodes.length > 0) {
            const odooBatchSize = 500;

            for (let i = 0; i < missingBarcodes.length; i += odooBatchSize) {
                const batchMissing = missingBarcodes.slice(i, i + odooBatchSize);

                const odooProducts = await odooClient.searchRead<OdooProduct>(
                    "product.product",
                    {
                        domain: [
                            ["active", "=", true],
                            "|",
                            ["barcode", "in", batchMissing],
                            ["default_code", "in", batchMissing],
                        ],
                        fields: [
                            "id", "name", "barcode", "default_code", "hs_code",
                            "standard_price", "list_price", "create_date", "x_studio_segment",
                            "x_studio_many2one_field_21bvh",
                            "x_studio_many2one_field_Arl5D",
                            "pos_categ_ids",
                        ],
                        limit: batchMissing.length,
                    }
                );

                if (!odooProducts || odooProducts.length === 0) continue;

                /* Résolution POS categories en 1 appel pour le batch */
                const allCategIds = new Set<number>();
                const batchProductIds = odooProducts.map((p) => p.id);
                const foundLocationsMap = await resolvePositiveLocationsForProducts(batchProductIds);
                odooProducts.forEach((p) => {
                    if (Array.isArray(p.pos_categ_ids)) {
                        p.pos_categ_ids.forEach((id) => {
                            if (Number.isInteger(id)) allCategIds.add(id);
                        });
                    }
                });
                const categNameMap = await resolvePosCategoryNames(Array.from(allCategIds));

                const itemsToInsert: StockAuditItemInsert[] = [];
                const insertedOdooBarcodes = new Set<string>();
                const now = new Date().toISOString();

                odooProducts.forEach((p) => {
                    const rawCode = (p.barcode || p.default_code || "") as string;
                    const code = rawCode.trim().toUpperCase();
                    if (!code || insertedOdooBarcodes.has(code)) return;
                    insertedOdooBarcodes.add(code);

                    const brandVal = extractOdooMany2oneName(
                        p.x_studio_many2one_field_21bvh,
                        "N/A"
                    );
                    const colorVal = extractOdooMany2oneName(
                        p.x_studio_many2one_field_Arl5D,
                        "N/A"
                    );

                    const categIds = Array.isArray(p.pos_categ_ids)
                        ? p.pos_categ_ids.filter((id): id is number => Number.isInteger(id))
                        : [];
                    const categNames = categIds.map((id) => categNameMap.get(id) ?? `#${id}`);

                    itemsToInsert.push({
                        audit_id: auditId,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode: code,
                        supplier_ref: "Hors Périmètre (Import Excel)",
                        hs_code:
                            typeof p.hs_code === "string" && p.hs_code
                                ? p.hs_code
                                : "Inattendu",
                        brand: brandVal,
                        color: colorVal,
                        odoo_create_date:
                            typeof p.create_date === "string" ? p.create_date : null,
                        sold_locations: toJson([]),
                        found_locations: toJson(foundLocationsMap.get(p.id) ?? []),                // ← cast unique
                        theoretical_qty: 0,
                        counted_qty: 1,
                        unit_cost: resolveUnitCost(p),
                        pos_category_ids: categIds,
                        pos_category_names: categNames,
                        scanned_at: now,
                    });

                    handledSet.add(code);
                });

                if (itemsToInsert.length > 0) {
                    const { data: inserted, error: insertError } = await supabase
                        .from("stock_audit_items")
                        .insert(itemsToInsert)
                        .select("id, internal_barcode, unit_cost");

                    if (insertError) {
                        console.error("[IMPORT_EXCEL_UNEXPECTED_INSERT_ERROR]", insertError);
                    } else if (inserted) {
                        unexpectedCount += inserted.length;
                        inserted.forEach((r) => {
                            deltaScanned += 1;
                            deltaQty += 1;
                            deltaValue += Number(r.unit_cost) || 0;
                        });
                    }
                }
            }
        }

        /* ─── 8. Compteur d'inconnus robuste (fix B6) ─── */
        const unknownCount = cleanBarcodes.filter((c) => !handledSet.has(c)).length;

        /* ─── 9. Un seul delta atomique en fin de traitement ─── */
        await incrementAuditTotalsAtomic(supabase, auditId, {
            scanned: deltaScanned,
            qty: deltaQty,
            value: deltaValue,
        });

        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            newlyScannedCount,
            alreadyScannedCount: alreadyScannedBarcodes.length,
            unexpectedCount,
            unknownCount,
        };

    } catch (err: unknown) {
        console.error("[IMPORT_EXCEL_ERROR]", err);
        return {
            success: false,
            error:
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'importation Excel.",
        };
    }
}

/* ════════════════════════════════════════════════════════════════════ */
/* 5. SUPPRESSION — inchangé (fonctionnait déjà bien)                   */
/* ════════════════════════════════════════════════════════════════════ */
export async function deleteAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();

        const { data: audit } = await supabase
            .from("stock_audits")
            .select("status")
            .eq("id", auditId)
            .single();

        if (audit?.status === "validated") {
            return { success: false, error: "Un audit validé et verrouillé ne peut pas être supprimé." };
        }

        const { error: deleteItemsError } = await supabase
            .from("stock_audit_items")
            .delete()
            .eq("audit_id", auditId);

        if (deleteItemsError) {
            console.error("[DELETE_AUDIT_ITEMS_ERROR]", deleteItemsError);
            throw new Error("Impossible de supprimer le snapshot d'articles d'audit.");
        }

        const { error: deleteAuditError } = await supabase
            .from("stock_audits")
            .delete()
            .eq("id", auditId);

        if (deleteAuditError) throw new Error(deleteAuditError.message);

        revalidatePath("/inventory/audits");
        return { success: true };

    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Erreur lors de la suppression de l'audit.",
        };
    }
}

/* ════════════════════════════════════════════════════════════════════ */
/* 6. VALIDATION — full recalc (sanity-check)                           */
/* ════════════════════════════════════════════════════════════════════ */
export async function validateAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        /* Full recalc pour garantir la cohérence avant verrouillage */
        await recalcAuditTotalsFull(supabase, auditId);

        const { error } = await supabase
            .from("stock_audits")
            .update({
                status: "validated",
                validated_by: user?.id || null,
                validated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", auditId);

        if (error) throw new Error(error.message);

        revalidatePath("/inventory/audits");
        revalidatePath(`/inventory/audits/${auditId}`);
        return { success: true };
    } catch (err: unknown) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Échec de la validation.",
        };
    }
}

/* ════════════════════════════════════════════════════════════════════ */
/* 7. LISTE — sécurisée par shop_ids                                    */
/* ════════════════════════════════════════════════════════════════════ */
export async function getAuditsAction(filters?: AuditFilters): Promise<StockAudit[]> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, assigned_shops, shop_access_type")
        .eq("id", user.id)
        .single();

    const isAdmin = profile?.role === "admin" || profile?.shop_access_type === "all";
    const allowedShops = extractAllowedShopIds(profile?.assigned_shops);

    let query = supabase
        .from("stock_audits")
        .select("*")
        .order("created_at", { ascending: false });

    if (!isAdmin) {
        if (allowedShops.length === 0) return [];
        query = query.in("shop_id", allowedShops);
    } else if (filters?.allowedShopIds && filters.allowedShopIds.length > 0) {
        query = query.in("shop_id", filters.allowedShopIds);
    }

    if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    if (filters?.searchQuery && filters.searchQuery.trim() !== "") {
        const safe = filters.searchQuery.replace(/[%,()]/g, "").trim();
        if (safe) {
            query = query.or(`reference.ilike.%${safe}%,shop_name.ilike.%${safe}%`);
        }
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erreur lors de la récupération des audits:", error.message);
        return [];
    }

    return (data as StockAudit[]) || [];
}

export async function getAllAuditsAction() {
    return getAuditsAction();
}