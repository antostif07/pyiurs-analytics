import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { canAccessPurchases } from "@/lib/auth/roles";
import {
    getOdooLogPurchaseOrders,
    getOdooPosCategories,
    getOdooProductCategories,
    getOdooPurchaseOrdersForImport,
} from "../import-actions";
import { loadSessionById } from "./_lib/session-actions";
import PurchaseImportGeneratorClient from "./purchase-import-generator-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Génération import Excel | Achats",
    description:
        "Génération de fichier Excel d'importation Odoo pour les réceptions d'achats.",
};

interface PageProps {
    searchParams: Promise<{ session?: string }>;
}

async function ImportGeneratorLoader({ searchParams }: PageProps) {
    const [params, auth] = await Promise.all([searchParams, getServerAuth()]);

    if (!auth.user) redirect("/login?next=/inventory/purchases/import-generator");
    if (!auth.profile || !canAccessPurchases(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const sessionId = params.session;

    const [sessionRes, poData, logPoData, prodCatData, posCatData] = await Promise.all([
        sessionId ? loadSessionById(sessionId) : Promise.resolve({ session: null }),
        getOdooPurchaseOrdersForImport(),
        getOdooLogPurchaseOrders(),
        getOdooProductCategories(),
        getOdooPosCategories(),
    ]);

    return (
        <PurchaseImportGeneratorClient
            initialSession={sessionRes.session}
            requestedSessionId={sessionId ?? null}
            initialPurchaseOrders={poData}
            initialLogPurchaseOrders={logPoData}
            initialProductCategories={prodCatData.filter((cat) => cat.name.split("/").length < 4)}
            initialPosCategories={posCatData}
        />
    );
}

export default function PurchaseImportGeneratorPage({ searchParams }: PageProps) {
    return (
        <Suspense
            fallback={
                <div className="p-5 space-y-4 animate-pulse">
                    <div className="h-16 rounded-lg bg-muted/40" />
                    <div className="h-64 rounded-lg bg-muted/40" />
                </div>
            }
        >
            <ImportGeneratorLoader searchParams={searchParams} />
        </Suspense>
    );
}