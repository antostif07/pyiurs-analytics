// app/inventory/audits/_lib/hooks/use-purchase-orders.ts
"use client";

import { useQuery } from "@tanstack/react-query";

export interface PurchaseOrderOption {
    id: number;
    name: string;
    supplierName: string;
    supplierPrefix: string;
    partnerRef: string;
    date: string;
    amount: number;
    state: string;
}

export function usePurchaseOrders(enabled = true) {
    return useQuery<{ orders: PurchaseOrderOption[] }>({
        queryKey: ["audits-purchase-orders"],
        queryFn: async ({ signal }) => {
            const res = await fetch(
                "/api/inventory/audits/purchase-orders",
                { signal },
            );
            if (!res.ok) {
                throw new Error("Impossible de charger les commandes fournisseurs");
            }
            return res.json();
        },
        enabled,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
}