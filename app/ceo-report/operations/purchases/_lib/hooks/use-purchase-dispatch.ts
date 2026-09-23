// app/ceo-report/operations/purchases/_lib/hooks/use-purchase-dispatch.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type {
    PurchaseDispatchKpisData,
    PurchaseFunnelPoint,
    StoreDispatchShare,
} from "../types";
import { PurchaseDispatchRow } from "../../_components/purchase-dispatch-matrix-table";

export interface PurchaseDispatchResponse {
    kpis: PurchaseDispatchKpisData;
    funnelData: PurchaseFunnelPoint[];
    storeShares: StoreDispatchShare[];
    tableRows: PurchaseDispatchRow[];
}

export function usePurchaseDispatch() {
    const searchParams = useSearchParams();
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    return useQuery<PurchaseDispatchResponse>({
        queryKey: ["ceo-purchases-dispatch", from, to],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);

            const res = await fetch(`/api/ceo-report/operations/purchases?${params.toString()}`, {
                signal,
            });

            if (!res.ok) {
                const errorJson = await res.json().catch(() => ({}));
                throw new Error(errorJson.error || "Impossible de récupérer les achats et réceptions Odoo");
            }

            return res.json();
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}