// app/inventory/audits/page.tsx
import type { Metadata } from "next";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import AuditsClient from "./audits-client";

export const metadata: Metadata = {
    title: "Audits & Inventaires | Stock",
    description:
        "Comptage au scanner et contrôle de la démarque inconnue.",
};

export const dynamic = "force-dynamic";

export default async function AuditsListPage() {
    // Auth garantie par app/inventory/layout.tsx
    const { profile } = await getServerAuth();
    if (!profile) return null;

    // Scope utilisateur (pour filtrer les boutiques du dialog "Nouvel audit")
    const allowedShopIds: string[] = Array.isArray(profile.assigned_shops)
        ? (profile.assigned_shops as unknown[]).filter(
            (id): id is string => typeof id === "string",
        )
        : [];

    const allowedCompanyIds: number[] = Array.isArray(
        profile.assigned_companies,
    )
        ? (profile.assigned_companies as unknown[]).filter(
            (id): id is number => typeof id === "number",
        )
        : [];

    const isFullAccess =
        profile.role === "admin" || profile.shop_access_type === "all";

    const supabase = await createClient();
    let shopsQuery = supabase
        .from("shops")
        .select("id, name, odoo_company_id")
        .order("name");

    if (!isFullAccess) {
        if (allowedCompanyIds.length > 0) {
            shopsQuery = shopsQuery.in("odoo_company_id", allowedCompanyIds);
        } else if (allowedShopIds.length > 0) {
            shopsQuery = shopsQuery.in("id", allowedShopIds);
        }
    }

    const { data: shops } = await shopsQuery;

    return <AuditsClient allowedShops={shops ?? []} />;
}