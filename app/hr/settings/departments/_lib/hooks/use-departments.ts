"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HrDepartmentsData } from "../types";

export function useDepartmentsData(initialData?: HrDepartmentsData) {
    return useQuery<HrDepartmentsData>({
        queryKey: ["hr-departments-positions"],
        queryFn: async () => {
            const res = await fetch("/api/hr/departments");
            if (!res.ok) throw new Error("Impossible de charger les départements");
            return res.json();
        },
        initialData,
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

async function apiJson(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Erreur serveur");
    return json;
}

export function useDepartmentMutations() {
    const qc = useQueryClient();
    const inv = () => qc.invalidateQueries({ queryKey: ["hr-departments-positions"] });

    return {
        createDepartment: useMutation({
            mutationFn: (payload: { name: string; description?: string | null }) =>
                apiJson("/api/hr/departments", "POST", payload),
            onSuccess: inv,
        }),
        updateDepartment: useMutation({
            mutationFn: ({ id, ...payload }: { id: string; name?: string; description?: string | null; is_active?: boolean }) =>
                apiJson(`/api/hr/departments/${id}`, "PATCH", payload),
            onSuccess: inv,
        }),
        deleteDepartment: useMutation({
            mutationFn: (id: string) => apiJson(`/api/hr/departments/${id}`, "DELETE"),
            onSuccess: inv,
        }),
        createPosition: useMutation({
            mutationFn: (payload: {
                title: string;
                department_id: string | null;
                default_base_salary: number;
                currency: "USD" | "CDF";
            }) => apiJson("/api/hr/positions", "POST", payload),
            onSuccess: inv,
        }),
        updatePosition: useMutation({
            mutationFn: ({
                id,
                ...payload
            }: {
                id: string;
                title?: string;
                department_id?: string | null;
                default_base_salary?: number;
                currency?: "USD" | "CDF";
                is_active?: boolean;
            }) => apiJson(`/api/hr/positions/${id}`, "PATCH", payload),
            onSuccess: inv,
        }),
        deletePosition: useMutation({
            mutationFn: (id: string) => apiJson(`/api/hr/positions/${id}`, "DELETE"),
            onSuccess: inv,
        }),
    };
}