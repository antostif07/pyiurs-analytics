// app/inventory/_lib/hooks/use-inventory-overview.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseInventoryFilters } from "../filters";
import type { InventoryOverviewData } from "../types";

export function useInventoryOverview() {
    const searchParams = useSearchParams();
    const filters = parseInventoryFilters(
        Object.fromEntries(searchParams.entries()),
    );

    return useQuery<InventoryOverviewData>({
        queryKey: [
            "inventory-overview",
            filters.companyId,
            filters.segment,
            filters.from,
            filters.to,
        ],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (filters.companyId !== null) {
                params.set("company", String(filters.companyId));
            }
            if (filters.segment !== "Tous") {
                params.set("segment", filters.segment);
            }
            params.set("from", filters.from);
            params.set("to", filters.to);

            const res = await fetch(
                `/api/inventory/overview?${params.toString()}`,
                { signal },
            );
            if (!res.ok) {
                throw new Error("Impossible de charger l'overview stock");
            }
            return res.json();
        },
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}