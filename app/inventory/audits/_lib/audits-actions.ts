"use server";

import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { revalidatePath } from "next/cache";
import { AuditFilters, StockAudit } from "./types";
import {
    withOdooRetry,
    assertAuditEditable,
    updateAuditTotals,
    batchUpdateAuditItems,
    sanitizeBarcodes,
    OdooQuant,
    OdooProduct,
} from "./audits-actions-helpers";

/* ═══════════════════════════════════════════════════════════════
   1. CRÉATION D'AUDIT
   ═══════════════════════════════════════════════════════════════ */

export async function createAuditSessionAction(
    shopIds: string[],
    departments: string[],
    notes?: string,
    auditDate?: string
) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
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

        /* ─── Appels Odoo SÉQUENTIELS (jamais Promise.all) ─── */

        const positiveQuants = await withOdooRetry(
            () =>
                odooClient.searchRead<OdooQuant>("stock.quant", {
                    domain: [
                        ["company_id", "in", odooCompanyIds],
                        ["location_id.usage", "=", "internal"],
                        ["quantity", ">", 0],
                    ],
                    fields: ["product_id", "location_id", "quantity"],
                    limit: 25000,
                }),
            "create-positive-quants"
        );

        const negativeQuants = await withOdooRetry(
            () =>
                odooClient.searchRead<OdooQuant>("stock.quant", {
                    domain: [
                        ["location_id.usage", "=", "internal"],
                        ["quantity", "<", 0],
                    ],
                    fields: ["product_id", "location_id", "quantity", "company_id"],
                    limit: 25000,
                }),
            "create-negative-quants"
        );

        const productQuantMap = new Map<number, Array<{ locationName: string; quantity: number }>>();
        const soldLocationsMap = new Map<number, Array<{ id: number; name: string }>>();

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

        const productDomain: unknown[] = [
            ["id", "in", uniqueProductIds],
            ["active", "=", true],
            ["available_in_pos", "=", true],
        ];
        const isAllSelected = departments.includes("Tous") || departments.length === 0;
        if (!isAllSelected) productDomain.push(["x_studio_segment", "in", departments]);

        const products = await withOdooRetry(
            () =>
                odooClient.searchRead<OdooProduct>("product.product", {
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
                        "x_studio_many2one_field_21bvh",
                        "x_studio_many2one_field_Arl5D",
                    ],
                    limit: uniqueProductIds.length,
                }),
            "create-products"
        );

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
                    sold_locations: unknown;
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

                const brandVal = p.x_studio_many2one_field_21bvh?.[1] || "N/A";
                const colorVal = p.x_studio_many2one_field_Arl5D?.[1] || "N/A";
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
                        const existingLocs = (existing.sold_locations as Array<{ id: number }>) || [];
                        soldLocs.forEach((sl) => {
                            if (!existingLocs.some((el) => el.id === sl.id)) existingLocs.push(sl);
                        });
                        existing.sold_locations = existingLocs;
                    }
                }
            });

            const snapshotItems = Array.from(barcodeMap.values());
            if (snapshotItems.length > 0) {
                const batchSize = 500;
                for (let i = 0; i < snapshotItems.length; i += batchSize) {
                    const batch = snapshotItems.slice(i, i + batchSize);
                    const { error: insertBatchError } = await supabase.from("stock_audit_items").insert(batch);
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

/* ═══════════════════════════════════════════════════════════════
   2. SYNCHRONISATION
   ═══════════════════════════════════════════════════════════════ */

export async function syncAuditStockSnapshotAction(auditId: string) {
    try {
        const supabase = await createClient();
        await assertAuditEditable(supabase, auditId);

        const { data: existingItems, error: itemsErr } = await supabase
            .from("stock_audit_items")
            .select("id, odoo_product_id")
            .eq("audit_id", auditId);

        if (itemsErr) throw new Error("Impossible de charger les articles.");
        if (!existingItems?.length) {
            return { success: true, message: "Aucun article à synchroniser." };
        }

        const negativeQuants = await withOdooRetry(
            () =>
                odooClient.searchRead<OdooQuant>("stock.quant", {
                    domain: [
                        ["location_id.usage", "=", "internal"],
                        ["quantity", "<", 0],
                    ],
                    fields: ["product_id", "location_id", "quantity"],
                    limit: 25000,
                }),
            "sync-negative-quants"
        );

        const soldLocationsMap = new Map<number, Array<{ id: number; name: string }>>();
        (negativeQuants || []).forEach((q) => {
            const pid = q.product_id[0];
            const locId = q.location_id[0];
            const locName = q.location_id[1] ?? "Emplacement Vente";
            if (!soldLocationsMap.has(pid)) soldLocationsMap.set(pid, []);
            const arr = soldLocationsMap.get(pid)!;
            if (!arr.some((l) => l.id === locId)) arr.push({ id: locId, name: locName });
        });

        const productIds = [...new Set(existingItems.map((i) => i.odoo_product_id))];
        const products = await withOdooRetry(
            () =>
                odooClient.searchRead<OdooProduct>("product.product", {
                    domain: [["id", "in", productIds]],
                    fields: [
                        "id",
                        "name",
                        "hs_code",
                        "standard_price",
                        "create_date",
                        "x_studio_many2one_field_21bvh",
                        "x_studio_many2one_field_Arl5D",
                    ],
                    limit: productIds.length,
                }),
            "sync-products"
        );

        const productInfoMap = new Map<number, OdooProduct>();
        (products || []).forEach((p) => productInfoMap.set(p.id, p));

        const updates = existingItems.map((item) => {
            const pid = item.odoo_product_id;
            const prod = productInfoMap.get(pid);
            const soldLocs = soldLocationsMap.get(pid) || [];
            return {
                id: item.id,
                sold_locations: soldLocs as unknown,
                hs_code: prod?.hs_code || "N/A",
                brand: prod?.x_studio_many2one_field_21bvh?.[1] || "N/A",
                color: prod?.x_studio_many2one_field_Arl5D?.[1] || "N/A",
                odoo_create_date: prod?.create_date || null,
                unit_cost: prod?.standard_price || 0,
            };
        });

        await batchUpdateAuditItems(supabase, updates);

        revalidatePath(`/inventory/audits/${auditId}`);
        return {
            success: true,
            message: "Emplacements de vente multi-compagnies resynchronisés !",
        };
    } catch (err: unknown) {
        console.error("[SYNC_SNAPSHOT_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Échec de la resynchronisation.",
        };
    }
}

/* ═══════════════════════════════════════════════════════════════
   3. SCAN UNITAIRE
   ═══════════════════════════════════════════════════════════════ */

export async function recordBarcodeScanAction(auditId: string, barcode: string) {
    try {
        const supabase = await createClient();
        await assertAuditEditable(supabase, auditId);

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

        if (existingItem) {
            if ((existingItem.counted_qty ?? 0) === 1) {
                return {
                    success: false,
                    isDuplicate: true,
                    error: `⚠️ ALERTE : Le code-barres unitaire (${cleanBarcode}) a DÉJÀ été scanné !`,
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

        const odooProducts = await withOdooRetry(
            () =>
                odooClient.searchRead<OdooProduct>("product.product", {
                    domain: [
                        ["active", "=", true],
                        "|",
                        ["barcode", "=", cleanBarcode],
                        ["default_code", "=", cleanBarcode],
                    ],
                    fields: [
                        "id",
                        "name",
                        "barcode",
                        "default_code",
                        "hs_code",
                        "standard_price",
                        "create_date",
                        "x_studio_segment",
                        "x_studio_many2one_field_21bvh",
                        "x_studio_many2one_field_Arl5D",
                    ],
                    limit: 1,
                }),
            "scan-lookup-product"
        );

        if (!odooProducts?.length) {
            return {
                success: false,
                isUnknown: true,
                error: `⛔ ERREUR : Le code-barres '${cleanBarcode}' est inconnu dans tout le catalogue Odoo.`,
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
                supplier_ref: "Hors Périmètre Odoo / Inattendu",
                hs_code: odooProd.hs_code || "Inattendu",
                brand: odooProd.x_studio_many2one_field_21bvh?.[1] || "N/A",
                color: odooProd.x_studio_many2one_field_Arl5D?.[1] || "N/A",
                odoo_create_date: odooProd.create_date || null,
                sold_locations: [],
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

/* ═══════════════════════════════════════════════════════════════
   4. IMPORT EXCEL BATCHÉ
   ═══════════════════════════════════════════════════════════════ */

export async function importExcelBarcodesAction(auditId: string, barcodes: unknown[]) {
    try {
        const supabase = await createClient();
        await assertAuditEditable(supabase, auditId);

        const cleanBarcodes = sanitizeBarcodes(barcodes);
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

        const toScan: string[] = [];
        const alreadyScanned: string[] = [];
        const missing: string[] = [];

        cleanBarcodes.forEach((code) => {
            const currentQty = existingItemMap.get(code);
            if (currentQty === undefined) missing.push(code);
            else if (currentQty === 1) alreadyScanned.push(code);
            else toScan.push(code);
        });

        let newlyScannedCount = 0;
        let unexpectedCount = 0;

        if (toScan.length > 0) {
            const batchSize = 1000;
            for (let i = 0; i < toScan.length; i += batchSize) {
                const batch = toScan.slice(i, i + batchSize);
                const { data: updatedRows, error: updateError } = await supabase
                    .from("stock_audit_items")
                    .update({ counted_qty: 1, scanned_at: new Date().toISOString() })
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

        if (missing.length > 0) {
            const odooBatchSize = 500;
            for (let i = 0; i < missing.length; i += odooBatchSize) {
                const batchMissing = missing.slice(i, i + odooBatchSize);

                const odooProducts = await withOdooRetry(
                    () =>
                        odooClient.searchRead<OdooProduct>("product.product", {
                            domain: [
                                ["active", "=", true],
                                "|",
                                ["barcode", "in", batchMissing],
                                ["default_code", "in", batchMissing],
                            ],
                            fields: [
                                "id",
                                "name",
                                "barcode",
                                "default_code",
                                "hs_code",
                                "standard_price",
                                "create_date",
                                "x_studio_segment",
                                "x_studio_many2one_field_21bvh",
                                "x_studio_many2one_field_Arl5D",
                            ],
                            limit: batchMissing.length,
                        }),
                    `import-odoo-batch-${i}`
                );

                if (odooProducts && odooProducts.length > 0) {
                    const itemsToInsert: Array<Record<string, unknown>> = [];
                    const insertedOdooBarcodes = new Set<string>();

                    odooProducts.forEach((p) => {
                        const code = (p.barcode || p.default_code || "").trim().toUpperCase();
                        if (!code || insertedOdooBarcodes.has(code)) return;
                        insertedOdooBarcodes.add(code);

                        itemsToInsert.push({
                            audit_id: auditId,
                            odoo_product_id: p.id,
                            product_name: p.name,
                            internal_barcode: code,
                            supplier_ref: "Hors Périmètre (Import Excel)",
                            hs_code: p.hs_code || "Inattendu",
                            brand: p.x_studio_many2one_field_21bvh?.[1] || "N/A",
                            color: p.x_studio_many2one_field_Arl5D?.[1] || "N/A",
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

        const alreadyScannedCount = alreadyScanned.length;
        const unknownCount =
            cleanBarcodes.length - (newlyScannedCount + alreadyScannedCount + unexpectedCount);

        await updateAuditTotals(supabase, auditId);
        revalidatePath(`/inventory/audits/${auditId}`);

        return {
            success: true,
            newlyScannedCount,
            alreadyScannedCount,
            unexpectedCount,
            unknownCount: Math.max(0, unknownCount),
        };
    } catch (err: unknown) {
        console.error("[IMPORT_EXCEL_ERROR]", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Erreur lors de l'importation du fichier Excel.",
        };
    }
}

/* ═══════════════════════════════════════════════════════════════
   5. SUPPRESSION
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   6. VALIDATION
   ═══════════════════════════════════════════════════════════════ */

export async function validateAuditSessionAction(auditId: string) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        await updateAuditTotals(supabase, auditId);

        const { error } = await supabase
            .from("stock_audits")
            .update({
                status: "validated",
                validated_by: user?.id ?? null,
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

/* ═══════════════════════════════════════════════════════════════
   7. LISTE AVEC FILTRAGE
   ═══════════════════════════════════════════════════════════════ */

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

    if (filters?.searchQuery?.trim()) {
        query = query.or(
            `reference.ilike.%${filters.searchQuery.trim()}%,shop_name.ilike.%${filters.searchQuery.trim()}%`
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