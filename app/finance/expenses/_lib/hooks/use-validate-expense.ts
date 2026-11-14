"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    ExpenseRow,
    ExpensesReportData,
    ProofMutationResult,
    ValidationMutationResult,
} from "../types";
import { buildExpensesKpis } from "../kpis";

function patchRowInCaches(
    qc: ReturnType<typeof useQueryClient>,
    odooExpenseId: number,
    updater: (row: ExpenseRow) => ExpenseRow,
) {
    qc.setQueriesData<ExpensesReportData>(
        { queryKey: ["finance-expenses"] },
        (old) => {
            if (!old) return old;
            let changed = false;
            const expenses = old.expenses.map((row) => {
                if (row.odooExpenseId !== odooExpenseId) return row;
                changed = true;
                return updater(row);
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

// ─── Preuve (Manager / Controller / Admin) ────────────────────────────────

export function useAttachProof() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            odooExpenseId,
            proofFile,
        }: {
            odooExpenseId: number;
            proofFile: File;
        }): Promise<ProofMutationResult> => {
            const fd = new FormData();
            fd.append("proofFile", proofFile);
            const res = await fetch(`/api/finance/expenses/${odooExpenseId}/proof`, {
                method: "POST",
                body: fd,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de l'envoi de la preuve");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchRowInCaches(qc, data.odooExpenseId, (row) => ({
                ...row,
                hasProofPhoto: data.hasProofPhoto,
                proofAttachedAt: data.proofAttachedAt,
                proofAttachedBy: data.proofAttachedBy,
            }));
        },
    });
}

export function useDeleteProof() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (odooExpenseId: number): Promise<ProofMutationResult> => {
            const res = await fetch(`/api/finance/expenses/${odooExpenseId}/proof`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec suppression preuve");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchRowInCaches(qc, data.odooExpenseId, (row) => ({
                ...row,
                hasProofPhoto: false,
                proofAttachedAt: null,
                proofAttachedBy: null,
            }));
        },
    });
}

// ─── Validation (Controller / Admin uniquement) ───────────────────────────

export function useValidateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            odooExpenseId,
            validationFile,
            notes,
        }: {
            odooExpenseId: number;
            validationFile: File;
            notes?: string;
        }): Promise<ValidationMutationResult> => {
            const fd = new FormData();
            fd.append("validationFile", validationFile);
            if (notes) fd.append("notes", notes);

            const res = await fetch(`/api/finance/expenses/${odooExpenseId}/validate`, {
                method: "POST",
                body: fd,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la validation");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchRowInCaches(qc, data.odooExpenseId, (row) => ({
                ...row,
                isValidated: data.isValidated,
                hasValidationPhoto: data.hasValidationPhoto,
                validationNotes: data.validationNotes,
                validatedAt: data.validatedAt,
                validatedBy: data.validatedBy,
            }));
        },
    });
}

export function useUnvalidateExpense() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (
            odooExpenseId: number,
        ): Promise<ValidationMutationResult> => {
            const res = await fetch(`/api/finance/expenses/${odooExpenseId}/validate`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la suppression");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchRowInCaches(qc, data.odooExpenseId, (row) => ({
                ...row,
                isValidated: false,
                hasValidationPhoto: false,
                validationNotes: null,
                validatedAt: null,
                validatedBy: null,
            }));
        },
    });
}