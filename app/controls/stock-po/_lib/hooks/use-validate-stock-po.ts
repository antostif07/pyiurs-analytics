"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    StockPoReportData,
    StockPoRow,
    StockPoValidationMutationResult,
} from "../types";

function patchPoInCaches(
    qc: ReturnType<typeof useQueryClient>,
    odooPoId: number,
    updater: (row: StockPoRow) => StockPoRow,
) {
    qc.setQueriesData<StockPoReportData>(
        { queryKey: ["controls-stock-po"] },
        (old) => {
            if (!old) return old;
            let changed = false;
            const orders = old.orders.map((row) => {
                if (row.id !== odooPoId) return row;
                changed = true;
                return updater(row);
            });
            if (!changed) return old;
            return {
                ...old,
                orders,
                kpis: {
                    ...old.kpis,
                    validatedCount: orders.filter((o) => o.isValidated).length,
                },
            };
        },
    );
}

export function useValidateStockPo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            odooPoId,
            file,
            notes,
        }: {
            odooPoId: number;
            file: File;
            notes?: string;
        }): Promise<StockPoValidationMutationResult> => {
            const fd = new FormData();
            fd.append("file", file);
            if (notes) fd.append("notes", notes);

            const res = await fetch(`/api/controls/stock-po/${odooPoId}/validate`, {
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
            patchPoInCaches(qc, data.odooPoId, (row) => ({
                ...row,
                isValidated: data.isValidated,
                validationFileName: data.validationFileName,
                validationMimeType: data.validationMimeType,
                validationNotes: data.validationNotes,
                validatedAt: data.validatedAt,
                validatedBy: data.validatedBy,
            }));
        },
    });
}

export function useUnvalidateStockPo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (
            odooPoId: number,
        ): Promise<StockPoValidationMutationResult> => {
            const res = await fetch(`/api/controls/stock-po/${odooPoId}/validate`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la suppression");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchPoInCaches(qc, data.odooPoId, (row) => ({
                ...row,
                isValidated: false,
                validationFileName: null,
                validationMimeType: null,
                validationNotes: null,
                validatedAt: null,
                validatedBy: null,
            }));
        },
    });
}