// app/ceo-report/stock/_lib/hooks/use-stock-kpis.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { StockKpisData } from "../types";

export function useStockKpis() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    return useQuery<StockKpisData>({
        queryKey: ["ceo-stock-kpis", from, to],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const res = await fetch(`/api/ceo-report/stock/kpis?${params.toString()}`, {
                signal,
            });

            if (!res.ok) {
                throw new Error("Impossible de récupérer les indicateurs de stock Odoo");
            }

            return res.json();
        },
        staleTime: 5 * 60 * 1000, // Données fraîches 5 minutes (évite de spammer Odoo)
        refetchOnWindowFocus: false,
    });
}