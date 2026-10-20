// app/settings/_lib/hooks/use-settings.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OdooLocation, Shop, ShopLocation, ShopWithStats } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// SHOPS
// ═══════════════════════════════════════════════════════════════════════════

export function useShops() {
    return useQuery<{ shops: ShopWithStats[] }>({
        queryKey: ["settings-shops"],
        queryFn: async ({ signal }) => {
            const res = await fetch("/api/settings/shops", { signal });
            if (!res.ok) throw new Error("Impossible de charger les boutiques");
            return res.json();
        },
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
}

export function useShop(id: string) {
    return useQuery<{ shop: Shop; locations: ShopLocation[] }>({
        queryKey: ["settings-shop", id],
        queryFn: async ({ signal }) => {
            const res = await fetch(`/api/settings/shops/${id}`, { signal });
            if (!res.ok) throw new Error("Boutique introuvable");
            return res.json();
        },
        staleTime: 30 * 1000,
        enabled: !!id,
        refetchOnWindowFocus: false,
    });
}

interface CreateShopPayload {
    name: string;
    odoo_company_id: number | null;
    odoo_pos_ids: number[] | null;
}

export function useCreateShop() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateShopPayload) => {
            const res = await fetch("/api/settings/shops", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Échec de création");
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["settings-shops"] });
        },
    });
}

export function useUpdateShop(id: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<CreateShopPayload>) => {
            const res = await fetch(`/api/settings/shops/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Échec de modification");
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["settings-shops"] });
            qc.invalidateQueries({ queryKey: ["settings-shop", id] });
        },
    });
}

export function useDeleteShop() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/settings/shops/${id}`, { method: "DELETE" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Échec de suppression");
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["settings-shops"] });
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOP LOCATIONS
// ═══════════════════════════════════════════════════════════════════════════

interface CreateLocationPayload {
    odoo_location_id: number;
    odoo_location_name: string;
    odoo_location_complete_name?: string | null;
    odoo_usage?: string | null;
    odoo_company_id?: number | null;
    label?: string | null;
    sort_order?: number;
}

export function useCreateLocation(shopId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: CreateLocationPayload) => {
            const res = await fetch(`/api/settings/shops/${shopId}/locations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Échec d'ajout");
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["settings-shop", shopId] });
            qc.invalidateQueries({ queryKey: ["settings-shops"] });
        },
    });
}

export function useUpdateLocation(shopId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            locId,
            payload,
        }: {
            locId: string;
            payload: { label?: string | null; is_active?: boolean; sort_order?: number };
        }) => {
            const res = await fetch(
                `/api/settings/shops/${shopId}/locations/${locId}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Échec de modification");
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["settings-shop", shopId] });
        },
    });
}

export function useDeleteLocation(shopId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (locId: string) => {
            const res = await fetch(
                `/api/settings/shops/${shopId}/locations/${locId}`,
                { method: "DELETE" },
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "Échec de suppression");
            return body;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["settings-shop", shopId] });
            qc.invalidateQueries({ queryKey: ["settings-shops"] });
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ODOO LOCATIONS (picker)
// ═══════════════════════════════════════════════════════════════════════════

export function useOdooLocations(
    companyId: number | null,
    options?: { includeAll?: boolean },
) {
    const includeAll = options?.includeAll ?? false;

    return useQuery<{ locations: OdooLocation[] }>({
        queryKey: ["odoo-locations", companyId, includeAll],
        queryFn: async ({ signal }) => {
            const params = new URLSearchParams();
            if (companyId !== null) params.set("company", String(companyId));
            if (includeAll) params.set("all", "true");

            const res = await fetch(
                `/api/settings/odoo-locations?${params.toString()}`,
                { signal },
            );
            if (!res.ok) throw new Error("Impossible de charger les emplacements Odoo");
            return res.json();
        },
        staleTime: 5 * 60 * 1000,
        enabled: companyId !== null || includeAll,
        refetchOnWindowFocus: false,
    });
}