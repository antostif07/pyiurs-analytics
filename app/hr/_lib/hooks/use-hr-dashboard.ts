"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
    parseHrDashboardFilters,
    serializeHrDashboardFilters,
} from "../filters";
import type { HrDashboardData } from "../server/hr-dashboard-service";

export function useHrDashboard(options?: {
    initialData?: HrDashboardData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const searchParams = useSearchParams();

    const filters = useMemo(
        () => parseHrDashboardFilters(Object.fromEntries(searchParams.entries())),
        [searchParams],
    );

    const queryString = useMemo(
        () => serializeHrDashboardFilters(filters).toString(),
        [filters],
    );

    const matchesInitial =
        options?.initialData !== undefined &&
        options.initialQueryKeyString === queryString;

    const query = useQuery<HrDashboardData>({
        queryKey: ["hr-dashboard", queryString],
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/hr/dashboard?${queryString}`, { signal });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Impossible de charger le tableau de bord RH");
            }
            return res.json();
        },
        initialData: matchesInitial ? options?.initialData : undefined,
        initialDataUpdatedAt: matchesInitial ? options?.initialFetchedAt : undefined,
        placeholderData: keepPreviousData,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return { ...query, filters };
}