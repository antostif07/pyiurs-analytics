import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getServerAuth } from "@/lib/supabase/server";
import { canAccessStockPo } from "@/lib/auth/roles";
import {
    parseStockPoFilters,
    serializeStockPoFilters,
} from "../stock-po/_lib/filters";
import { fetchStockPoReport } from "../stock-po/_lib/server/stock-po-service";
import StockPoClient from "../stock-po/stock-po-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Stock POLOG",
    description: "Contrôle des bons de commande fournisseurs LOG, pièces jointes et réceptions.",
};

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function StockPologLoader({ searchParams }: PageProps) {
    const [rawParams, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) {
        redirect("/login?next=/controls/stock-polog");
    }
    if (!auth.profile || !canAccessStockPo(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const filters = parseStockPoFilters(rawParams);
    const queryKeyString = serializeStockPoFilters(filters).toString();
    const initialData = await fetchStockPoReport(filters, { mode: "polog" });

    return (
        <StockPoClient
            mode="polog"
            initialData={initialData}
            initialQueryKeyString={queryKeyString}
            initialFetchedAt={Date.now()}
            userRole={auth.profile.role ?? "user"}
        />
    );
}

export default function StockPologPage({ searchParams }: PageProps) {
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
            <StockPologLoader searchParams={searchParams} />
        </Suspense>
    );
}