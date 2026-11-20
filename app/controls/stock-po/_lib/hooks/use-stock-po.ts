"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseStockPoFilters, serializeStockPoFilters } from "../filters";
import type { StockPoReportData } from "../types";

export function useStockPo(options?: {
    initialData?: StockPoReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const searchParams = useSearchParams();

    const filters = useMemo(
        () => parseStockPoFilters(Object.fromEntries(searchParams.entries())),
        [searchParams],
    );

    const queryString = useMemo(
        () => serializeStockPoFilters(filters).toString(),
        [filters],
    );

    const matchesInitial =
        options?.initialData !== undefined &&
        options.initialQueryKeyString === queryString;

    const query = useQuery<StockPoReportData>({
        queryKey: ["controls-stock-po", queryString],
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/controls/stock-po?${queryString}`, { signal });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Impossible de charger les Stock PO");
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