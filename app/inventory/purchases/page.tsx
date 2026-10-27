// app/inventory/purchases/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { canAccessPurchases } from "@/lib/auth/roles";

import InventoryPurchasesClient from "./inventory-purchases-client";
import { fetchPurchasesData } from "./_lib/data";
import { parsePurchasesFilters } from "./_lib/filters";
import type { IncomingReceipt } from "./_lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Réceptions d'achats | Stock",
    description:
        "Suivi des réceptions physiques de marchandises et entrées entrepôt (stock.picking Odoo).",
};

interface PageProps {
    searchParams: Promise<{
        status?: string;
        start_date?: string;
        end_date?: string;
    }>;
}

function filterByDate(
    receipts: IncomingReceipt[],
    start: string | null,
    end: string | null,
): IncomingReceipt[] {
    if (!start || !end) return receipts;

    const startMs = new Date(start + "T00:00:00").getTime();
    const endMs = new Date(end + "T23:59:59").getTime();

    return receipts.filter((r) => {
        // On filtre sur scheduledDate (date prévue). Si null, on exclut.
        if (!r.scheduledDate) return false;
        const t = new Date(r.scheduledDate).getTime();
        return t >= startMs && t <= endMs;
    });
}

export default async function PurchasesPage({ searchParams }: PageProps) {
    const auth = await getServerAuth();
    if (!auth.profile || !canAccessPurchases(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const params = await searchParams;
    const filters = parsePurchasesFilters(params);

    const { receipts, kpis, insights } = await fetchPurchasesData();

    // Filtre statut
    let filtered =
        filters.status && filters.status !== "all"
            ? receipts.filter((r) => r.status === filters.status)
            : receipts;

    // Filtre période
    filtered = filterByDate(filtered, filters.start_date, filters.end_date);

    return (
        <InventoryPurchasesClient
            receipts={filtered}
            kpis={kpis}
            insights={insights}
            currentStatus={filters.status}
            currentStartDate={filters.start_date}
            currentEndDate={filters.end_date}
        />
    );
}