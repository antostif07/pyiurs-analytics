// app/inventory/_lib/hooks/use-inventory-items.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseInventoryFilters } from "../filters";
import type { InventoryItemsResponse } from "../types";

export function useInventoryItems() {
    const searchParams = useSearchParams();
    const filters = parseInventoryFilters(
        Object.fromEntries(searchParams.entries()),
    );

    const page = searchParams.get("page") ?? "1";
    const pageSize = searchParams.get("pageSize") ?? "25";
    const sort = searchParams.get("sort") ?? "saleValue_desc";

    return useQuery<InventoryItemsResponse>({
        queryKey: [
            "inventory-items",
            filters.companyId,
            filters.segment,
            filters.search,
            page,
            pageSize,
            sort,
        ],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (filters.companyId !== null) {
                params.set("company", String(filters.companyId));
            }
            if (filters.segment !== "Tous") {
                params.set("segment", filters.segment);
            }
            if (filters.search) params.set("search", filters.search);
            params.set("page", page);
            params.set("pageSize", pageSize);
            params.set("sort", sort);

            const res = await fetch(
                `/api/inventory/items?${params.toString()}`,
                { signal },
            );
            if (!res.ok) {
                throw new Error("Impossible de charger les articles");
            }
            return res.json();
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}