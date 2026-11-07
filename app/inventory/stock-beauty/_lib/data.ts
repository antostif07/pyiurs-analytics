// app/inventory/stock-beauty/_lib/data.ts
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import {
    extractBrandFromProduct,
    extractColorFromProduct,
} from "@/lib/utils";
import type {
    IndividualProductModel,
    PurchaseOrderInfo,
    PurchaseOrderOption,
    StockBeautyData,
    StockBeautyModel,
} from "./types";
import { OdooProductTemplate, Product } from "@/app/types/product_template";
import { getShopLocations } from "../../_lib/locations";
import {
    calculateLastSaleDate,
    calculateReplenishmentMetrics,
    calculateSalesLast30Days,
} from "@/app/utils/stockCalculations";
import { PurchaseOrderLine } from "@/app/types/purchase";
import { POSOrderLine } from "@/app/types/pos";
import { StockQuant } from "@/app/types/stock";
import { processBatchesSequentially, safeSearchRead } from "@/lib/odoo/odoo-safe";

const STOCK_CACHE_TTL_MS = 5 * 60 * 1000;

// ✅ Seuls les POs dont le fournisseur commence par ces préfixes sont pris en compte
const ALLOWED_SUPPLIER_PREFIXES = ["P.BTY"] as const;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

let cachedStockData: { data: StockBeautyData; timestamp: number } | null = null;
let inflightPromise: Promise<StockBeautyData> | null = null;

const extractCategoryName = (categId: unknown): string => {
    if (Array.isArray(categId) && categId.length > 1) {
        const fullName = categId[1] as string;
        const segments = fullName.split(" / ");
        return segments[segments.length - 1];
    }
    return "Non classé";
};

const extractOrderId = (orderId: unknown): number | null => {
    if (Array.isArray(orderId) && typeof orderId[0] === "number") return orderId[0];
    if (typeof orderId === "number") return orderId;
    return null;
};

const extractOrderName = (orderId: unknown): string | null => {
    if (Array.isArray(orderId) && typeof orderId[1] === "string") return orderId[1];
    return null;
};

const extractSupplierName = (partnerId: unknown): string =>
    Array.isArray(partnerId) && typeof partnerId[1] === "string"
        ? partnerId[1]
        : "Non défini";

const isAllowedSupplier = (partnerId: unknown): boolean => {
    if (!Array.isArray(partnerId) || typeof partnerId[1] !== "string") return false;
    const name = (partnerId[1] as string).toUpperCase();
    return ALLOWED_SUPPLIER_PREFIXES.some((prefix) => name.startsWith(prefix));
};

async function getProducts(): Promise<OdooProductTemplate[]> {
    const pageSize = 1000;
    let offset = 0;
    let allProducts: OdooProductTemplate[] = [];
    while (true) {
        const batch = await safeSearchRead<OdooProductTemplate>(
            "product.template",
            {
                domain: [
                    ["x_studio_segment", "ilike", "beauty"],
                    ["categ_id", "not ilike", "make-up"],
                    ["active", "=", true],
                    ["available_in_pos", "=", true],
                ],
                fields: [
                    "id",
                    "name",
                    "list_price",
                    "categ_id",
                    "hs_code",
                    "product_variant_id",
                    "x_studio_many2one_field_21bvh",
                    "x_studio_many2one_field_QyelN",
                    "x_studio_many2one_field_Arl5D",
                    "description_pickingin",
                ],
                limit: pageSize,
                offset,
                order: "id desc",
            },
        );
        allProducts = allProducts.concat(batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
        await new Promise((r) => setTimeout(r, 300));
    }
    return allProducts;
}

async function getStockQuantsForProducts(
    productIds: number[],
    locationIds: number[],
): Promise<{ records: StockQuant[]; success: boolean }> {
    if (productIds.length === 0 || locationIds.length === 0) {
        return { records: [], success: true };
    }
    try {
        const BATCH_SIZE = 1000;
        const batches: number[][] = [];
        for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
            batches.push(productIds.slice(i, i + BATCH_SIZE));
        }

        const allResults = await processBatchesSequentially(
            batches,
            async (batch) => {
                return await safeSearchRead<StockQuant>("stock.quant", {
                    domain: [
                        ["product_id", "in", batch],
                        ["location_id", "in", locationIds],
                    ],
                    fields: "id,product_id,location_id,quantity".split(","),
                });
            },
        );

        return { success: true, records: allResults.flat() };
    } catch (error) {
        console.error("❌ stock.quant fetch error:", error);
        return { records: [], success: false };
    }
}

