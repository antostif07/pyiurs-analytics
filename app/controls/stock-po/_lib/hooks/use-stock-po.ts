"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseStockPoFilters, serializeStockPoFilters } from "../filters";
import type { StockPoReportData } from "../types";

export function useStockPo(options?: {
    mode?: "bty_fem" | "polog";
    initialData?: StockPoReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const mode = options?.mode ?? "bty_fem";
    const endpoint = mode === "polog" ? "/api/controls/stock-polog" : "/api/controls/stock-po";
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
        queryKey: ["controls-stock-po", mode, queryString],
        queryFn: async ({ signal }) => {
            const res = await fetch(`${endpoint}?${queryString}`, { signal });
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