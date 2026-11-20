"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseBeautyFilters, serializeBeautyFilters } from "../filters";
import type { BeautyBrandsReportData } from "../types";

export function useBeautyBrands(options?: {
    initialData?: BeautyBrandsReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const searchParams = useSearchParams();

    const filters = useMemo(
        () => parseBeautyFilters(Object.fromEntries(searchParams.entries())),
        [searchParams],
    );

    const queryString = useMemo(
        () => serializeBeautyFilters(filters).toString(),
        [filters],
    );

    const matchesInitial =
        options?.initialData !== undefined &&
        options.initialQueryKeyString === queryString;

    const query = useQuery<BeautyBrandsReportData>({
        queryKey: ["revenue-beauty-brands", queryString],
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/revenue/beauty-brands?${queryString}`, {
                signal,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Impossible de récupérer les ventes Beauty");
            }
            return res.json();
        },
        initialData: matchesInitial ? options?.initialData : undefined,
        initialDataUpdatedAt: matchesInitial ? options?.initialFetchedAt : undefined,
        placeholderData: keepPreviousData,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return { ...query, filters };
}