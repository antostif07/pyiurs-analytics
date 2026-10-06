// app/finance/expenses/_lib/hooks/use-validate-expense.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ValidateArgs {
    odooExpenseId: number;
    validationFile: File;
    proofFile?: File;
    notes?: string;
}

export function useValidateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ odooExpenseId, validationFile, proofFile, notes }: ValidateArgs) => {
            const fd = new FormData();
            fd.append("validationFile", validationFile);
            if (proofFile) fd.append("proofFile", proofFile);
            if (notes) fd.append("notes", notes);

            const res = await fetch(
                `/api/finance/expenses/${odooExpenseId}/validate`,
                { method: "POST", body: fd },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la validation");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["finance-expenses"] });
        },
    });
}

export function useUnvalidateExpense() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (odooExpenseId: number) => {
            const res = await fetch(
                `/api/finance/expenses/${odooExpenseId}/validate`,
                { method: "DELETE" },
            );
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la suppression");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["finance-expenses"] });
        },
    });
}