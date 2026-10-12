// app/finance/loyalty/_lib/hooks/use-send-loyalty.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    SendLoyaltyResult,
    SendBulkLoyaltyResult,
} from "../types";

export function useSendLoyalty() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (orderId: number): Promise<SendLoyaltyResult> => {
            const res = await fetch(
                `/api/finance/loyalty/${orderId}/send`,
                { method: "POST" },
            );

            const body = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(body.error ?? "Échec de l'envoi");
            }
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["finance-loyalty"] });
        },
    });
}

export function useSendBulkLoyalty() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (orderIds: number[]): Promise<SendBulkLoyaltyResult> => {
            const res = await fetch("/api/finance/loyalty/send-bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds }),
            });

            const body = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(body.error ?? "Échec de l'envoi groupé");
            }
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["finance-loyalty"] });
        },
    });
}