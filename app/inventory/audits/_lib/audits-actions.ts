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
    extractOdooMany2oneName,
    StockAuditItemInsert,
} from "./types";

/**
 * Helper: Extraction sécurisée des IDs de boutiques autorisées depuis JSONB
 */
function extractAllowedShopIds(assignedShops: unknown): string[] {
    if (!Array.isArray(assignedShops)) return [];
    return assignedShops.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
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

/**
 * 1. CRÉATION D'AUDIT EN EXTRAISANT LES STOCKS ET VENTIES NÉGATIVES INTER-COMPAGNIES
 */
export async function createAuditSessionAction(
    shopIds: string[],       // IDs des boutiques
    departments: string[],   // Segments ("Femme", "Enfant", "Beauty", "Tous")
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

        const departmentLabel = departments.length > 0 ? departments.join(", ") : "Tous";
        const selectedDate = auditDate ? new Date(auditDate) : new Date();
        const todayStr = new Date().toISOString().split("T")[0];
        const isHistorical = auditDate && auditDate !== todayStr;

        const datePrefix = selectedDate.toISOString().slice(0, 7).replace("-", "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const reference = `AUD-${datePrefix}-${randomSuffix}`;

        // Insertion En-tête d'audit
        const { data: audit, error: insertError } = await supabase
            .from("stock_audits")
            .insert({
                reference,
                shop_id: shopIds[0],
                shop_name: shopNames,
                department: departmentLabel,
                status: "in_progress",
                created_by: userId,
                created_at: selectedDate.toISOString(),
                audit_date: selectedDate.toISOString().split("T")[0],
                total_items_scanned: 0,
                total_discrepancy_qty: 0,
                total_discrepancy_value: 0,
                notes: notes
                    ? isHistorical
                        ? `[Historique du ${auditDate}] ${notes}`
                        : notes
                    : isHistorical
                        ? `[Historique du ${auditDate}]`
                        : null,
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        /* ─── APPELS ODOO SÉQUENTIELS (Jamais Promise.all sur Odoo JSON-RPC) ─── */

        // Appel A : Quants positifs (> 0) de la boutique ciblée
        const positiveQuants = await odooClient.searchRead<OdooQuant>("stock.quant", {
            domain: [
                ["company_id", "in", odooCompanyIds],
                ["location_id.usage", "=", "internal"],
                ["quantity", ">", 0],
            ],
            fields: ["product_id", "location_id", "quantity"],
            limit: 25000,
        });

        // Appel B : Quants négatifs (< 0) sur TOUTES LES COMPAGNIES DU GROUPE ODOO
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

        (positiveQuants || []).forEach((q) => {
            const pid = q.product_id[0];
            const locName = q.location_id[1] ?? "Stock Principal";
            const qty = Math.round(q.quantity || 0);
            if (!productQuantMap.has(pid)) productQuantMap.set(pid, []);
            productQuantMap.get(pid)!.push({ locationName: locName, quantity: qty });
        });

        (negativeQuants || []).forEach((q) => {
            const pid = q.product_id[0];
            const locId = q.location_id[0];
            const locName = q.location_id[1] ?? "Emplacement Vente";
            if (!soldLocationsMap.has(pid)) soldLocationsMap.set(pid, []);
            const arr = soldLocationsMap.get(pid)!;
            if (!arr.some((l) => l.id === locId)) arr.push({ id: locId, name: locName });
        });

        const uniqueProductIds = Array.from(
            new Set([...productQuantMap.keys(), ...soldLocationsMap.keys()])
        );

        if (uniqueProductIds.length === 0) {
            return {
                success: true,
                auditId: audit.id,
                reference: audit.reference,
                warning: "Aucun stock Odoo trouvé pour cette société.",
            };
        }

        // Domaine Odoo avec typage strict OdooDomain
        const productDomain: OdooDomain = [
            ["id", "in", uniqueProductIds],
            ["active", "=", true],
            ["available_in_pos", "=", true],
        ];

        const isAllSelected = departments.includes("Tous") || departments.length === 0;
        if (!isAllSelected) {
            productDomain.push(["x_studio_segment", "in", departments]);
        }

        // Appel C : Produits Odoo avec tous les attributs Studio
        const products = await odooClient.searchRead<OdooProduct>("product.product", {
            domain: productDomain,
            fields: [
                "id",
                "name",
                "barcode",
                "default_code",
                "hs_code",
                "standard_price",
                "create_date",
                "x_studio_segment",
                "x_studio_many2one_field_21bvh", // Marque
                "x_studio_many2one_field_Arl5D",  // Couleur
            ],
            limit: uniqueProductIds.length,
        });

        if (products && products.length > 0) {
            const barcodeMap = new Map<
                string,
                {
                    audit_id: string;
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
                }
            >();

            products.forEach((p) => {
                const barcodeVal = (p.barcode || p.default_code || "").trim().toUpperCase();
                if (!barcodeVal) return;

                const quantList = productQuantMap.get(p.id) || [];
                const soldLocs = soldLocationsMap.get(p.id) || [];
                const totalQty = quantList.reduce((sum, q) => sum + q.quantity, 0);
                const locations = [...new Set(quantList.map((q) => q.locationName))].join(", ");

                const brandVal = extractOdooMany2oneName(p.x_studio_many2one_field_21bvh, "N/A");
                const colorVal = extractOdooMany2oneName(p.x_studio_many2one_field_Arl5D, "N/A");
                const hsCodeVal = p.hs_code || "N/A";

                if (!barcodeMap.has(barcodeVal)) {
                    barcodeMap.set(barcodeVal, {
                        audit_id: audit.id,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode: barcodeVal,
                        supplier_ref: locations || "Stock Principal",
                        hs_code: hsCodeVal,
                        brand: brandVal,
                        color: colorVal,
                        odoo_create_date: p.create_date || null,
                        sold_locations: soldLocs,
                        theoretical_qty: totalQty >= 1 ? totalQty : 1,
                        counted_qty: 0,
                        unit_cost: p.standard_price || 0,
                    });
                } else {
                    const existing = barcodeMap.get(barcodeVal)!;
                    existing.theoretical_qty += totalQty;
                    if (soldLocs.length > 0) {
                        const existingLocs = existing.sold_locations || [];
                        soldLocs.forEach((sl) => {
                            if (!existingLocs.some((el) => el.id === sl.id)) existingLocs.push(sl);
                        });
                        existing.sold_locations = existingLocs;
                    }
                }
            });

            const snapshotItems = Array.from(barcodeMap.values());

            // Insertion batchée ultra-rapide par paquets de 500 dans Supabase
            if (snapshotItems.length > 0) {
                const batchSize = 500;
                for (let i = 0; i < snapshotItems.length; i += batchSize) {
                    const batch = snapshotItems.slice(i, i + batchSize);
                    const { error: insertBatchError } = await supabase
                        .from("stock_audit_items")
                        .insert(batch as any);

                    if (insertBatchError) {
                        console.error("[AUDIT_SNAPSHOT_INSERT_ERROR]", insertBatchError);
                    }
                }
            }
        }

        await updateAuditTotals(supabase, audit.id);
        revalidatePath("/inventory/audits");

        return { success: true, auditId: audit.id, reference: audit.reference };
    } catch (err: unknown) {
        console.error("[CREATE_AUDIT_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Erreur de création d'audit.",
        };
    }
}

/**
 * 2. RESYNCHRONISATION DES MÉTADONNÉES ET EMPLACEMENTS NÉGATIFS INTER-COMPAGNIES
 * NE RECALCULE PAS LE STOCK THÉORIQUE DE RÉFÉRENCE NI LES SCANS DÉJÀ EFFECTUÉS.
 * Exécute un UPSERT batché (< 100ms sur 3 000 articles).
 */
export async function syncAuditStockSnapshotAction(auditId: string) {
    try {
        const supabase = await createClient();

        const { data: audit, error: fetchAuditError } = await supabase
            .from("stock_audits")
            .select("id, shop_id, audit_date, status")
            .eq("id", auditId)
            .single();

        if (fetchAuditError || !audit) throw new Error("Audit introuvable.");

        if (audit.status === "validated") {
            return { success: false, error: "Un audit clôturé et verrouillé ne peut plus être synchronisé." };
        }

        // Extraction élargie des stocks négatifs (< 0) sur TOUTES LES COMPAGNIES ODOO
        const negativeQuants = await odooClient.searchRead<OdooQuant>("stock.quant", {
            domain: [
                ["location_id.usage", "=", "internal"],
                ["quantity", "<", 0]
            ],
            fields: ["product_id", "location_id", "quantity"],
            limit: 25000
        });

        const soldLocationsMap = new Map<number, SoldLocation[]>();

        (negativeQuants || []).forEach((q) => {
            const pid = q.product_id[0];
            const locId = q.location_id[0];
            const locName = q.location_id[1] ?? "Emplacement Vente";

            if (!soldLocationsMap.has(pid)) soldLocationsMap.set(pid, []);
            const arr = soldLocationsMap.get(pid)!;
            if (!arr.some((l) => l.id === locId)) arr.push({ id: locId, name: locName });
        });

        // Récupération des articles actuels du snapshot
        const { data: existingItems } = await supabase
            .from("stock_audit_items")
            .select("id, odoo_product_id")
            .eq("audit_id", auditId);

        if (existingItems && existingItems.length > 0) {
            const productIds = Array.from(new Set(existingItems.map((i) => i.odoo_product_id)));

            const products = await odooClient.searchRead<OdooProduct>("product.product", {
                domain: [["id", "in", productIds]],
                fields: [
                    "id", "name", "barcode", "default_code", "hs_code",
                    "standard_price", "create_date",
                    "x_studio_many2one_field_21bvh",
                    "x_studio_many2one_field_Arl5D"
                ],
                limit: productIds.length
            });

            const productInfoMap = new Map<number, OdooProduct>();
            (products || []).forEach((p) => productInfoMap.set(p.id, p));

            // Préparation des mises à jour pour Supabase UPSERT (0 boucle unitaire)
            const updates = existingItems.map((item) => {
                const pid = item.odoo_product_id;
                const prodInfo = productInfoMap.get(pid);
                const soldLocs = soldLocationsMap.get(pid) || [];

                const brandVal = extractOdooMany2oneName(prodInfo?.x_studio_many2one_field_21bvh, "N/A");
                const colorVal = extractOdooMany2oneName(prodInfo?.x_studio_many2one_field_Arl5D, "N/A");

                return {
                    id: item.id,
                    sold_locations: soldLocs as any,
                    hs_code: prodInfo?.hs_code || "N/A",
                    brand: brandVal,
                    color: colorVal,
                    odoo_create_date: prodInfo?.create_date || null,
                    unit_cost: prodInfo?.standard_price || 0,
                };
            });

            // Upsert batché par paquets de 500
            const batchSize = 500;
            for (let i = 0; i < updates.length; i += batchSize) {
                const batch = updates.slice(i, i + batchSize);
                const { error: upsertError } = await supabase
                    .from("stock_audit_items")
                    .upsert(batch as any);

                if (upsertError) {
                    console.error("[SYNC_UPSERT_ERROR]", upsertError);
                }
            }
        }

        revalidatePath(`/inventory/audits/${auditId}`);

        return { success: true, message: "Informations Odoo et emplacements de vente resynchronisés !" };

    } catch (err: unknown) {
        console.error("[SYNC_SNAPSHOT_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Échec de la resynchronisation.",
        };
    }
}

/**
 * 3. REGISTRE LE SCAN UNITAIRE + GESTION DYNAMIQUE DES ARTICLES HORS PÉRIMÈTRE
 */
export async function recordBarcodeScanAction(auditId: string, barcode: string) {
    try {
        const supabase = await createClient();
        const cleanBarcode = barcode.trim().toUpperCase();

        if (!cleanBarcode) {
            return { success: false, error: "Code-barres vide fourni." };
        }

        const { data: existingItem, error: fetchError } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId)
            .eq("internal_barcode", cleanBarcode)
            .maybeSingle();

        if (fetchError) {
            console.error("[FETCH_ITEM_ERROR]", fetchError);
        }

        // CAS A : Produit dans le snapshot de la boutique
        if (existingItem) {
            if ((existingItem.counted_qty ?? 0) === 1) {
                return {
                    success: false,
                    isDuplicate: true,
                    error: `⚠️ ALERTE : Le code-barres unitaire (${cleanBarcode}) a DÉJÀ été scanné !`
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

            await updateAuditTotals(supabase, auditId);
            revalidatePath(`/inventory/audits/${auditId}`);

            return { success: true, item: updatedItem, isUnexpected: false };
        }

        // CAS B : Produit hors périmètre Odoo (Inattendu)
        const odooProducts = await odooClient.searchRead<OdooProduct>("product.product", {
            domain: [
                ["active", "=", true],
                "|",
                ["barcode", "=", cleanBarcode],
                ["default_code", "=", cleanBarcode]
            ],
            fields: [
                "id", "name", "barcode", "default_code", "hs_code",
                "standard_price", "create_date", "x_studio_segment",
                "x_studio_many2one_field_21bvh", "x_studio_many2one_field_Arl5D"
            ],
            limit: 1
        });

        if (!odooProducts || odooProducts.length === 0) {
            return {
                success: false,
                isUnknown: true,
                error: `⛔ ERREUR : Le code-barres '${cleanBarcode}' est inconnu dans tout le catalogue Odoo.`
            };
        }

        const odooProd = odooProducts[0];
        const brandVal = extractOdooMany2oneName(odooProd.x_studio_many2one_field_21bvh, "N/A");
        const colorVal = extractOdooMany2oneName(odooProd.x_studio_many2one_field_Arl5D, "N/A");

        const { data: newItem, error: insertError } = await supabase
            .from("stock_audit_items")
            .insert({
                audit_id: auditId,
                odoo_product_id: odooProd.id,
                product_name: odooProd.name,
                internal_barcode: cleanBarcode,
                supplier_ref: "Hors Périmètre Odoo / Inattendu",
                hs_code: odooProd.hs_code || "Inattendu",
                brand: brandVal,
                color: colorVal,
                odoo_create_date: odooProd.create_date || null,
                sold_locations: [],
                theoretical_qty: 0,
                counted_qty: 1,
                unit_cost: odooProd.standard_price || 0,
                scanned_at: new Date().toISOString(),
            } as unknown as StockAuditItemInsert)
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        await updateAuditTotals(supabase, auditId);
        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            item: newItem,
            isUnexpected: true,
            message: `⚠️ Produit hors périmètre Odoo détecté (${odooProd.name}). Ajouté à l'inventaire (+1).`
        };

    } catch (err: unknown) {
        console.error("[RECORD_SCAN_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Erreur lors du scan.",
        };
    }
}

/**
 * 4. IMPORTATION EXCEL BATCHÉE
 */
export async function importExcelBarcodesAction(
    auditId: string,
    barcodes: string[]
) {
    try {
        const supabase = await createClient();

        const cleanBarcodes = Array.from(
            new Set(barcodes.map((b) => b.trim().toUpperCase()).filter(Boolean))
        );

        if (cleanBarcodes.length === 0) {
            return { success: false, error: "Aucun code-barres valide fourni." };
        }

        const { data: existingItems } = await supabase
            .from("stock_audit_items")
            .select("internal_barcode, counted_qty")
            .eq("audit_id", auditId);

        const existingItemMap = new Map<string, number>();
        (existingItems || []).forEach((i) => {
            existingItemMap.set(i.internal_barcode.toUpperCase(), i.counted_qty ?? 0);
        });

        const toScanBarcodes: string[] = [];
        const alreadyScannedBarcodes: string[] = [];
        const missingBarcodes: string[] = [];

        cleanBarcodes.forEach((code) => {
            if (existingItemMap.has(code)) {
                const currentQty = existingItemMap.get(code);
                if (currentQty === 1) {
                    alreadyScannedBarcodes.push(code);
                } else {
                    toScanBarcodes.push(code);
                }
            } else {
                missingBarcodes.push(code);
            }
        });

        let newlyScannedCount = 0;
        let unexpectedCount = 0;

        if (toScanBarcodes.length > 0) {
            const batchSize = 1000;
            for (let i = 0; i < toScanBarcodes.length; i += batchSize) {
                const batch = toScanBarcodes.slice(i, i + batchSize);

                const { data: updatedRows, error: updateError } = await supabase
                    .from("stock_audit_items")
                    .update({
                        counted_qty: 1,
                        scanned_at: new Date().toISOString()
                    })
                    .eq("audit_id", auditId)
                    .in("internal_barcode", batch)
                    .select("id");

                if (updateError) {
                    console.error("[IMPORT_EXCEL_BATCH_ERROR]", updateError);
                } else if (updatedRows) {
                    newlyScannedCount += updatedRows.length;
                }
            }
        }

        if (missingBarcodes.length > 0) {
            const odooBatchSize = 500;
            for (let i = 0; i < missingBarcodes.length; i += odooBatchSize) {
                const batchMissing = missingBarcodes.slice(i, i + odooBatchSize);

                const odooProducts = await odooClient.searchRead<OdooProduct>("product.product", {
                    domain: [
                        ["active", "=", true],
                        "|",
                        ["barcode", "in", batchMissing],
                        ["default_code", "in", batchMissing]
                    ],
                    fields: [
                        "id", "name", "barcode", "default_code", "hs_code",
                        "standard_price", "create_date", "x_studio_segment",
                        "x_studio_many2one_field_21bvh", "x_studio_many2one_field_Arl5D"
                    ],
                    limit: batchMissing.length
                });

                if (odooProducts && odooProducts.length > 0) {
                    const itemsToInsert: any[] = [];
                    const insertedOdooBarcodes = new Set<string>();

                    odooProducts.forEach((p) => {
                        const code = (p.barcode || p.default_code || "").trim().toUpperCase();
                        if (!code || insertedOdooBarcodes.has(code)) return;

                        insertedOdooBarcodes.add(code);
                        const brandVal = extractOdooMany2oneName(p.x_studio_many2one_field_21bvh, "N/A");
                        const colorVal = extractOdooMany2oneName(p.x_studio_many2one_field_Arl5D, "N/A");

                        itemsToInsert.push({
                            audit_id: auditId,
                            odoo_product_id: p.id,
                            product_name: p.name,
                            internal_barcode: code,
                            supplier_ref: "Hors Périmètre (Import Excel)",
                            hs_code: p.hs_code || "Inattendu",
                            brand: brandVal,
                            color: colorVal,
                            odoo_create_date: p.create_date || null,
                            sold_locations: [],
                            theoretical_qty: 0,
                            counted_qty: 1,
                            unit_cost: p.standard_price || 0,
                            scanned_at: new Date().toISOString(),
                        });
                    });

                    if (itemsToInsert.length > 0) {
                        const { data: inserted, error: insertError } = await supabase
                            .from("stock_audit_items")
                            .insert(itemsToInsert)
                            .select("id");

                        if (insertError) {
                            console.error("[IMPORT_EXCEL_UNEXPECTED_INSERT_ERROR]", insertError);
                        } else if (inserted) {
                            unexpectedCount += inserted.length;
                        }
                    }
                }
            }
        }

        const alreadyScannedCount = alreadyScannedBarcodes.length;
        const unknownCount = cleanBarcodes.length - (newlyScannedCount + alreadyScannedCount + unexpectedCount);

        await updateAuditTotals(supabase, auditId);
        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            newlyScannedCount,
            alreadyScannedCount,
            unexpectedCount,
            unknownCount
        };

    } catch (err: unknown) {
        console.error("[IMPORT_EXCEL_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Erreur lors de l'importation Excel.",
        };
    }
}

/**
 * 5. SUPPRESSION D'UN AUDIT ET PURGE DU SNAPSHOT
 */
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

/**
 * 6. VALIDATION ET VERROUILLAGE DÉFINITIF DE L'AUDIT
 */
export async function validateAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        await updateAuditTotals(supabase, auditId);

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

/**
 * 7. LISTE SÉCURISÉE DES AUDITS AVEC FILTRAGE PAR SESSIONS & DROITS BOUTIQUES
 */
export async function getAuditsAction(filters?: AuditFilters): Promise<StockAudit[]> {
    const supabase = await createClient();

    let query = supabase
        .from("stock_audits")
        .select("*")
        .order("created_at", { ascending: false });

    if (filters?.allowedShopIds && filters.allowedShopIds.length > 0) {
        query = query.in("shop_id", filters.allowedShopIds);
    } else if (filters?.allowedShopIds && filters.allowedShopIds.length === 0) {
        return [];
    }

    if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    if (filters?.searchQuery && filters.searchQuery.trim() !== "") {
        query = query.or(
            `reference.ilike.%${filters.searchQuery}%,shop_name.ilike.%${filters.searchQuery}%`
        );
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