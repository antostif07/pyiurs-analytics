"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
    RedsupInvoiceRow,
    RedsupPhotoMutationResult,
    RedsupReportData,
    RedsupValidationMutationResult,
} from "../types";
import { buildRedsupKpis } from "../kpis";

function patchOrderInCaches(
    qc: ReturnType<typeof useQueryClient>,
    odooOrderId: number,
    updater: (row: RedsupInvoiceRow) => RedsupInvoiceRow,
) {
    qc.setQueriesData<RedsupReportData>(
        { queryKey: ["controls-redsup-invoices"] },
        (old) => {
            if (!old) return old;
            let changed = false;
            const invoices = old.invoices.map((row) => {
                if (row.odooOrderId !== odooOrderId) return row;
                changed = true;
                return updater(row);
            });
            if (!changed) return old;
            return { ...old, invoices, kpis: buildRedsupKpis(invoices) };
        },
    );
}

export function useAttachRedsupPhoto() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            odooOrderId,
            file,
        }: {
            odooOrderId: number;
            file: File;
        }): Promise<RedsupPhotoMutationResult> => {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`/api/controls/validation-remise/${odooOrderId}/photo`, {
                method: "POST",
                body: fd,
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de l'envoi de l'autorisation");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchOrderInCaches(qc, data.odooOrderId, (row) => ({
                ...row,
                hasPhoto: data.hasPhoto,
                photoAttachedAt: data.photoAttachedAt,
                photoAttachedBy: data.photoAttachedBy,
            }));
        },
    });
}

export function useDeleteRedsupPhoto() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (odooOrderId: number): Promise<RedsupPhotoMutationResult> => {
            const res = await fetch(`/api/controls/validation-remise/${odooOrderId}/photo`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec suppression photo");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchOrderInCaches(qc, data.odooOrderId, (row) => ({
                ...row,
                hasPhoto: false,
                photoAttachedAt: null,
                photoAttachedBy: null,
            }));
        },
    });
}

export function useValidateRedsup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (odooOrderId: number): Promise<RedsupValidationMutationResult> => {
            const res = await fetch(`/api/controls/validation-remise/${odooOrderId}/validate`, {
                method: "POST",
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la validation");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchOrderInCaches(qc, data.odooOrderId, (row) => ({
                ...row,
                isValidated: true,
                validatedAt: data.validatedAt,
                validatedBy: data.validatedBy,
            }));
        },
    });
}

export function useUnvalidateRedsup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (odooOrderId: number): Promise<RedsupValidationMutationResult> => {
            const res = await fetch(`/api/controls/validation-remise/${odooOrderId}/validate`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? "Échec de la suppression");
            }
            return res.json();
        },
        onSuccess: (data) => {
            patchOrderInCaches(qc, data.odooOrderId, (row) => ({
                ...row,
                isValidated: false,
                validatedAt: null,
                validatedBy: null,
            }));
        },
    });
}