async function getPurchaseOrderLines(): Promise<any[]> {
    const res = await safeSearchRead("purchase.order.line", {
        domain: [
            ["partner_id", "not ilike", "pb - bc"],
            ["partner_id", "not ilike", "pb - 24"],
            ["partner_id", "not ilike", "pb - mto"],
            ["partner_id", "not ilike", "pb - lmb"],
            ["partner_id", "not ilike", "pb - ktm"],
            ["partner_id", "not in", [24099, 23705, 1, 23706, 23707, 23708, 27862]],
        ],
        fields: [
            "id",
            "product_id",
            "product_qty",
            "qty_received",
            "price_unit",
            "order_id",
            "partner_id",
        ],
    });

    // ✅ Filtre strict : on ne conserve QUE les lignes des fournisseurs autorisés
    return (res as any[]).filter((line) => isAllowedSupplier(line.partner_id));
}

/**
 * Récupère la date de référence de chaque PO (pour l'attribution temporelle des ventes).
 * On privilégie effective_date (réception réelle) → date_approve → date_order.
 */
async function getPurchaseOrdersReferenceDates(
    poIds: number[],
): Promise<Map<number, Date>> {
    const map = new Map<number, Date>();
    if (poIds.length === 0) return map;

    try {
        const BATCH_SIZE = 500;
        const batches: number[][] = [];
        for (let i = 0; i < poIds.length; i += BATCH_SIZE) {
            batches.push(poIds.slice(i, i + BATCH_SIZE));
        }

        const results = await processBatchesSequentially(
            batches,
            async (batch) => {
                return await safeSearchRead("purchase.order", {
                    domain: [["id", "in", batch]],
                    fields: [
                        "id",
                        "date_order",
                        "date_approve",
                        "effective_date",
                    ],
                });
            },
        );

        results.flat().forEach((po: any) => {
            const refDate =
                po.effective_date || po.date_approve || po.date_order;
            if (po.id && refDate) {
                map.set(po.id, new Date(refDate));
            }
        });
    } catch (error) {
        // Si effective_date n'existe pas dans cette instance Odoo, on retombe
        // sur date_approve / date_order uniquement.
        console.warn(
            "⚠️ purchase.order reference dates (fallback sans effective_date):",
            error,
        );
        try {
            const BATCH_SIZE = 500;
            const batches: number[][] = [];
            for (let i = 0; i < poIds.length; i += BATCH_SIZE) {
                batches.push(poIds.slice(i, i + BATCH_SIZE));
            }
            const results = await processBatchesSequentially(
                batches,
                async (batch) => {
                    return await safeSearchRead("purchase.order", {
                        domain: [["id", "in", batch]],
                        fields: ["id", "date_order", "date_approve"],
                    });
                },
            );
            results.flat().forEach((po: any) => {
                const refDate = po.date_approve || po.date_order;
                if (po.id && refDate) map.set(po.id, new Date(refDate));
            });
        } catch (error2) {
            console.error(
                "❌ purchase.order reference dates fetch error:",
                error2,
            );
        }
    }

    return map;
}

async function getPOSOrderLines(productIds: number[]): Promise<POSOrderLine[]> {
    if (productIds.length === 0) return [];
    try {
        const BATCH_SIZE = 500;
        const batches: number[][] = [];
        for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
            batches.push(productIds.slice(i, i + BATCH_SIZE));
        }

        const allResults = await processBatchesSequentially(
            batches,
            async (batch) => {
                return (await safeSearchRead("pos.order.line", {
                    domain: [["product_id", "in", batch]],
                    fields: ["id", "qty", "product_id", "create_date"],
                })) as POSOrderLine[];
            },
        );

        return allResults.flat();
    } catch (error) {
        console.error("❌ pos.order.line fetch error:", error);
        return [];
    }
}

