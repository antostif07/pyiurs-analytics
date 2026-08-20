'use server';

import { createClient } from "@/lib/supabase/server";
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 1. CRÉATION D'AUDIT + SNAPSHOT IMMUABLE (Supporte la Date Rétrospective)
 */
export async function createAuditSessionAction(
    shopIds: string[],       // Tableau de boutiques sélectionnées
    departments: string[],   // Tableau de segments (ex: ["Femme", "Beauty"])
    notes?: string,
    auditDate?: string
) {
    try {
        const supabase = await createClient();
        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id || null;

        if (!shopIds || shopIds.length === 0) {
            return { success: false, error: "Veuillez sélectionner au moins une boutique." };
        }

        // Récupérer les boutiques et leurs ID Odoo
        const { data: shops, error: shopError } = await supabase
            .from("shops")
            .select("id, name, odoo_company_id")
            .in("id", shopIds);

        if (shopError || !shops || shops.length === 0) {
            return { success: false, error: "Boutiques introuvables." };
        }

        const shopNames = shops.map((s) => s.name).join(", ");
        const companyIds = shops.map((s) => s.odoo_company_id).filter(Boolean);
        const departmentLabel = departments.length > 0 ? departments.join(", ") : "Tous";

        // Déterminer la date
        const selectedDate = auditDate ? new Date(auditDate) : new Date();
        const todayStr = new Date().toISOString().split("T")[0];
        const isHistorical = auditDate && auditDate !== todayStr;

        // Référence unique
        const datePrefix = selectedDate.toISOString().slice(0, 7).replace("-", "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const reference = `AUD-${datePrefix}-${randomSuffix}`;

        // Entête de l'audit
        const { data: audit, error: insertError } = await supabase
            .from("stock_audits")
            .insert({
                reference,
                shop_id: shopIds[0], // ID principal
                shop_name: shopNames, // Multi-boutiques enregistrées
                department: departmentLabel,
                status: "in_progress",
                created_by: userId,
                created_at: selectedDate.toISOString(),
                notes: notes ? (isHistorical ? `[Historique du ${auditDate}] ${notes}` : notes) : (isHistorical ? `[Historique du ${auditDate}]` : null),
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        // Domaine Odoo pour filtrer les produits par segments
        const productDomain: any[] = [
            ["active", "=", true],
            ["available_in_pos", "=", true]
        ];

        if (departments.length > 0 && !departments.includes("Tous")) {
            const segmentDomain: any[] = ["|"];
            departments.forEach((dep, idx) => {
                if (idx > 1) segmentDomain.unshift("|");
                segmentDomain.push(["x_studio_segment", "ilike", dep]);
            });
            productDomain.push(...segmentDomain);
        }

        // Récupération des articles Odoo
        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: productDomain,
            fields: ["id", "name", "barcode", "default_code", "hs_code", "standard_price"],
            limit: 15000
        });

        if (products && products.length > 0) {
            const productIds = products.map((p: any) => p.id);
            const stockMap = new Map<number, number>();

            if (!isHistorical) {
                // Stock temps réel Odoo
                const quants = await odooJsonClient.searchRead<any>("stock.quant", {
                    domain: [
                        ["product_id", "in", productIds],
                        ["company_id", "in", companyIds],
                        ["location_id.usage", "=", "internal"]
                    ],
                    fields: ["product_id", "quantity"]
                });

                quants.forEach((q: any) => {
                    const pid = q.product_id[0];
                    stockMap.set(pid, (stockMap.get(pid) || 0) + (q.quantity || 0));
                });
            }

            // Génération des lignes unitaires dans Supabase (Theoretical_qty = 1 ou 0)
            const snapshotItems = products
                .map((p: any) => {
                    const barcodeVal = p.barcode || p.default_code || "";
                    const odooQty = Math.round(stockMap.get(p.id) || 0);
                    return {
                        audit_id: audit.id,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode: barcodeVal,
                        hs_code: p.hs_code || "",
                        theoretical_qty: odooQty > 0 ? 1 : 0, // Unitaire strict 1 ou 0
                        counted_qty: 0,                       // 0 par défaut
                        unit_cost: p.standard_price || 0,
                    };
                })
                .filter((item) => item.internal_barcode !== "");

            if (snapshotItems.length > 0) {
                // Insertion par paquets de 500 pour éviter d'atteindre les limites de payload Postgres
                const batchSize = 500;
                for (let i = 0; i < snapshotItems.length; i += batchSize) {
                    const batch = snapshotItems.slice(i, i + batchSize);
                    await supabase.from("stock_audit_items").insert(batch);
                }
            }
        }

        revalidatePath("/inventory/audits");
        return { success: true, auditId: audit.id, reference: audit.reference };
    } catch (err: any) {
        return { success: false, error: err.message || "Erreur de création d'audit." };
    }
}

/**
 * 4. Liste de tous les audits avec jointure boutique
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
 * 5. Supprime une session d'audit
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
        return { success: false, error: err.message || "Erreur lors de la suppression de l'audit." };
    }
}

/**
 * 2. REGISTRE LE SCAN STRICTEMENT UNITAIRE (0 ou 1)
 */
export async function recordBarcodeScanAction(auditId: string, barcode: string) {
    try {
        const supabase = await createClient();
        const cleanBarcode = barcode.trim().toUpperCase();

        const { data: existingItem, error: fetchError } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId)
            .eq("internal_barcode", cleanBarcode)
            .maybeSingle();

        if (fetchError || !existingItem) {
            return {
                success: false,
                error: `Code-barres '${cleanBarcode}' absent du périmètre d'audit.`
            };
        }

        // REGLE MÉTIER STRICTE : 0 ou 1
        if ((existingItem.counted_qty ?? 0) === 1) {
            return {
                success: false,
                isDuplicate: true,
                error: `⚠️ ALERTE : Le code-barres unitaire (${cleanBarcode}) a DÉJÀ été scanné !`
            };
        }

        // Passage de 0 à 1
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

        // Recalcul des totaux
        await updateAuditTotals(supabase, auditId);

        revalidatePath(`/inventory/audits/${auditId}`);
        return { success: true, item: updatedItem };
    } catch (err: any) {
        return { success: false, error: err.message || "Erreur lors du scan." };
    }
}

