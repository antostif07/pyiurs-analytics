"use client";

import { toast } from "sonner";
import {
    AlertCircle,
    AlertTriangle,
    DollarSign,
    Percent,
    RefreshCw,
    RotateCcw,
    TrendingUp,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Button } from "@/components/ui/button";

import SansCodeFilters from "./_components/sans-code-filters";
import SansCodeTable from "./_components/sans-code-table";
import { useSansCode } from "./_lib/hooks/use-sans-code";
import type { SansCodeKpis, SansCodeReportData } from "./_lib/types";

const FALLBACK_KPIS: SansCodeKpis = {
    totalAmount: 0,
    refundedAmount: 0,
    netAmount: 0,
    refundRate: 0,
    totalOrders: 0,
    totalQty: 0,
    topRiskPos: [],
};

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

interface SansCodeClientProps {
    initialData?: SansCodeReportData;
    initialQueryKeyString?: string;
    initialFetchedAt?: number;
}

export default function SansCodeClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
}: SansCodeClientProps) {
    const {
        data,
        filters,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
    } = useSansCode({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const rows = data?.rows ?? [];
    const kpis = data?.kpis ?? FALLBACK_KPIS;
    const posConfigs = data?.posConfigs ?? [];

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success("Ventes sans code actualisées");
    };

    const handleExportCsv = () => {
        if (rows.length === 0) return;
        const header = ["POS", "Date", "Ticket", "Client", "Note", "Quantité", "Montant", "Remboursée"];
        const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const csvLines = [
            header.join(";"),
            ...rows.map((r) =>
                [
                    esc(r.posConfig),
                    esc(r.date),
                    esc(r.invoiceRef),
                    esc(r.clientName),
                    esc(r.note),
                    r.qtySansCode,
                    r.amountSansCode.toFixed(2),
                    r.isRefunded ? "Oui" : "Non",
                ].join(";"),
            ),
        ];

        const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
            type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ventes-sans-code_${filters.from}_${filters.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export CSV téléchargé");
    };

    const topRiskText =
        kpis.topRiskPos.length > 0
            ? kpis.topRiskPos.map((p) => `${p.pos} (${p.rate.toFixed(1)}%)`).join(" · ")
            : "Aucun retour sur la période";

    return (
        <div>
            <ReportPageHeader
                title="Ventes sans code"
                subtitle="Contrôle des articles vendus sans code-barres (SCBTY / SCVF142)"
                badge={{ label: "Live Odoo", tone: "amber" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <SansCodeFilters
                    from={filters.from}
                    to={filters.to}
                    pos={filters.pos}
                    posConfigs={posConfigs}
                    onExportCsv={handleExportCsv}
                    canExport={rows.length > 0}
                />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {isError && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-300/60 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                                {error instanceof Error
                                    ? error.message
                                    : "Erreur lors du chargement des ventes sans code."}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            className="h-7 text-[11px] gap-1.5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Réessayer
                        </Button>
                    </div>
                )}

                {/* KPIs — design CeoKpiCard cohérent */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="CA Brut Sans Code"
                        value={`${fmt(kpis.totalAmount)} $`}
                        subtitle={`${kpis.totalOrders} tickets · ${kpis.totalQty} articles`}
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Remboursé"
                        value={`${fmt(kpis.refundedAmount)} $`}
                        subtitle={`Taux : ${kpis.refundRate.toFixed(1)} %`}
                        icon={<RotateCcw className="w-3.5 h-3.5" />}
                        iconColor="text-rose-600 dark:text-rose-400"
                        iconBg="bg-rose-50 dark:bg-rose-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="CA Réel (Net)"
                        value={`${fmt(kpis.netAmount)} $`}
                        subtitle="Hors tickets remboursés"
                        icon={<TrendingUp className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Taux Remboursement"
                        value={`${kpis.refundRate.toFixed(1)} %`}
                        subtitle={topRiskText}
                        icon={
                            kpis.refundRate > 10 ? (
                                <AlertTriangle className="w-3.5 h-3.5" />
                            ) : (
                                <Percent className="w-3.5 h-3.5" />
                            )
                        }
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isLoading}
                    />
                </div>

                <ReportSection index={1} title="Détail par POS, date et ticket">
                    <SansCodeTable data={rows} />
                </ReportSection>
            </div>
        </div>
    );
}