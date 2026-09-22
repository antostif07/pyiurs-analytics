// app/ceo-report/sales/_lib/hooks/use-sales-matrix.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { SalesMatrixData } from "../_components/types";

export function useSalesMatrix() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    return useQuery<SalesMatrixData>({
        queryKey: ["ceo-sales-matrix", from, to],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const res = await fetch(`/api/ceo-report/sales/matrix?${params.toString()}`, {
                signal,
            });

            if (!res.ok) {
                const errorJson = await res.json().catch(() => ({}));
                throw new Error(errorJson.error || "Impossible de récupérer les ventes réelles Odoo");
            }

            return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes de fraîcheur en cache mémoire
        refetchOnWindowFocus: false,
    });
}