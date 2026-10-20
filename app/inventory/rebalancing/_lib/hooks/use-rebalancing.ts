// app/inventory/rebalancing/_lib/hooks/use-rebalancing.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { RebalancingResponse } from "../types";

export function useRebalancing(companyId: number | null) {
    return useQuery<RebalancingResponse>({
        queryKey: ["inventory-rebalancing", companyId],
        queryFn: async ({ signal }) => {
            if (companyId === null) {
                throw new Error("Company requise");
            }
            const res = await fetch(
                `/api/inventory/rebalancing?company=${companyId}`,
                { signal },
            );
            if (!res.ok) {
                throw new Error(
                    "Impossible de charger les déséquilibres",
                );
            }
            return res.json();
        },
        enabled: companyId !== null,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}