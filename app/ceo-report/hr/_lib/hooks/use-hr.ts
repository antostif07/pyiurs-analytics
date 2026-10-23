// app/ceo-report/hr/_lib/hooks/use-hr.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { HrResponse } from "../types";

export function useHr() {
    return useQuery<HrResponse>({
        queryKey: ["ceo-report-hr"],
        queryFn: async ({ signal }) => {
            const res = await fetch("/api/ceo-report/hr", { signal });
            if (!res.ok) {
                throw new Error(
                    "Impossible de charger les données RH & Baux",
                );
            }
            return res.json();
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}