/**
 * 3. IMPORTATION EXCEL AVEC SELECTION DE LA COLONNE CODE-BARRES
 */
export async function importExcelBarcodesAction(
    auditId: string,
    barcodes: string[]
) {
    try {
        const supabase = await createClient();

        // Récupérer les articles
        const { data: auditItems } = await supabase
            .from("stock_audit_items")
            .select("id, internal_barcode, counted_qty")
            .eq("audit_id", auditId);

        if (!auditItems) return { success: false, error: "Audit non trouvé." };

        const itemsMap = new Map<string, string>();
        auditItems.forEach((i) => itemsMap.set(i.internal_barcode.toUpperCase(), i.id));

        let successCount = 0;
        let duplicateCount = 0;
        let unknownCount = 0;

        for (const rawCode of barcodes) {
            const cleanCode = rawCode.trim().toUpperCase();
            if (!cleanCode) continue;

            const itemId = itemsMap.get(cleanCode);
            if (itemId) {
                await supabase
                    .from("stock_audit_items")
                    .update({ counted_qty: 1, scanned_at: new Date().toISOString() })
                    .eq("id", itemId);
                successCount++;
            } else {
                unknownCount++;
            }
        }

        await updateAuditTotals(supabase, auditId);
        revalidatePath(`/inventory/audits/${auditId}`);

        return { success: true, successCount, unknownCount };
    } catch (err: any) {
        return { success: false, error: err.message || "Erreur d'importation." };
    }
}

async function updateAuditTotals(supabase: SupabaseClient, auditId: string) {
    const { data: allItems } = await supabase
        .from("stock_audit_items")
        .select("counted_qty, theoretical_qty, unit_cost")
        .eq("audit_id", auditId);

    if (allItems) {
        const totalScanned = allItems.filter((i) => (i.counted_qty ?? 0) === 1).length;
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
}


/**
 * 3. Valide et clôture définitivement l'audit
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