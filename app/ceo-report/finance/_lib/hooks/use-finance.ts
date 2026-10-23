// app/ceo-report/finance/_lib/hooks/use-finance.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { FinanceResponse } from "../types";

export function useFinance() {
    return useQuery<FinanceResponse>({
        queryKey: ["ceo-report-finance"],
        queryFn: async ({ signal }) => {
            const res = await fetch("/api/ceo-report/finance", { signal });
            if (!res.ok) {
                throw new Error(
                    "Impossible de charger les données d'audit comptable",
                );
            }
            return res.json();
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}