// app/finance/expenses/_lib/hooks/use-expenses.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
    parseExpensesFilters,
    serializeExpensesFilters,
} from "../filters";
import type { ExpensesReportData } from "../types";

export function useExpenses() {
    const searchParams = useSearchParams();
    const filters = parseExpensesFilters(
        Object.fromEntries(searchParams.entries()),
    );

    return useQuery<ExpensesReportData>({
        queryKey: ["finance-expenses", filters],
        queryFn: async ({ signal }) => {
            const params = serializeExpensesFilters(filters);
            const res = await fetch(
                `/api/finance/expenses?${params.toString()}`,
                { signal },
            );
            if (!res.ok) throw new Error("Impossible de récupérer les dépenses");
            return res.json();
        },
        staleTime: 2 * 60 * 1000, // 2 min
        refetchOnWindowFocus: false,
    });
}