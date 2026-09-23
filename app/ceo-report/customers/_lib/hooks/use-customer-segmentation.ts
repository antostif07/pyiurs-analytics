// app/ceo-report/customers/_lib/hooks/use-customer-segmentation.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { CustomerSegmentRow } from "@/app/ceo-report/customers/_components/customer-matrix-table";

export interface CustomerKpisSummary {
    parcTotal: number;
    parcActif: number;
    grossAdds: number;
    churn30d: number;
    arpuGlobal: number;
    arpuActif: number;
}

export interface CustomerSegmentationResponse {
    kpis: CustomerKpisSummary; // ✅ Ajout des métriques des 2 parcs et des 2 ARPUs
    rows: CustomerSegmentRow[];
    totals: {
        segment: string;
        totalCustomers: number;
        grossAdds: number;
        churn30d: number;
        acqRevenue: number;
        recRevenue: number;
        arpu: number;
    };
}

export function useCustomerSegmentation() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    return useQuery<CustomerSegmentationResponse>({
        queryKey: ["ceo-customers-segmentation", from, to],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const res = await fetch(`/api/ceo-report/customers/segmentation?${params.toString()}`, {
                signal,
            });

            if (!res.ok) {
                const errorJson = await res.json().catch(() => ({}));
                throw new Error(errorJson.error || "Impossible de récupérer la segmentation clientèle");
            }

            return res.json();
        },
        staleTime: 5 * 60 * 1000, // Cache de 5 minutes
        refetchOnWindowFocus: false,
    });
}