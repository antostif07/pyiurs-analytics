// app/finance/cash-flow/_lib/hooks/use-cashflow.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { CashflowReportData } from "../types";

export function useCashflow() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";

    return useQuery<CashflowReportData>({
        queryKey: ["finance-cashflow", from, to],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const res = await fetch(
                `/api/finance/cashflow?${params.toString()}`,
                { signal },
            );
            if (!res.ok) throw new Error("Impossible de charger le cashflow");
            return res.json();
        },
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}