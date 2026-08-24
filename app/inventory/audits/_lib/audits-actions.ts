'use server';

import { createClient } from "@/lib/supabase/server";
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper: Extraction sécurisée des IDs de boutiques depuis la colonne JSONB `assigned_shops`
 */
function extractAllowedShopIds(assignedShops: unknown): string[] {
    if (!Array.isArray(assignedShops)) return [];
    return assignedShops.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

/**
 * 1. CRÉATION D'AUDIT EN EXTRAISANT LES STOCKS PAR ODOO_COMPANY_ID
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
        const userId = user?.id || null;

        const cleanShopIds = (shopIds || []).filter(
            (id) => typeof id === "string" && id.trim().length > 0
        );

        if (cleanShopIds.length === 0) {
            return { success: false, error: "Veuillez sélectionner au moins une boutique valide." };
        }

        const { data: shops, error: shopError } = await supabase
            .from("shops")
            .select("id, name, odoo_company_id")
            .in("id", cleanShopIds);

        if (shopError || !shops || shops.length === 0) {
            return { success: false, error: "Boutique(s) introuvable(s)." };
        }

        const shopNames = shops.map((s) => s.name).join(", ");
        const odooCompanyIds = [...new Set(
            shops.map((s) => s.odoo_company_id).filter((id): id is number => typeof id === "number" && id > 0)
        )];

        if (odooCompanyIds.length === 0) {
            return { success: false, error: "Aucun `odoo_company_id` associé aux boutiques sélectionnées." };
        }

        const departmentLabel = departments.length > 0 ? departments.join(", ") : "Tous";

        const selectedDate = auditDate ? new Date(auditDate) : new Date();
        const todayStr = new Date().toISOString().split("T")[0];
        const isHistorical = auditDate && auditDate !== todayStr;

        const datePrefix = selectedDate.toISOString().slice(0, 7).replace("-", "");
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const reference = `AUD-${datePrefix}-${randomSuffix}`;

        // En-tête d'audit
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
                notes: notes ? (isHistorical ? `[Historique du ${auditDate}] ${notes}` : notes) : (isHistorical ? `[Historique du ${auditDate}]` : null),
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        // ------------------------------------------------------------------
        // APPEL ODOO 1 : EXTRACTION DES QUANTS DE LA SOCIÉTÉ (quantity > 0)
        // ------------------------------------------------------------------
        const quants = await odooJsonClient.searchRead<any>("stock.quant", {
            domain: [
                ["company_id", "in", odooCompanyIds],
                ["location_id.usage", "=", "internal"],
                ["quantity", ">", 0]
            ],
            fields: ["product_id", "location_id", "quantity"],
            limit: 25000
        });

        if (!quants || quants.length === 0) {
            return {
                success: true,
                auditId: audit.id,
                reference: audit.reference,
                warning: "Aucun stock Odoo supérieur à 0 trouvé pour cette société."
            };
        }

        // Map d'indexation par produit ID : Map<ProductID, Array<{ locationName, qty }>>
        const productQuantMap = new Map<number, Array<{ locationName: string; quantity: number }>>();

        quants.forEach((q: any) => {
            if (!q.product_id || !Array.isArray(q.product_id)) return;
            const pid = q.product_id[0];
            const locName = Array.isArray(q.location_id) ? q.location_id[1] : "Stock Principal";
            const qty = Math.round(q.quantity || 0);

            if (!productQuantMap.has(pid)) {
                productQuantMap.set(pid, []);
            }
            productQuantMap.get(pid)!.push({ locationName: locName, quantity: qty });
        });

        const uniqueProductIds = Array.from(productQuantMap.keys());

        // ------------------------------------------------------------------
        // APPEL ODOO 2 : RECHERCHE PRODUITS & FILTRE x_studio_segment (SÉQUENTIEL)
        // ------------------------------------------------------------------
        const productDomain: any[] = [
            ["id", "in", uniqueProductIds],
            ["active", "=", true],
            ["available_in_pos", "=", true]
        ];

        const isAllSelected = departments.includes("Tous") || departments.length === 0;
        if (!isAllSelected) {
            productDomain.push(["x_studio_segment", "in", departments]);
        }

        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: productDomain,
            fields: ["id", "name", "barcode", "default_code", "hs_code", "standard_price", "x_studio_segment"],
            limit: uniqueProductIds.length
        });

        if (products && products.length > 0) {
            // Map de regroupement strict par CODE-BARRES UNIQUE
            const barcodeMap = new Map<string, {
                audit_id: string;
                odoo_product_id: number;
                product_name: string;
                internal_barcode: string;
                supplier_ref: string;
                hs_code: string;
                theoretical_qty: number;
                counted_qty: number;
                unit_cost: number;
            }>();

            products.forEach((p: any) => {
                const barcodeVal = (p.barcode || p.default_code || "").trim().toUpperCase();
                if (!barcodeVal) return;

                const quantList = productQuantMap.get(p.id) || [];
                const segmentVal = p.x_studio_segment || "Général";
                const totalQty = quantList.reduce((sum, q) => sum + q.quantity, 0);
                const locations = [...new Set(quantList.map((q) => q.locationName))].join(", ");

                if (!barcodeMap.has(barcodeVal)) {
                    barcodeMap.set(barcodeVal, {
                        audit_id: audit.id,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode: barcodeVal,
                        supplier_ref: locations || "Stock Principal",
                        hs_code: segmentVal,
                        theoretical_qty: totalQty, // Cumul total du stock théorique
                        counted_qty: 0,
                        unit_cost: p.standard_price || 0,
                    });
                } else {
                    // Cumul si le même code-barres existe sur plusieurs fiches
                    const existing = barcodeMap.get(barcodeVal)!;
                    existing.theoretical_qty += totalQty;
                }
            });

            const snapshotItems = Array.from(barcodeMap.values());

            // Insertion par paquets de 500 dans Supabase sans risque de doublons
            if (snapshotItems.length > 0) {
                const batchSize = 500;
                for (let i = 0; i < snapshotItems.length; i += batchSize) {
                    const batch = snapshotItems.slice(i, i + batchSize);
                    const { error: insertBatchError } = await supabase
                        .from("stock_audit_items")
                        .insert(batch);

                    if (insertBatchError) {
                        console.error("[AUDIT_SNAPSHOT_INSERT_ERROR]", insertBatchError);
                    }
                }
            }
        }

        revalidatePath("/inventory/audits");
        return { success: true, auditId: audit.id, reference: audit.reference };

    } catch (err: any) {
        console.error("[CREATE_AUDIT_ERROR]", err);
        return { success: false, error: err.message || "Erreur de création d'audit." };
    }
}

/**
 * 2. SUPPRESSION D'UN AUDIT ET PURGE COMPLETE DU SNAPSHOT EN BUCKETS
 */
export async function deleteAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();

        // Vérification du statut (Un audit validé ne peut pas être supprimé)
        const { data: audit } = await supabase
            .from("stock_audits")
            .select("status")
            .eq("id", auditId)
            .single();

        if (audit?.status === "validated") {
            return { success: false, error: "Un audit validé et verrouillé ne peut pas être supprimé." };
        }

        // 1. Suppression explicite du snapshot d'articles
        const { error: deleteItemsError } = await supabase
            .from("stock_audit_items")
            .delete()
            .eq("audit_id", auditId);

        if (deleteItemsError) {
            console.error("[DELETE_AUDIT_ITEMS_ERROR]", deleteItemsError);
            throw new Error("Impossible de supprimer le snapshot d'articles d'audit.");
        }

        // 2. Suppression de l'en-tête d'audit
        const { error: deleteAuditError } = await supabase
            .from("stock_audits")
            .delete()
            .eq("id", auditId);

        if (deleteAuditError) throw new Error(deleteAuditError.message);

        revalidatePath("/inventory/audits");
        return { success: true };

    } catch (err: any) {
        return { success: false, error: err.message || "Erreur lors de la suppression de l'audit." };
    }
}

