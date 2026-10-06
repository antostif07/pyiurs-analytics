// app/revenue/invoices-redsup/_lib/hooks/use-validate-redsup.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ValidateArgs {
    odooOrderId: number;
    file: File;
}

export function useValidateRedsup() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ odooOrderId, file }: ValidateArgs) => {
            const fd = new FormData();
            fd.append("file", file);

            const res = await fetch(
                `/api/revenue/invoices-redsup/${odooOrderId}/validate`,
                { method: "POST", body: fd },
            );

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la validation");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["revenue-redsup-invoices"] });
        },
    });
}

export function useUnvalidateRedsup() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (odooOrderId: number) => {
            const res = await fetch(
                `/api/revenue/invoices-redsup/${odooOrderId}/validate`,
                { method: "DELETE" },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la suppression");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["revenue-redsup-invoices"] });
        },
    });
}