// app/inventory/stock-beauty/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { canAccessStockSegment } from "@/lib/auth/roles";

import StockBeautyClient from "./stock-beauty-client";
import { fetchAndProcessStockData } from "./_lib/data";
import type {
    FilterState,
    StockBeautyModel,
    StockLevels,
} from "./_lib/types";

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
    };

    const { data, brands, colors, categories, suppliers, shops } =
        await fetchAndProcessStockData();

    let filteredData = data;
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
            totals={totals}
            stockLevels={stockLevels}
            filterState={filterState}
        />
    );
}