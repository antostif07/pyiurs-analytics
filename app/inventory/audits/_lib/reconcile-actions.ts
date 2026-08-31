'use server';

import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";

export interface ReconcileItemDiagnostic {
    id: string; // ID stock_audit_items
    odoo_product_id: number;
    product_name: string;
    internal_barcode: string;
    supplier_ref: string;
    unit_cost: number;
    current_store_qty: number;
    other_locations_stock: Array<{
        location_id: number;
        location_name: string;
        quantity: number;
    }>;
    diagnostic_tag: 'MISSING_LOCAL' | 'POSSIBLE_TRANSFER_ERROR' | 'SOLD_IN_OTHER_STORE' | 'CONFIRMED_LOSS';
    diagnostic_message: string;
}

/**
 * 1. EXTRACTION & DIAGNOSTIC CROISÉ ODOO MULTI-EMPLACEMENTS
 */
export async function getUnscannedItemsDiagnosticAction(auditId: string): Promise<{
    success: boolean;
    data?: ReconcileItemDiagnostic[];
    error?: string;
}> {
    try {
        const supabase = await createClient();

        // 1. Récupération des articles non scannés de cette session (counted_qty = 0)
        const { data: unscannedItems, error: fetchError } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId)
            .eq("counted_qty", 0);

        if (fetchError || !unscannedItems || unscannedItems.length === 0) {
            return { success: true, data: [] };
        }

        const odooProductIds = [...new Set(unscannedItems.map((i) => i.odoo_product_id))];

        // 2. Interrogation d'Odoo sur TOUS les emplacements internes de la société
        const batchSize = 250;
        let allOdooQuants: any[] = [];

        for (let i = 0; i < odooProductIds.length; i += batchSize) {
            const batchIds = odooProductIds.slice(i, i + batchSize);
            const quants = await odooClient.searchRead<any>("stock.quant", {
                domain: [
                    ["product_id", "in", batchIds],
                    ["location_id.usage", "=", "internal"],
                    ["quantity", "!=", 0],
                ],
                fields: ["product_id", "location_id", "quantity"],
                limit: 10000,
            });
            if (quants) allOdooQuants = allOdooQuants.concat(quants);
        }

        // Indexation Odoo par product_id
        const quantMap = new Map<number, Array<{ location_id: number; location_name: string; quantity: number }>>();

        allOdooQuants.forEach((q) => {
            const pid = Array.isArray(q.product_id) ? q.product_id[0] : q.product_id;
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : q.location_id;
            const locName = Array.isArray(q.location_id) ? q.location_id[1] : "Autre Emplacement";
            const qty = Math.round(q.quantity || 0);

            if (!quantMap.has(pid)) quantMap.set(pid, []);
            quantMap.get(pid)!.push({ location_id: locId, location_name: locName, quantity: qty });
        });

        // 3. Construction des diagnostics métier
        const diagnostics: ReconcileItemDiagnostic[] = unscannedItems.map((item) => {
            const locs = quantMap.get(item.odoo_product_id) || [];
            const currentLocName = item.supplier_ref || "";

            const otherLocs = locs.filter((l) => !l.location_name.includes(currentLocName));

            let tag: ReconcileItemDiagnostic['diagnostic_tag'] = 'CONFIRMED_LOSS';
            let message = "Article introuvable uniquement dans cette boutique (Ajustement à 0 recommandé).";

            const negativeLoc = otherLocs.find((l) => l.quantity < 0);
            const positiveOtherLoc = otherLocs.find((l) => l.quantity > 0);

            if (negativeLoc) {
                tag = 'SOLD_IN_OTHER_STORE';
                message = `⚠️ Suspect : Vendu en stock négatif (${negativeLoc.quantity}) dans : ${negativeLoc.location_name}`;
            } else if (positiveOtherLoc) {
                tag = 'POSSIBLE_TRANSFER_ERROR';
                message = `🚚 Possible transfert/transit : ${positiveOtherLoc.quantity} unité(s) trouvée(s) dans : ${positiveOtherLoc.location_name}`;
            }

            return {
                id: item.id,
                odoo_product_id: item.odoo_product_id,
                product_name: item.product_name,
                internal_barcode: item.internal_barcode,
                supplier_ref: item.supplier_ref || "Stock Principal",
                unit_cost: Number(item.unit_cost) || 0,
                current_store_qty: item.theoretical_qty || 0,
                other_locations_stock: otherLocs,
                diagnostic_tag: tag,
                diagnostic_message: message,
            };
        });

        return { success: true, data: diagnostics };
    } catch (err: any) {
        console.error("[GET_UNSCANNED_DIAGNOSTIC_ERROR]", err);
        return { success: false, error: err.message || "Erreur lors de l'analyse Odoo." };
    }
}

