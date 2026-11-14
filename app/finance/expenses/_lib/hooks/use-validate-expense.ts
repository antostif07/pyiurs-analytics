"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    ExpensesReportData,
    ValidationMutationResult,
} from "../types";
import { buildExpensesKpis } from "../kpis";

interface ValidateArgs {
    odooExpenseId: number;
    validationFile: File;
    proofFile?: File;
    notes?: string;
}

function patchValidationInCaches(
    qc: ReturnType<typeof useQueryClient>,
    result: ValidationMutationResult,
) {
    qc.setQueriesData<ExpensesReportData>(
        { queryKey: ["finance-expenses"] },
        (old) => {
            if (!old) return old;
            let changed = false;
            const expenses = old.expenses.map((row) => {
                if (row.odooExpenseId !== result.odooExpenseId) return row;
                changed = true;
                return {
                    ...row,
                    isValidated: result.isValidated,
                    hasValidationPhoto: result.hasValidationPhoto,
                    hasProofPhoto: result.hasProofPhoto,
                    validationNotes: result.validationNotes,
                    validatedAt: result.validatedAt,
                    validatedBy: result.validatedBy,
                };
            });
            if (!changed) return old;
            return {
                ...old,
                expenses,
                kpis: buildExpensesKpis(expenses),
            };
        },
    );
}

export function useValidateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            odooExpenseId,
            validationFile,
            proofFile,
            notes,
        }: ValidateArgs): Promise<ValidationMutationResult> => {
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
        onSuccess: (data) => {
            patchValidationInCaches(qc, data);
        },
    });
}

export function useUnvalidateExpense() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (
            odooExpenseId: number,
        ): Promise<ValidationMutationResult> => {
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
        onSuccess: (data) => {
            patchValidationInCaches(qc, data);
        },
    });
}