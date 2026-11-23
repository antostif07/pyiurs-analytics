import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { canAccessStoreTransfers } from "@/lib/auth/roles";
import { parseTransferFilters, serializeTransferFilters } from "./_lib/filters";
import { fetchStoreTransfersReport } from "./_lib/server/transfer-service";
import StoreTransfersClient from "./store-transfers-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Transferts Inter-Boutiques",
    description: "Contrôle des livraisons PB - BC, PO générés et justificatifs DP/OUT & DP/IN.",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function StoreTransfersLoader({ searchParams }: PageProps) {
    const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) redirect("/login?next=/controls/store-transfers");
    if (!auth.profile || !canAccessStoreTransfers(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const filters = parseTransferFilters(rawParams);
    const queryKeyString = serializeTransferFilters(filters).toString();
    const initialData = await fetchStoreTransfersReport(filters, auth.profile);

    return (
        <StoreTransfersClient
            initialData={initialData}
            initialQueryKeyString={queryKeyString}
            initialFetchedAt={Date.now()}
            userRole={auth.profile.role ?? "user"}
        />
    );
}

export default function StoreTransfersPage({ searchParams }: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 rounded-lg bg-muted/40" />
                        ))}
                    </div>
                    <div className="h-80 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <StoreTransfersLoader searchParams={searchParams} />
        </Suspense>
    );
}