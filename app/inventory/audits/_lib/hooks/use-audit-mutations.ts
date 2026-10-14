// app/inventory/audits/_lib/hooks/use-audit-mutations.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateAuditArgs {
    shopIds: string[];
    departments: string[];
    notes?: string;
    auditDate?: string;
    purchaseOrderIds?: number[];   // ⬅️ NOUVEAU
}

export function useCreateAudit() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (args: CreateAuditArgs) => {
            const res = await fetch("/api/inventory/audits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body.error ?? "Échec de création");
            }
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["inventory-audits"] });
        },
    });
}

export function useDeleteAudit() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (auditId: string) => {
            const res = await fetch(`/api/inventory/audits/${auditId}`, {
                method: "DELETE",
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body.error ?? "Échec de suppression");
            }
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["inventory-audits"] });
        },
    });
}

export function useValidateAudit() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (auditId: string) => {
            const res = await fetch(
                `/api/inventory/audits/${auditId}/validate`,
                { method: "POST" },
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body.error ?? "Échec de validation");
            }
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["inventory-audits"] });
        },
    });
}