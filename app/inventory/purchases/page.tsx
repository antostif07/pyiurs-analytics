import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { canAccessPurchases } from "@/lib/auth/roles";

import InventoryPurchasesClient from "./inventory-purchases-client";
import { fetchPurchasesData } from "./_lib/data";
import { parsePurchasesFilters } from "./_lib/filters";

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

async function PurchasesLoader({ searchParams }: PageProps) {
    const [params, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) {
        redirect("/login?next=/inventory/purchases");
    }
    if (!auth.profile || !canAccessPurchases(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const filters = parsePurchasesFilters(params);
    const { receipts, kpis, insights } = await fetchPurchasesData(
        filters,
        auth.profile,
    );

    return (
        <InventoryPurchasesClient
            receipts={receipts}
            kpis={kpis}
            insights={insights}
            currentStatus={filters.status}
            currentStartDate={filters.start_date}
            currentEndDate={filters.end_date}
        />
    );
}

export default function PurchasesPage({ searchParams }: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-24 rounded-lg bg-muted/40" />
                        ))}
                    </div>
                    <div className="h-80 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <PurchasesLoader searchParams={searchParams} />
        </Suspense>
    );
}