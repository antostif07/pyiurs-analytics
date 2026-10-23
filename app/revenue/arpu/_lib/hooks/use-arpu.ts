"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
    parseArpuFilters,
    serializeArpuFilters,
} from "../filters";
import type { ArpuStatsData } from "../types";

export function useArpuData() {
    const searchParams = useSearchParams();
    const filters = parseArpuFilters(
        Object.fromEntries(searchParams.entries()),
    );

    return useQuery<ArpuStatsData>({
        queryKey: ["arpu-stats", filters],
        queryFn: async ({ signal }) => {
            const params = serializeArpuFilters(filters);
            const res = await fetch(
                `/api/revenue/arpu?${params.toString()}`,
                { signal },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(
                    body.error ?? "Impossible de charger les données ARPU",
                );
            }
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}