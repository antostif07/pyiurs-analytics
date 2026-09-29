// app/ceo-report/stock/_lib/hooks/use-stock-kpis.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseFilters, serializeFilters } from "../../../_lib/filters";
import type { StockKpisData } from "../types";

export function useStockKpis() {
    const searchParams = useSearchParams();
    const filters = parseFilters(Object.fromEntries(searchParams.entries()));

    return useQuery<StockKpisData>({
        // 🔑 queryKey = tous les filtres → refetch auto quand n'importe lequel change
        queryKey: ["ceo-stock-kpis", filters],
        queryFn: async ({ signal }) => {
            const params = serializeFilters(filters);
            const res = await fetch(
                `/api/ceo-report/stock/kpis?${params.toString()}`,
                { signal },
            );
            if (!res.ok) throw new Error("Impossible de récupérer les KPIs stock");
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}