// app/inventory/stock-beauty/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { canAccessStockSegment } from "@/lib/auth/roles";

import StockBeautyClient from "./stock-beauty-client";
import { fetchAndProcessStockData } from "./_lib/data";
import type { FilterState, StockBeautyModel, StockLevels } from "./_lib/types";
import { calculateReplenishmentMetrics } from "@/app/utils/stockCalculations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Suivi Stock Beauty",
    description: "Suivi du stock et des mouvements du segment Beauty par boutique.",
};

interface PageProps {
    searchParams: Promise<{
        brand?: string;
        color?: string;
        category?: string;
        supplier?: string;
        stock?: string;
        po?: string;
    }>;
}

function applyStockFilter(data: StockBeautyModel[], stock: string): StockBeautyModel[] {
    switch (stock) {
        case "out_of_stock":
            return data.filter((item) => item.qty_available <= 0);
        case "critical":
            return data.filter((item) => item.qty_available >= 1 && item.qty_available <= 5);
        case "low":
            return data.filter((item) => item.qty_available >= 6 && item.qty_available <= 11);
        case "good":
            return data.filter((item) => item.qty_available >= 12);
        case "over_5":
            return data.filter((item) => item.qty_available > 5);
        case "over_10":
            return data.filter((item) => item.qty_available > 10);
        case "over_20":
            return data.filter((item) => item.qty_available > 20);
        default:
            return data;
    }
}

function applyPurchaseOrderFilter(
    data: StockBeautyModel[],
    poId: number,
): StockBeautyModel[] {
    return data
        .filter((item) => item.purchaseOrderIds.includes(poId))
        .map((item) => {
            const bd = item.purchaseOrderBreakdown[poId];
            const ordered = bd?.ordered ?? 0;
            const received = bd?.received ?? 0;

            // ✅ Ventes attribuées à ce PO (depuis sa date de référence)
            const poQtySold = bd?.qty_sold ?? 0;
            const poSalesLast30Days = bd?.sales_last_30_days ?? 0;

            // ✅ Recalcul des métriques de réappro avec les ventes PO
            const replenishment = calculateReplenishmentMetrics(
                item.qty_available, // stock global (non attribuable)
                poSalesLast30Days,
            );

            return {
                ...item,
                supplier: bd?.supplier ?? item.supplier,
                product_qty: ordered,
                qty_received: received,
                not_received: ordered - received,

                qty_sold: poQtySold,
                sales_last_30_days: poSalesLast30Days,
                daily_sales_rate: replenishment.dailySalesRate,
                days_until_out_of_stock: replenishment.daysUntilOutOfStock,
                estimated_out_of_stock_date:
                    replenishment.estimatedOutOfStockDate?.toISOString(),
                recommended_reorder_date:
                    replenishment.recommendedReorderDate?.toISOString(),
                // undefined si aucune vente depuis la date de référence du PO
                last_sale_date: bd?.last_sale_date,

                individualProducts: item.individualProducts
                    .filter((p) => p.purchaseOrderIds.includes(poId))
                    .map((p) => {
                        const pbd = p.purchaseOrderBreakdown[poId];
                        return {
                            ...p,
                            sales_last_30_days: pbd?.sales_last_30_days ?? 0,
                            last_sale_date: pbd?.last_sale_date,
                        };
                    }),
            };
        });
}

export default async function StockBeautyPage({ searchParams }: PageProps) {
    const auth = await getServerAuth();
    if (!auth.profile || !canAccessStockSegment(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const params = await searchParams;
    const filterState: FilterState = {
        brand: params.brand,
        color: params.color,
        category: params.category,
        supplier: params.supplier,
        stock: params.stock,
        purchaseOrder: params.po,
    };

    const { data, brands, colors, categories, suppliers, shops, purchaseOrders } =
        await fetchAndProcessStockData();

    let filteredData = data;

    // 1) PO filter en premier (change l'agrégation)
    if (filterState.purchaseOrder && filterState.purchaseOrder !== "all") {
        const poId = Number(filterState.purchaseOrder);
        if (!Number.isNaN(poId)) {
            filteredData = applyPurchaseOrderFilter(filteredData, poId);
        }
    }

    // 2) filtres standards
    if (filterState.brand && filterState.brand !== "all") {
        filteredData = filteredData.filter((item) => item.brand === filterState.brand);
    }
    if (filterState.color && filterState.color !== "all") {
        filteredData = filteredData.filter((item) => item.color === filterState.color);
    }
    if (filterState.category && filterState.category !== "all") {
        filteredData = filteredData.filter((item) => item.category === filterState.category);
    }
    if (filterState.supplier && filterState.supplier !== "all") {
        filteredData = filteredData.filter((item) => item.supplier === filterState.supplier);
    }
    if (filterState.stock && filterState.stock !== "all") {
        filteredData = applyStockFilter(filteredData, filterState.stock);
    }

    const totals = {
        totalProducts: filteredData.length,
        totalAvailable: filteredData.reduce((s, i) => s + i.qty_available, 0),
        totalSold: filteredData.reduce((s, i) => s + i.qty_sold, 0),
    };

    const stockLevels: StockLevels = {
        outOfStock: filteredData.filter((i) => i.qty_available <= 0).length,
        critical: filteredData.filter((i) => i.qty_available >= 1 && i.qty_available <= 5).length,
        low: filteredData.filter((i) => i.qty_available >= 6 && i.qty_available <= 11).length,
        good: filteredData.filter((i) => i.qty_available >= 12).length,
    };

    return (
        <StockBeautyClient
            data={filteredData}
            brands={brands}
            colors={colors}
            categories={categories}
            suppliers={suppliers}
            shops={shops}
            purchaseOrders={purchaseOrders}
            totals={totals}
            stockLevels={stockLevels}
            filterState={filterState}
        />
    );
}