export async function fetchAndProcessStockData(): Promise<StockBeautyData> {
    const now = Date.now();
    if (cachedStockData && now - cachedStockData.timestamp < STOCK_CACHE_TTL_MS) {
        return cachedStockData.data;
    }
    if (inflightPromise) return inflightPromise;

    inflightPromise = (async () => {
        try {
            const locationConfig = await getShopLocations();
            const shopLocationIds = locationConfig.locations.map(
                (l) => l.odooLocationId,
            );

            const products = await getProducts();
            const categoryMap = new Map<number, string>();
            products.forEach((p) =>
                categoryMap.set(p.id, extractCategoryName(p.categ_id)),
            );

            const allProductIds = products
                .map((p) => p.product_variant_id?.[0])
                .filter((id): id is number => id !== undefined);
            const productsData = products.map((p) => mapOdooProductLocal(p));

            const purchaseOrderLines = await getPurchaseOrderLines();
            const posOrderLines = await getPOSOrderLines(allProductIds);
            const stockQuants = await getStockQuantsForProducts(
                allProductIds,
                shopLocationIds,
            );

            // ✅ 1) Récupérer les dates de référence des POs autorisés
            const uniquePoIds = new Set<number>();
            purchaseOrderLines.forEach((line: any) => {
                const id = extractOrderId(line.order_id);
                if (id) uniquePoIds.add(id);
            });
            const poReferenceDates = await getPurchaseOrdersReferenceDates(
                Array.from(uniquePoIds),
            );

            // ✅ 2) Index des ventes par variante pour attribution par PO
            const posLinesByProduct = new Map<number, POSOrderLine[]>();
            posOrderLines.forEach((line) => {
                const pid = line.product_id?.[0];
                if (!pid) return;
                if (!posLinesByProduct.has(pid)) posLinesByProduct.set(pid, []);
                posLinesByProduct.get(pid)!.push(line);
            });

            const thirtyDaysAgo = new Date(now - THIRTY_DAYS_MS);

            const computeSalesForProductSince = (
                productVariantId: number,
                sinceDate: Date,
            ): { total: number; last30d: number; lastSaleDate?: Date } => {
                const lines = posLinesByProduct.get(productVariantId) ?? [];
                let total = 0;
                let last30d = 0;
                let lastSaleDate: Date | undefined;
                const last30dStart =
                    sinceDate > thirtyDaysAgo ? sinceDate : thirtyDaysAgo;

                for (const line of lines) {
                    const d = new Date(line.create_date);
                    if (d < sinceDate) continue;
                    const qty = line.qty || 0;
                    total += qty;
                    if (d >= last30dStart) last30d += qty;
                    if (!lastSaleDate || d > lastSaleDate) lastSaleDate = d;
                }
                return { total, last30d, lastSaleDate };
            };

            const salesLast30Days = calculateSalesLast30Days(
                posOrderLines,
                allProductIds,
            );
            const lastSaleDates = calculateLastSaleDate(
                posOrderLines,
                allProductIds,
            );

            const stockByProduct = new Map<number, Record<string, number>>();
            allProductIds.forEach((pid) => stockByProduct.set(pid, {}));

            stockQuants.records.forEach((quant) => {
                const productId = quant.product_id[0];
                const locationId = quant.location_id[0];
                const shopName = locationConfig.byOdooId.get(locationId);
                if (!shopName) return;
                const bucket = stockByProduct.get(productId) ?? {};
                bucket[shopName] = (bucket[shopName] ?? 0) + quant.quantity;
                stockByProduct.set(productId, bucket);
            });

            const purchaseOrderMap = new Map<number, string>();
            purchaseOrderLines.forEach((line: any) => {
                const id = extractOrderId(line.order_id);
                const name = extractOrderName(line.order_id);
                if (id && name) purchaseOrderMap.set(id, name);
            });

            const groupedData: StockBeautyModel[] = [];
            const groupedMap = new Map<string, Product[]>();
            const brandsSet = new Set<string>();
            const colorsSet = new Set<string>();
            const categoriesSet = new Set<string>();
            const suppliersSet = new Set<string>();

            productsData.forEach((product) => {
                const key = product.hs_code || "UNKNOWN";
                if (!groupedMap.has(key)) groupedMap.set(key, []);
                groupedMap.get(key)!.push(product);
                brandsSet.add(extractBrandFromProduct(product));
                colorsSet.add(extractColorFromProduct(product));
                categoriesSet.add(categoryMap.get(product.id) || "Non classé");
            });

            groupedMap.forEach((productsGroup, hs_code) => {
                const firstProduct = productsGroup[0];
                const cleanName = firstProduct.name.split("[")[0].trim();
                const brand = extractBrandFromProduct(firstProduct);
                const color = extractColorFromProduct(firstProduct);
                const name = `${cleanName} - ${hs_code} - (${firstProduct.listPrice}$)`;
                const category = categoryMap.get(firstProduct.id) || "Non classé";

                const relatedLines = purchaseOrderLines.filter(
                    (line: PurchaseOrderLine) =>
                        line.product_id &&
                        productsGroup.some(
                            (p) => p.productVariantId === line.product_id[0],
                        ),
                );

                let supplierName = "Non défini";
                const lineWithSupplier = relatedLines.find(
                    (l: any) => l.partner_id && Array.isArray(l.partner_id),
                );
                if (lineWithSupplier) supplierName = lineWithSupplier.partner_id[1];
                suppliersSet.add(supplierName);

                // ✅ Breakdown par PO au niveau groupe + ventes attribuées
                const purchaseOrderBreakdown: Record<number, PurchaseOrderInfo> = {};
                const countedVariantsPerPO = new Map<number, Set<number>>();
                const lastSaleDatesByPO = new Map<number, Date>();

                relatedLines.forEach((line: any) => {
                    const orderId = extractOrderId(line.order_id);
                    if (!orderId) return;
                    if (!purchaseOrderBreakdown[orderId]) {
                        const refDate = poReferenceDates.get(orderId);
                        purchaseOrderBreakdown[orderId] = {
                            ordered: 0,
                            received: 0,
                            supplier: extractSupplierName(line.partner_id),
                            referenceDate: refDate?.toISOString(),
                            qty_sold: 0,
                            sales_last_30_days: 0,
                        };
                        countedVariantsPerPO.set(orderId, new Set());
                    }
                    purchaseOrderBreakdown[orderId].ordered += line.product_qty || 0;
                    purchaseOrderBreakdown[orderId].received +=
                        line.qty_received || 0;

                    const variantId = line.product_id?.[0] as number | undefined;
                    const refDate = poReferenceDates.get(orderId);
                    if (
                        refDate &&
                        variantId &&
                        !countedVariantsPerPO.get(orderId)!.has(variantId)
                    ) {
                        countedVariantsPerPO.get(orderId)!.add(variantId);
                        const sales = computeSalesForProductSince(
                            variantId,
                            refDate,
                        );
                        purchaseOrderBreakdown[orderId].qty_sold += sales.total;
                        purchaseOrderBreakdown[orderId].sales_last_30_days +=
                            sales.last30d;
                        if (sales.lastSaleDate) {
                            const existing = lastSaleDatesByPO.get(orderId);
                            if (!existing || sales.lastSaleDate > existing) {
                                lastSaleDatesByPO.set(orderId, sales.lastSaleDate);
                            }
                        }
                    }
                });

                lastSaleDatesByPO.forEach((date, orderId) => {
                    purchaseOrderBreakdown[orderId].last_sale_date =
                        date.toISOString();
                });

                const purchaseOrderIds = Object.keys(purchaseOrderBreakdown).map(Number);

                const product_qty = relatedLines.reduce(
                    (sum: number, line: PurchaseOrderLine) =>
                        sum + (line.product_qty || 0),
                    0,
                );
                const qty_received = relatedLines.reduce(
                    (sum: number, line: PurchaseOrderLine) =>
                        sum + (line.qty_received || 0),
                    0,
                );
                const not_received = product_qty - qty_received;

                const relatedPosLines = posOrderLines.filter(
                    (line) =>
                        line.product_id &&
                        productsGroup.some(
                            (p) => p.productVariantId === line.product_id[0],
                        ),
                );
                const qty_sold = relatedPosLines.reduce(
                    (sum, line) => sum + (line.qty || 0),
                    0,
                );

                const groupStockByShop: Record<string, number> = {};
                const individualProducts: IndividualProductModel[] =
                    productsGroup.map((product) => {
                        const productStock =
                            stockByProduct.get(product.productVariantId!) ?? {};

                        Object.keys(productStock).forEach((shop) => {
                            groupStockByShop[shop] =
                                (groupStockByShop[shop] ?? 0) +
                                productStock[shop];
                        });

                        const total_stock = Object.values(productStock).reduce(
                            (sum, v) => sum + v,
                            0,
                        );

                        // ✅ Breakdown par PO au niveau variante + ventes attribuées
                        const productLines = relatedLines.filter(
                            (line: any) =>
                                line.product_id?.[0] === product.productVariantId,
                        );
                        const productPOBreakdown: Record<number, PurchaseOrderInfo> = {};
                        productLines.forEach((line: any) => {
                            const orderId = extractOrderId(line.order_id);
                            if (!orderId) return;
                            if (!productPOBreakdown[orderId]) {
                                const refDate = poReferenceDates.get(orderId);
                                productPOBreakdown[orderId] = {
                                    ordered: 0,
                                    received: 0,
                                    supplier: extractSupplierName(line.partner_id),
                                    referenceDate: refDate?.toISOString(),
                                    qty_sold: 0,
                                    sales_last_30_days: 0,
                                };
                            }
                            productPOBreakdown[orderId].ordered +=
                                line.product_qty || 0;
                            productPOBreakdown[orderId].received +=
                                line.qty_received || 0;
                        });

                        // Ventes attribuées (une seule fois par PO, pas par ligne)
                        Object.keys(productPOBreakdown).forEach((k) => {
                            const orderId = Number(k);
                            const refDate = poReferenceDates.get(orderId);
                            if (!refDate) return;
                            const sales = computeSalesForProductSince(
                                product.productVariantId!,
                                refDate,
                            );
                            productPOBreakdown[orderId].qty_sold = sales.total;
                            productPOBreakdown[orderId].sales_last_30_days =
                                sales.last30d;
                            if (sales.lastSaleDate) {
                                productPOBreakdown[orderId].last_sale_date =
                                    sales.lastSaleDate.toISOString();
                            }
                        });

                        return {
                            id: product.id,
                            name: product.name,
                            productVariantId: product.productVariantId!,
                            listPrice: product.listPrice,
                            brand: extractBrandFromProduct(product),
                            color: extractColorFromProduct(product),
                            category: categoryMap.get(product.id) || "Non classé",
                            stockByShop: productStock,
                            total_stock,
                            sales_last_30_days:
                                salesLast30Days.get(product.productVariantId!) || 0,
                            last_sale_date: lastSaleDates
                                .get(product.productVariantId!)
                                ?.toISOString(),
                            parent_hs_code: hs_code,
                            purchaseOrderIds: Object.keys(productPOBreakdown).map(Number),
                            purchaseOrderBreakdown: productPOBreakdown,
                        };
                    });

                const total_stock = Object.values(groupStockByShop).reduce(
                    (sum, v) => sum + v,
                    0,
                );

                const sales30Days = productsGroup.reduce(
                    (total, product) =>
                        total + (salesLast30Days.get(product.productVariantId!) || 0),
                    0,
                );

                let lastSaleDate: Date | null = null;
                for (const p of productsGroup) {
                    const d = lastSaleDates.get(p.productVariantId!);
                    if (d && (!lastSaleDate || d > lastSaleDate)) {
                        lastSaleDate = d;
                    }
                }

                const replenishmentMetrics = calculateReplenishmentMetrics(
                    total_stock,
                    sales30Days,
                );

                groupedData.push({
                    hs_code,
                    name,
                    brand,
                    color,
                    supplier: supplierName,
                    category,
                    product_qty,
                    qty_received,
                    not_received,
                    qty_sold,
                    qty_available: total_stock,
                    stockByShop: groupStockByShop,
                    total_stock,
                    sales_last_30_days: sales30Days,
                    daily_sales_rate: replenishmentMetrics.dailySalesRate,
                    days_until_out_of_stock:
                        replenishmentMetrics.daysUntilOutOfStock,
                    estimated_out_of_stock_date:
                        replenishmentMetrics.estimatedOutOfStockDate?.toISOString(),
                    recommended_reorder_date:
                        replenishmentMetrics.recommendedReorderDate?.toISOString(),
                    last_sale_date: lastSaleDate?.toISOString(),
                    individualProducts,
                    purchaseOrderIds,
                    purchaseOrderBreakdown,
                });
            });

            const purchaseOrders: PurchaseOrderOption[] = Array.from(
                purchaseOrderMap.entries(),
            )
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => b.id - a.id);

            const data: StockBeautyData = {
                data: groupedData,
                brands: Array.from(brandsSet).sort(),
                colors: Array.from(colorsSet).sort(),
                categories: Array.from(categoriesSet).sort(),
                suppliers: Array.from(suppliersSet).filter(Boolean).sort(),
                shops: locationConfig.names,
                purchaseOrders,
            };

            cachedStockData = { data, timestamp: Date.now() };
            return data;
        } finally {
            inflightPromise = null;
        }
    })();

    return inflightPromise;
}

// Local product mapper (évite import circulaire si besoin)
function mapOdooProductLocal(p: OdooProductTemplate): Product {
    return {
        id: p.id,
        name: p.name,
        listPrice: p.list_price,
        categoryId: p.categ_id?.[0] ?? 0,
        categoryName: p.categ_id?.[1] ?? "",
        hs_code: p.hs_code ?? "",
        productVariantId: p.product_variant_id?.[0],
        taille: p.x_studio_many2one_field_QyelN?.[1],
        couleur: p.x_studio_many2one_field_Arl5D?.[1],
        marque: p.x_studio_many2one_field_21bvh?.[1],
    };
}