/**
 * 2. LISTE SÉCURISÉE DES AUDITS AVEC FILTRAGE PAR SESSIONS & DROITS BOUTIQUES
 */
export async function getAllAuditsAction() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return [];

        const { data: profile } = await supabase
            .from("profiles")
            .select("role, shop_access_type, assigned_shops")
            .eq("id", user.id)
            .single();

        let query = supabase
            .from("stock_audits")
            .select("*, shops(id, name, odoo_company_id)")
            .order("created_at", { ascending: false });

        // Filtrage direct en SQL si l'utilisateur est restreint à certaines boutiques
        if (
            profile?.role !== "admin" &&
            profile?.shop_access_type === "specific" &&
            Array.isArray(profile.assigned_shops)
        ) {
            const allowedIds = extractAllowedShopIds(profile.assigned_shops);
            if (allowedIds.length > 0) {
                query = query.in("shop_id", allowedIds);
            } else {
                return [];
            }
        }

        const { data: audits, error } = await query;
        if (error) throw new Error(error.message);

        return audits || [];
    } catch (err) {
        console.error("[GET_ALL_AUDITS_ERROR]", err);
        return [];
    }
}

/**
 * 4. REGISTRE LE SCAN UNITAIRE + GESTION DYNAMIQUE DES ARTICLES HORS PÉRIMÈTRE
 */
