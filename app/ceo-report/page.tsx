import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
    parsePeriodFromSearchParams,
    toApiDates,
} from "@/app/ceo-report/_lib/period";
import { PeriodSelector } from "./_components/period-selector";
import { DomainCard } from "./_components/domain-card";
import { KpiCard } from "./_components/kpi-card";
import { fetchDomainSummaries, fetchVitalKpis } from "./_lib/queries";

export const metadata: Metadata = {
    title: "Vue d'ensemble",
};

export const dynamic = "force-dynamic";

interface CeoReportPageProps {
    searchParams: Promise<{
        from?: string;
        to?: string;
        preset?: string;
        company?: string;
    }>;
}

export default async function CeoReportPage({
    searchParams,
}: CeoReportPageProps) {
    const params = await searchParams;
    const period = parsePeriodFromSearchParams(params);
    const { from, to } = toApiDates(period);
    const companyId = params.company ? Number(params.company) : undefined;

    // 🔜 ÉTAPE ACTUELLE : à remplacer par de vrais appels Odoo
    // Pour l'instant on garde les mocks mais on passe les dates
    const [vitals, domains] = await Promise.all([
        fetchVitalKpis({ from, to, companyId }),
        fetchDomainSummaries({ from, to, companyId }),
    ]);

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-8">
                {/* ─── En-tête ─── */}
                <header className="flex flex-col gap-4 border-b border-border/50 pb-6 md:flex-row md:items-end md:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Rapport Direction Générale
                            </h1>
                        </div>
                        <p className="text-sm font-light text-muted-foreground">
                            Vue consolidée · {from} → {to}
                        </p>
                    </div>

                    <PeriodSelector />
                </header>

                {/* ─── Signes vitaux ─── */}
                <section aria-labelledby="vitals-heading">
                    <h2
                        id="vitals-heading"
                        className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
                    >
                        Indicateurs clés
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                        {vitals.map((kpi) => (
                            <KpiCard key={kpi.code} kpi={kpi} variant="vital" />
                        ))}
                    </div>
                </section>

                {/* ─── Domaines ─── */}
                <section aria-labelledby="domains-heading">
                    <h2
                        id="domains-heading"
                        className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60"
                    >
                        Par domaine
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        {domains.map((domain) => (
                            <DomainCard key={domain.id} domain={domain} />
                        ))}
                    </div>
                </section>
            </div>
        </TooltipProvider>
    );
}