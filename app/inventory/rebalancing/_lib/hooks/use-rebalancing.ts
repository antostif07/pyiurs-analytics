// app/inventory/rebalancing/_lib/hooks/use-rebalancing.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { RebalancingResponse } from "../types";

export function useRebalancing(shopId: string | null) {
    return useQuery<RebalancingResponse>({
        queryKey: ["inventory-rebalancing", shopId],
        queryFn: async ({ signal }) => {
            if (shopId === null) {
                throw new Error("Shop requise");
            }
            const res = await fetch(
                `/api/inventory/rebalancing?shop=${encodeURIComponent(shopId)}`,
                { signal },
            );
            if (!res.ok) {
                throw new Error(
                    "Impossible de charger les déséquilibres",
                );
            }
            return res.json();
        },
        enabled: shopId !== null,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}