export async function recordBarcodeScanAction(auditId: string, barcode: string) {
    try {
        const supabase = await createClient();
        const cleanBarcode = barcode.trim().toUpperCase();

        // 1. Recherche dans le snapshot actuel de l'audit
        const { data: existingItem, error: fetchError } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId)
            .eq("internal_barcode", cleanBarcode)
            .maybeSingle();

        // CAS A : L'article fait partie du snapshot initial de la boutique
        if (existingItem) {
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

            await updateAuditTotals(supabase, auditId);
            revalidatePath(`/inventory/audits/${auditId}`);

            return { success: true, item: updatedItem, isUnexpected: false };
        }

        // ------------------------------------------------------------------
        // CAS B : ARTICLE ABSENT DU SNAPSHOT DE CETTE BOUTIQUE
        // RECHERCHE DYNAMIQUE DANS LE CATALOGUE GÉNÉRAL ODOO (SÉQUENTIEL)
        // ------------------------------------------------------------------
        const odooProducts = await odooJsonClient.searchRead<any>("product.product", {
            domain: [
                ["active", "=", true],
                "|",
                ["barcode", "=", cleanBarcode],
                ["default_code", "=", cleanBarcode]
            ],
            fields: ["id", "name", "barcode", "default_code", "hs_code", "standard_price", "x_studio_segment"],
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

        const { data: newItem, error: insertError } = await supabase
            .from("stock_audit_items")
            .insert({
                audit_id: auditId,
                odoo_product_id: odooProd.id,
                product_name: odooProd.name,
                internal_barcode: cleanBarcode,
                supplier_ref: "Inattendu / Hors Périmètre Odoo",
                hs_code: odooProd.x_studio_segment || "Inattendu",
                theoretical_qty: 0,
                counted_qty: 1,
                unit_cost: odooProd.standard_price || 0,
                scanned_at: new Date().toISOString(),
            })
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

    } catch (err: any) {
        console.error("[RECORD_SCAN_ERROR]", err);
        return { success: false, error: err.message || "Erreur lors du scan." };
    }
}

/**
 * 5. IMPORTATION EXCEL BATCHÉE EN BUCKETS (SQL IN) - 100X PLUS RAPIDE
 */
export async function importExcelBarcodesAction(
    auditId: string,
    barcodes: string[]
) {
    try {
        const supabase = await createClient();

        // Nettoyage et dédoublonnage des codes-barres du fichier Excel
        const cleanBarcodes = Array.from(
            new Set(barcodes.map((b) => b.trim().toUpperCase()).filter(Boolean))
        );

        if (cleanBarcodes.length === 0) {
            return { success: false, error: "Aucun code-barres valide fourni." };
        }

        // 1. Récupération des articles actuels du snapshot avec leur statut de scan (counted_qty)
        const { data: existingItems } = await supabase
            .from("stock_audit_items")
            .select("internal_barcode, counted_qty")
            .eq("audit_id", auditId);

        const existingItemMap = new Map<string, number>();
        (existingItems || []).forEach((i) => {
            existingItemMap.set(i.internal_barcode.toUpperCase(), i.counted_qty ?? 0);
        });

        // Ventilation des codes-barres du fichier Excel
        const toScanBarcodes: string[] = [];        // Présents et pas encore scannés (0/1)
        const alreadyScannedBarcodes: string[] = [];  // Présents et DÉJÀ scannés (1/1)
        const missingBarcodes: string[] = [];         // Absents du snapshot de la boutique

        cleanBarcodes.forEach((code) => {
            if (existingItemMap.has(code)) {
                const currentQty = existingItemMap.get(code);
                if (currentQty === 1) {
                    alreadyScannedBarcodes.push(code); // DÉJÀ VÉRIFIÉ
                } else {
                    toScanBarcodes.push(code); // À PASSER À 1/1
                }
            } else {
                missingBarcodes.push(code);
            }
        });

        let newlyScannedCount = 0;
        let unexpectedCount = 0;

        // 2. Passage à 1/1 pour les articles qui étaient en attente (toScanBarcodes)
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

        // 3. Recherche dans Odoo pour les codes-barres absents du snapshot (missingBarcodes)
        if (missingBarcodes.length > 0) {
            const odooProducts = await odooJsonClient.searchRead<any>("product.product", {
                domain: [
                    ["active", "=", true],
                    "|",
                    ["barcode", "in", missingBarcodes],
                    ["default_code", "in", missingBarcodes]
                ],
                fields: ["id", "name", "barcode", "default_code", "hs_code", "standard_price", "x_studio_segment"],
                limit: missingBarcodes.length
            });

            if (odooProducts && odooProducts.length > 0) {
                const itemsToInsert: any[] = [];
                const insertedOdooBarcodes = new Set<string>();

                odooProducts.forEach((p: any) => {
                    const code = (p.barcode || p.default_code || "").trim().toUpperCase();
                    if (!code || insertedOdooBarcodes.has(code)) return;

                    insertedOdooBarcodes.add(code);
                    itemsToInsert.push({
                        audit_id: auditId,
                        odoo_product_id: p.id,
                        product_name: p.name,
                        internal_barcode: code,
                        supplier_ref: "Hors Périmètre (Import Excel)",
                        hs_code: p.x_studio_segment || "Inattendu",
                        theoretical_qty: 0,
                        counted_qty: 1,
                        unit_cost: p.standard_price || 0,
                        scanned_at: new Date().toISOString(),
                    });
                });

                if (itemsToInsert.length > 0) {
                    const batchSize = 500;
                    for (let i = 0; i < itemsToInsert.length; i += batchSize) {
                        const batch = itemsToInsert.slice(i, i + batchSize);
                        const { data: inserted, error: insertError } = await supabase
                            .from("stock_audit_items")
                            .insert(batch)
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

        // Recalcul des totaux d'audit
        await updateAuditTotals(supabase, auditId);
        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            newlyScannedCount,
            alreadyScannedCount,
            unexpectedCount,
            unknownCount
        };

    } catch (err: any) {
        console.error("[IMPORT_EXCEL_ERROR]", err);
        return { success: false, error: err.message || "Erreur lors de l'importation du fichier Excel." };
    }
}

/**
 * HELPER : Calcul et Mises à Jour des Totaux de la Session d'Audit
 */
async function updateAuditTotals(supabase: SupabaseClient, auditId: string) {
    const { data: allItems } = await supabase
        .from("stock_audit_items")
        .select("counted_qty, theoretical_qty, unit_cost")
        .eq("audit_id", auditId);

    if (allItems) {
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
}

/**
 * 6. VALIDATION ET VERROUILLAGE DÉFINITIF DE L'AUDIT
 */
export async function validateAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
    } catch (err: any) {
        return { success: false, error: err.message || "Échec de la validation." };
    }
}