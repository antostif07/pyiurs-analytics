// app/ceo-report/operations/transfers/_lib/hooks/use-transfers.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseFilters, serializeFilters } from "../../../../_lib/filters";
import type { TransfersReportData } from "../types";

/**
 * Charge le rapport complet des transferts :
 *  - KPIs (validés, valeur, conformité signature, alerte code-barres)
 *  - Tableau des transferts
 *  - Données du graphique par destination
 *
 * Le `queryKey` inclut **tous les filtres** → un changement de filtre
 * (période, boutique, segment…) déclenche automatiquement un refetch.
 */
export function useTransfers() {
    const searchParams = useSearchParams();
    const filters = parseFilters(Object.fromEntries(searchParams.entries()));

    return useQuery<TransfersReportData>({
        queryKey: ["ceo-transfers", filters],
        queryFn: async ({ signal }) => {
            const params = serializeFilters(filters);
            const res = await fetch(
                `/api/ceo-report/operations/transfers?${params.toString()}`,
                { signal },
            );
            if (!res.ok) {
                throw new Error("Impossible de récupérer les transferts");
            }
            return res.json();
        },
        staleTime: 5 * 60 * 1000, // 5 min — évite de spammer Odoo
        refetchOnWindowFocus: false,
    });
}