// app/inventory/stock-beauty/_lib/data.ts
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import {
    extractBrandFromProduct,
    extractColorFromProduct,
} from "@/lib/utils";
import type {
    IndividualProductModel,
    StockBeautyData,
    StockBeautyModel,
} from "./types";
import { OdooProductTemplate, Product } from "@/app/types/product_template";
import { getShopLocations } from "../../_lib/locations";
import { calculateLastSaleDate, calculateReplenishmentMetrics, calculateSalesLast30Days } from "@/app/utils/stockCalculations";
import { PurchaseOrderLine } from "@/app/types/purchase";
import { POSOrderLine } from "@/app/types/pos";
import { StockQuant } from "@/app/types/stock";
import { processBatchesSequentially, safeSearchRead } from "@/lib/odoo/odoo-safe";

const STOCK_CACHE_TTL_MS = 5 * 60 * 1000;
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
        await new Promise((r) => setTimeout(r, 300)); // petit délai entre pages
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

async function getPurchaseOrderLines() {
    const res = await safeSearchRead("purchase.order.line", {
        domain: [
            ["partner_id", "not ilike", "pb - bc"],
            ["partner_id", "not ilike", "pb - 24"],
            ["partner_id", "not ilike", "pb - mto"],
            ["partner_id", "not ilike", "pb - lmb"],
            ["partner_id", "not ilike", "pb - ktm"],
            [
                "partner_id",
                "not in",
                [24099, 23705, 1, 23706, 23707, 23708, 27862],
            ],
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
    return res as any[];
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
                if (lineWithSupplier)
                    supplierName = lineWithSupplier.partner_id[1];
                suppliersSet.add(supplierName);

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
                                salesLast30Days.get(product.productVariantId!) ||
                                0,
                            last_sale_date: lastSaleDates
                                .get(product.productVariantId!)
                                ?.toISOString(),
                            parent_hs_code: hs_code,
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

                // ✅ fix TS: for...of au lieu de forEach
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
                });
            });

            const data: StockBeautyData = {
                data: groupedData,
                brands: Array.from(brandsSet).sort(),
                colors: Array.from(colorsSet).sort(),
                categories: Array.from(categoriesSet).sort(),
                suppliers: Array.from(suppliersSet).filter(Boolean).sort(),
                shops: locationConfig.names,
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