/**
 * 2. ACTION : DÉCLARER UN ARTICLE RETROUVÉ MANUELLEMENT (SANS ÉTIQUETTE) -> counted_qty = 1
 */
export async function forceMarkItemAsFoundAction(auditId: string, itemId: string, justificationNote: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("stock_audit_items")
            .update({
                counted_qty: 1,
                scanned_at: new Date().toISOString(),
                supplier_ref: `Réconcilié sans étiquette : ${justificationNote}`,
            })
            .eq("id", itemId)
            .eq("audit_id", auditId);

        if (error) throw new Error(error.message);

        // Recalcul des totaux d'audit
        const { data: allItems } = await supabase
            .from("stock_audit_items")
            .select("counted_qty, theoretical_qty, unit_cost")
            .eq("audit_id", auditId);

        if (allItems) {
            let scanned = 0;
            let diffQty = 0;
            let diffVal = 0;
            allItems.forEach((i) => {
                const c = i.counted_qty ?? 0;
                const t = i.theoretical_qty ?? 0;
                const cost = Number(i.unit_cost) || 0;
                if (c === 1) scanned++;
                const d = c - t;
                diffQty += d;
                diffVal += d * cost;
            });

            await supabase
                .from("stock_audits")
                .update({
                    total_items_scanned: scanned,
                    total_discrepancy_qty: diffQty,
                    total_discrepancy_value: diffVal,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", auditId);
        }

        revalidatePath(`/inventory/audits/${auditId}`);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "Impossible de mettre à jour l'article." };
    }
}

/**
 * 3. AJUSTEMENT DIRECT AUTOMATIQUE DANS ODOO VIA JSON-RPC
 * Met les stocks Odoo à 0 pour tous les articles non scannés de la boutique
 */
export async function applyOdooZeroStockAdjustmentAction(auditId: string) {
    try {
        const supabase = await createClient();

        // Récupération de la boutique et des articles non scannés
        const { data: audit } = await supabase
            .from("stock_audits")
            .select("shop_id, shop_name")
            .eq("id", auditId)
            .single();

        if (!audit) throw new Error("Audit introuvable.");

        const { data: shop } = await supabase
            .from("shops")
            .select("odoo_company_id")
            .eq("id", audit.shop_id)
            .single();

        const { data: remainingItems } = await supabase
            .from("stock_audit_items")
            .select("odoo_product_id, internal_barcode")
            .eq("audit_id", auditId)
            .eq("counted_qty", 0);

        if (!remainingItems || remainingItems.length === 0) {
            return { success: true, adjustedCount: 0, message: "Aucun article à ajuster à 0 dans Odoo." };
        }

        const productIds = remainingItems.map((i) => i.odoo_product_id);

        // 1. Recherche des quants Odoo correspondants dans la boutique
        const quants = await odooClient.searchRead<any>("stock.quant", {
            domain: [
                ["product_id", "in", productIds],
                ["company_id", "=", shop?.odoo_company_id],
                ["location_id.usage", "=", "internal"],
                ["quantity", ">", 0],
            ],
            fields: ["id", "product_id", "quantity"],
        });

        if (!quants || quants.length === 0) {
            return { success: true, adjustedCount: 0, message: "Aucun quant Odoo actif à corriger." };
        }

        const quantIds = quants.map((q) => q.id);

        // 2. Mise à jour de inventory_quantity à 0 dans Odoo
        await odooClient.write("stock.quant", quantIds, {
            inventory_quantity: 0,
            inventory_quantity_set: true,
        });

        return {
            success: true,
            adjustedCount: quantIds.length,
            message: `Ajustement Odoo réussi : ${quantIds.length} quants passés à 0 en BDD Odoo.`,
        };
    } catch (err: any) {
        console.error("[ODOO_STOCK_ADJUSTMENT_ERROR]", err);
        return { success: false, error: err.message || "Erreur lors de l'ajustement direct Odoo." };
    }
}