'use server';

import { createClient } from "@/lib/supabase/server";
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";

/**
 * 1. CRÉATION D'AUDIT + PRISE DE PHOTO INSTANTANÉE (SNAPSHOT IMMUABLE)
 */
export async function createAuditSessionAction(
    shopId: string,
    department: string = "Tous",
    notes?: string
) {
    try {
        const supabase = await createClient();
        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id || null;

        // Récupérer la boutique et son odoo_company_id
        const { data: shop, error: shopError } = await supabase
            .from("shops")
            .select("id, name, odoo_company_id")
            .eq("id", shopId)
            .single();

        if (shopError || !shop || !shop.odoo_company_id) {
            throw new Error("Boutique sélectionnée introuvable.");
        }

        // Référence unique
        const datePrefix = new Date().toISOString().slice(0, 7).replace("-", "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const reference = `AUD-${datePrefix}-${randomSuffix}`;

        // A. Création de l'entête de l'audit
        const { data: audit, error: insertError } = await supabase
            .from("stock_audits")
            .insert({
                reference,
                shop_id: shop.id,
                shop_name: shop.name,
                department,
                status: "in_progress",
                created_by: userId,
                notes,
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        // ✅ B. SNAPSHOT IMMUABLE : Lecture immédiate du stock Odoo à l'instant T
        const productDomain: any[] = [
            ["active", "=", true],
            ["available_in_pos", "=", true]
        ];
        if (department !== "Tous") {
            productDomain.push(["x_studio_segment", "ilike", department]);
        }

        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: productDomain,
            fields: ["id", "name", "barcode", "default_code", "hs_code", "standard_price"],
            limit: 10000
        });

        if (products && products.length > 0) {
            const productIds = products.map((p: any) => p.id);

            // Quantités théoriques réelles Odoo pour CETTE COMPAGNIE à cet instant
            const quants = await odooJsonClient.searchRead<any>("stock.quant", {
                domain: [
                    ["product_id", "in", productIds],
                    ["company_id", "=", shop.odoo_company_id],
                    ["location_id.usage", "=", "internal"]
                ],
                fields: ["product_id", "quantity"]
            });

            const stockMap = new Map<number, number>();
            quants.forEach((q: any) => {
                const pid = q.product_id[0];
                stockMap.set(pid, (stockMap.get(pid) || 0) + (q.quantity || 0));
            });

            // Construction des lignes de snapshot congelées
            const snapshotItems = products
                .map((p: any) => {
                    const barcodeVal = p.barcode || p.default_code || "";
                    return {
                        audit_id: audit.id,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode: barcodeVal,
                        hs_code: p.hs_code || "",
                        theoretical_qty: Math.round(stockMap.get(p.id) || 0), // ✅ Figé pour toujours
                        counted_qty: 0,                                      // Démarre à 0 tant que non scanné
                        unit_cost: p.standard_price || 0,
                    };
                })
                .filter((item) => item.internal_barcode !== "");

            // Insertion en masse du snapshot congelé dans Supabase
            if (snapshotItems.length > 0) {
                await supabase.from("stock_audit_items").insert(snapshotItems);
            }
        }

        revalidatePath("/inventory/audits");
        return { success: true, auditId: audit.id, reference: audit.reference };
    } catch (err: any) {
        return { success: false, error: err.message || "Erreur de création d'audit." };
    }
}

/**
 * 2. REGISTRE LE SCAN : Met à jour la quantité comptée dans le snapshot congelé Supabase
 */
export async function recordBarcodeScanAction(auditId: string, barcode: string) {
    try {
        const supabase = await createClient();
        const cleanBarcode = barcode.trim().toUpperCase();

        // A. Rechercher l'article dans le SNAPSHOT CONGELÉ de cet audit dans Supabase
        const { data: existingItem, error: fetchError } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId)
            .eq("internal_barcode", cleanBarcode)
            .maybeSingle();

        if (fetchError || !existingItem) {
            return { success: false, error: `Le code-barres '${cleanBarcode}' n'appartient pas au périmètre de cet audit.` };
        }

        // ✅ CORRECTION : Utilisation de (existingItem.counted_qty ?? 0) pour gérer le cas 'null'
        const currentCount = existingItem.counted_qty ?? 0;

        if (currentCount > 0) {
            return { success: false, error: `Ce code-barres unitaire (${cleanBarcode}) a déjà été scanné !` };
        }

        // B. Mettre à jour la quantité comptée à 1 pour ce singleton
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

        // C. Mettre à jour les totaux de l'audit
        const { data: allItems } = await supabase
            .from("stock_audit_items")
            .select("counted_qty, theoretical_qty, unit_cost")
            .eq("audit_id", auditId);

        if (allItems) {
            const totalScanned = allItems.filter(i => (i.counted_qty ?? 0) > 0).length;
            let totalDiffQty = 0;
            let totalDiffVal = 0;

            allItems.forEach((i) => {
                const counted = i.counted_qty ?? 0;
                const theoretical = i.theoretical_qty ?? 0;
                const cost = Number(i.unit_cost) || 0;

                const diff = counted - theoretical;
                totalDiffQty += diff;
                totalDiffVal += diff * cost;
            });

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

        revalidatePath(`/inventory/audits/${auditId}`);
        return { success: true, item: updatedItem };
    } catch (err: any) {
        return { success: false, error: err.message || "Erreur d'enregistrement du scan." };
    }
}

/**
 * 3. Valide et verrouille définitivement une session d'audit
 */
export async function validateAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();
        const user = await supabase.auth.getUser();

        const { error } = await supabase
            .from("stock_audits")
            .update({
                status: "validated",
                validated_by: user.data.user?.id || null,
                validated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", auditId);

        if (error) throw new Error(error.message);

        revalidatePath("/inventory/audits");
        revalidatePath(`/inventory/audits/${auditId}`);
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "Échec de la validation." };
    }
}

/**
 * 4. Liste de tous les audits
 */
export async function getAllAuditsAction() {
    const supabase = await createClient();
    const { data: audits } = await supabase
        .from("stock_audits")
        .select("*, shops(id, name, odoo_company_id)")
        .order("created_at", { ascending: false });

    return audits || [];
}

/**
 * 6. Supprime une session d'audit (Suppression en cascade Supabase)
 */
export async function deleteAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();

        const { error } = await supabase
            .from("stock_audits")
            .delete()
            .eq("id", auditId);

        if (error) throw new Error(error.message);

        revalidatePath("/inventory/audits");
        return { success: true };
    } catch (err: any) {
        console.error("[AUDIT_DELETE_ERROR] Erreur de suppression:", err);
        return { success: false, error: err.message || "Erreur lors de la suppression de l'audit." };
    }
}