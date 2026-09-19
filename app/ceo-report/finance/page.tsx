// app/ceo-report/finance/page.tsx
import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";
import FinanceAuditClient from "./finance-client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Audit Comptabilité Achats & Frais Logistiques | Rapport DG",
    description: "Rapprochement des engagements Odoo, décaissements fournisseurs et structure des frais d'approche (frets, douanes).",
};

export default async function FinanceAuditPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <FinanceAuditClient />
        </Suspense>
    );
}