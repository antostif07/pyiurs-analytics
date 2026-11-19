import type { Metadata } from "next";
import ReportPageHeader from "@/components/new-ui/layout/report-page-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Vue d'ensemble",
    description: "Pilotage des contrôles et validations.",
};

export default function ControlsOverviewPage() {
    return (
        <div>
            <ReportPageHeader
                title="Centre de Contrôle"
                subtitle="Validations, justificatifs, audits et suivi de conformité"
                badge={{ label: "Contrôles", tone: "amber" }}
            />
            <div className="p-4 sm:p-5">
                {/* KPIs & files d'attente de validation à venir */}
            </div>
        </div>
    );
}