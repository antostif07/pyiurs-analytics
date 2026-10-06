// app/revenue/invoices-redsup/_lib/hooks/use-redsup-invoices.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
    parseRedsupFilters,
    serializeRedsupFilters,
} from "../filters";
import type { RedsupReportData } from "../types";

export function useRedsupInvoices() {
    const searchParams = useSearchParams();
    const filters = parseRedsupFilters(
        Object.fromEntries(searchParams.entries()),
    );

    return useQuery<RedsupReportData>({
        queryKey: ["revenue-redsup-invoices", filters],
        queryFn: async ({ signal }) => {
            const params = serializeRedsupFilters(filters);
            const res = await fetch(
                `/api/revenue/invoices-redsup?${params.toString()}`,
                { signal },
            );
            if (!res.ok) throw new Error("Impossible de récupérer les factures RedSup");
            return res.json();
        },
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}