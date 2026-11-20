"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
    AlertCircle,
    Banknote,
    DollarSign,
    Lock,
    RefreshCw,
    ShoppingBag,
    TrendingDown,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Button } from "@/components/ui/button";

import ClotureFilters from "./_components/cloture-filters";
import ClotureMatrixAndPayments from "./_components/cloture-matrix-and-payments";
import ClotureDetailsSection from "./_components/cloture-details-section";
import { useClotureVente } from "./_lib/hooks/use-cloture-vente";
import type { DailyClosingReport } from "./_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function ClotureVentesClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
}: {
    initialData?: DailyClosingReport;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}) {
    const {
        data,
        filters,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
    } = useClotureVente({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success("Données de clôture actualisées");
    };

    const report = data ?? initialData;
    if (!report) return null;

    return (
        <div>
            <ReportPageHeader
                title="Clôture des Ventes"
                subtitle="Synthèse journalière POS, modes de paiement et dépenses"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <ClotureFilters
                    date={filters.date}
                    shop={report.shop}
                    shops={report.shops}
                    exchangeRate={report.exchangeRate}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {isError && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300/60 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                                {error instanceof Error ? error.message : "Erreur de chargement."}
                            </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleRefresh} className="h-7 text-[11px] gap-1.5">
                            <RefreshCw className="w-3 h-3" />
                            Réessayer
                        </Button>
                    </div>
                )}

                {report.existingClosure && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
                        <div className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                                Une clôture existe pour cette période ({report.existingClosure.openingDate} →{" "}
                                {report.existingClosure.closingDate} · statut :{" "}
                                <strong>{report.existingClosure.closureStatus}</strong>).
                            </span>
                        </div>
                        <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
                            <Link href={`/revenue/cloture-vente/${report.existingClosure.id}`}>
                                Voir la clôture
                            </Link>
                        </Button>
                    </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Ventes du jour"
                        value={`${fmt(report.kpis.dailySalesTotal)} $`}
                        subtitle={`${report.kpis.totalOrders} ticket${report.kpis.totalOrders > 1 ? "s" : ""}`}
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Cash Espèces"
                        value={`${fmt(report.payments.cash.total)} $`}
                        subtitle={`${report.payments.cash.count} paiement${report.payments.cash.count > 1 ? "s" : ""}`}
                        icon={<Banknote className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Dépenses du jour"
                        value={`${fmt(report.kpis.expensesTotal)} $`}
                        subtitle={`Principale : ${fmt(report.kpis.principalExpensesTotal)} $`}
                        icon={<TrendingDown className="w-3.5 h-3.5" />}
                        iconColor="text-rose-600 dark:text-rose-400"
                        iconBg="bg-rose-50 dark:bg-rose-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Cash Attendu"
                        value={`${fmt(report.kpis.expectedCash)} $`}
                        subtitle="Espèces − Sorties Caisse Principale"
                        icon={<ShoppingBag className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                        isLoading={isLoading}
                    />
                </div>

                <ReportSection index={1} title="Répartition par boutique & paiements">
                    <ClotureMatrixAndPayments report={report} />
                </ReportSection>

                <ReportSection index={2} title="Détail des ventes et dépenses">
                    <ClotureDetailsSection report={report} />
                </ReportSection>
            </div>
        </div>
    );
}