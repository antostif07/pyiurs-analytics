// app/inventory/purchases/import-generator/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getServerAuth } from "@/lib/supabase/server";
import { canAccessPurchases } from "@/lib/auth/roles";
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

export default async function PurchaseImportGeneratorPage({
    searchParams,
}: PageProps) {
    const auth = await getServerAuth();
    if (!auth.profile || !canAccessPurchases(auth.profile.role)) {
        redirect("/unauthorized?reason=insufficient_permissions");
    }

    const params = await searchParams;
    const sessionId = params.session;

    const { session } = sessionId
        ? await loadSessionById(sessionId)
        : { session: null };

    return (
        <PurchaseImportGeneratorClient
            initialSession={session}
            requestedSessionId={sessionId ?? null}
        />
    );
}