// app/inventory/audits/_lib/hooks/use-record-rfid-batch.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface RfidBatchResponse {
    success: boolean;
    error?: string;
    batchId?: string;
    added: number;
    ignoredDuplicates: number;
    alreadyCounted: number;
    unknownEpcs: number;
    unexpectedAdded: number;
    productsAffected: number;
    affectedProductIds?: number[];
    message?: string;
}

interface Options {
    onSuccess?: (data: RfidBatchResponse) => void;
}

export function useRecordRfidBatch(auditId: string, options?: Options) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (args: { epcs: string[]; readerId?: string }) => {
            const res = await fetch(`/api/inventory/audits/${auditId}/rfid`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body.error ?? "Échec de l'enregistrement RFID");
            }
            return body as RfidBatchResponse;
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["inventory-audits"] });
            qc.invalidateQueries({ queryKey: ["inventory-audit", auditId] });
            options?.onSuccess?.(data);
        },
        onError: (err: Error) => {
            toast.error(err.message);
        },
    });
}