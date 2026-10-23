// app/ceo-report/finance/page.tsx
import type { Metadata } from "next";
import FinanceAuditClient from "./finance-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Audit Comptabilité Achats & Frais Logistiques | Rapport DG",
    description:
        "Rapprochement des engagements Odoo, décaissements fournisseurs et structure des frais d'approche (frets, douanes).",
};

export default function FinanceAuditPage() {
    return <FinanceAuditClient />;
}