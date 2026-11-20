import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { isRevenueRole } from "@/lib/auth/roles";
import { parseBeautyFilters, serializeBeautyFilters } from "./_lib/filters";
import { fetchBeautyBrandsReport } from "./_lib/server/beauty-brands-service";
import BeautyBrandsClient from "./beauty-brands-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Beauty par Marque",
    description: "Analyse journalière des ventes Beauty par marque, gamme (HS Code) et produit.",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function BeautyBrandsLoader({ searchParams }: PageProps) {
    const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) redirect("/login?next=/revenue/beauty-brands");
    if (!auth.profile || !isRevenueRole(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const filters = parseBeautyFilters(rawParams);
    const queryKeyString = serializeBeautyFilters(filters).toString();
    const initialData = await fetchBeautyBrandsReport(filters, auth.profile);

    return (
        <BeautyBrandsClient
            initialData={initialData}
            initialQueryKeyString={queryKeyString}
            initialFetchedAt={Date.now()}
        />
    );
}

export default function BeautyBrandsPage({ searchParams }: PageProps) {
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
            <BeautyBrandsLoader searchParams={searchParams} />
        </Suspense>
    );
}