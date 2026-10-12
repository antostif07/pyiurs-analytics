// app/finance/loyalty/_lib/hooks/use-loyalty-today.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { LoyaltyReportData } from "../types";

export function useLoyaltyToday() {
    const searchParams = useSearchParams();
    const date = searchParams.get("date") ?? "";

    return useQuery<LoyaltyReportData>({
        queryKey: ["finance-loyalty", date],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (date) params.set("date", date);

            const res = await fetch(
                `/api/finance/loyalty?${params.toString()}`,
                { signal },
            );
            if (!res.ok) {
                throw new Error("Impossible de récupérer les factures du jour");
            }
            return res.json();
        },
        staleTime: 60 * 1000, // 1 min
        refetchOnWindowFocus: false,
    });
}