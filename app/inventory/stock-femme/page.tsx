// app/inventory/stock-femme/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { canAccessStockSegment } from "@/lib/auth/roles";

import StockFemmeClient from "./stock-femme-client";
import { getData } from "./_lib/data";
import type {
    ControlStockFemmeModel,
    FilterState,
    StockFemmeTotals,
    StockLevels,
} from "./_lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Suivi Stock Femme",
    description:
        "Suivi du stock et des mouvements du segment Femme par boutique.",
};

interface PageProps {
    searchParams: Promise<{
        brand?: string;
        color?: string;
        stock?: string;
        start_date?: string;
        end_date?: string;
        purchase_order?: string;
        partner?: string;
    }>;
}

function applyStockFilter(
    data: ControlStockFemmeModel[],
    stock: string,
): ControlStockFemmeModel[] {
    switch (stock) {
        case "out_of_stock":
            return data.filter((item) => item.qty_available <= 0);
        case "critical":
            return data.filter(
                (item) => item.qty_available >= 1 && item.qty_available <= 5,
            );
        case "low":
            return data.filter(
                (item) => item.qty_available >= 6 && item.qty_available <= 11,
            );
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

export default async function StockFemmePage({ searchParams }: PageProps) {
    // Garde serveur spécifique au segment
    const auth = await getServerAuth();
    if (!auth.profile || !canAccessStockSegment(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const params = await searchParams;
    const filterState: FilterState = {
        brand: params.brand,
        color: params.color,
        stock: params.stock,
        partner: params.partner,
        purchase_order: params.purchase_order,
        start_date: params.start_date,
        end_date: params.end_date,
    };

    const { data, brands, colors, partners, orderNames, shops } = await getData(
        filterState.start_date,
        filterState.end_date,
        filterState.partner,
        filterState.purchase_order,
    );

    // Filtres client (brand / color / stock)
    let filteredData = data;
    if (filterState.brand && filterState.brand !== "all") {
        filteredData = filteredData.filter(
            (item) => item.brand === filterState.brand,
        );
    }
    if (filterState.color && filterState.color !== "all") {
        filteredData = filteredData.filter(
            (item) => item.color === filterState.color,
        );
    }
    if (filterState.stock && filterState.stock !== "all") {
        filteredData = applyStockFilter(filteredData, filterState.stock);
    }

    const totals: StockFemmeTotals = {
        totalProducts: filteredData.length,
        totalAvailable: filteredData.reduce(
            (sum, item) => sum + item.qty_available,
            0,
        ),
        totalSold: filteredData.reduce((sum, item) => sum + item.qty_sold, 0),
    };

    const stockLevels: StockLevels = {
        outOfStock: filteredData.filter((item) => item.qty_available <= 0)
            .length,
        critical: filteredData.filter(
            (item) => item.qty_available >= 1 && item.qty_available <= 5,
        ).length,
        low: filteredData.filter(
            (item) => item.qty_available >= 6 && item.qty_available <= 11,
        ).length,
        good: filteredData.filter((item) => item.qty_available >= 12).length,
    };

    return (
        <StockFemmeClient
            data={filteredData}
            brands={brands}
            colors={colors}
            partners={partners}
            orderNames={orderNames}
            shops={shops} // ← extrait de getData
            totals={totals}
            stockLevels={stockLevels}
            filterState={filterState}
        />
    );
}