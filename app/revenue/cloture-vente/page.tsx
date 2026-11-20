import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isRevenueRole } from "@/lib/auth/roles";
import { parseClotureFilters, serializeClotureFilters } from "./_lib/filters";
import { fetchDailyClosingReport } from "./_lib/server/cloture-service";
import ClotureVentesClient from "./cloture-ventes-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Clôture des Ventes",
    description: "Point des ventes POS par segment, modes de paiement et dépenses du jour.",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function ClotureLoader({ searchParams }: PageProps) {
    const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) redirect("/login?next=/revenue/cloture-vente");
    if (!auth.profile || !isRevenueRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const filters = parseClotureFilters(rawParams);
    const queryKeyString = serializeClotureFilters(filters).toString();
    const initialData = await fetchDailyClosingReport(filters, auth.profile);

    return (
        <ClotureVentesClient
            initialData={initialData}
            initialQueryKeyString={queryKeyString}
            initialFetchedAt={Date.now()}
        />
    );
}

export default function ClotureVentesPage({ searchParams }: PageProps) {
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
            <ClotureLoader searchParams={searchParams} />
        </Suspense>
    );
}