"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseClotureFilters, serializeClotureFilters } from "../filters";
import type { DailyClosingReport } from "../types";

export function useClotureVente(options?: {
    initialData?: DailyClosingReport;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const searchParams = useSearchParams();

    const filters = useMemo(
        () => parseClotureFilters(Object.fromEntries(searchParams.entries())),
        [searchParams],
    );

    const queryString = useMemo(
        () => serializeClotureFilters(filters).toString(),
        [filters],
    );

    const matchesInitial =
        options?.initialData !== undefined &&
        options.initialQueryKeyString === queryString;

    const query = useQuery<DailyClosingReport>({
        queryKey: ["revenue-cloture-vente", queryString],
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/revenue/cloture-vente?${queryString}`, {
                signal,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Impossible de charger la clôture");
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