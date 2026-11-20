"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseRedsupFilters, serializeRedsupFilters } from "../filters";
import type { RedsupReportData } from "../types";

export function useRedsupInvoices(options?: {
    initialData?: RedsupReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const searchParams = useSearchParams();

    const filters = useMemo(
        () => parseRedsupFilters(Object.fromEntries(searchParams.entries())),
        [searchParams],
    );

    const queryString = useMemo(
        () => serializeRedsupFilters(filters).toString(),
        [filters],
    );

    const matchesInitial =
        options?.initialData !== undefined &&
        options.initialQueryKeyString === queryString;

    const query = useQuery<RedsupReportData>({
        queryKey: ["controls-redsup-invoices", queryString],
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/controls/validation-remise?${queryString}`, {
                signal,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Impossible de récupérer les remises RedSup");
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