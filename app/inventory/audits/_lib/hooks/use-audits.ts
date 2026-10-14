// app/inventory/audits/_lib/hooks/use-audits.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
    parseAuditFilters,
    serializeAuditFilters,
} from "../filters";
import type { StockAudit } from "../types";

export function useAudits() {
    const searchParams = useSearchParams();
    const filters = parseAuditFilters(
        Object.fromEntries(searchParams.entries()),
    );

    return useQuery<{ audits: StockAudit[] }>({
        queryKey: ["inventory-audits", filters],
        queryFn: async ({ signal }) => {
            const qs = serializeAuditFilters(filters).toString();
            const res = await fetch(
                `/api/inventory/audits${qs ? `?${qs}` : ""}`,
                { signal },
            );
            if (!res.ok) throw new Error("Impossible de charger les audits");
            return res.json();
        },
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
    });
}