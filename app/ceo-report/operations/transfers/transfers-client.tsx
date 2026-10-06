// app/ceo-report/operations/transfers/transfers-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck, DollarSign, FileCheck, AlertOctagon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend,
} from "recharts";

import ReportPageHeader from "../../../../components/new-ui/layout/report-page-header";
import GlobalFilters from "../../_components/global-filters";
import { ReportSection } from "../../../../components/new-ui/layout/report-section";
import CeoKpiCard from "../../_components/ceo-kpi-card";
import { parseFilters } from "../../_lib/filters";

import TransferPreviewDialog from "../_components/transfer-preview-dialog";
import { useTransfers } from "./_lib/hooks/use-transfers";
import type { TransferControlRow, TransfersKpis } from "./_lib/types";
import TransferControlTable from "./_components/transfer-control-table.tsx";

const CHART_AXIS_COLOR = "var(--muted-foreground)";
const CHART_GRID_COLOR = "var(--border)";

const tooltipContentStyle: React.CSSProperties = {
    borderRadius: "10px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--popover)",
    boxShadow: "0 8px 16px rgb(0 0 0 / 0.08)",
    fontSize: "11px",
    color: "var(--popover-foreground)",
};

const FALLBACK_KPIS: TransfersKpis = {
    validatedCount: 0,
    itemsOrdered: 0,
    itemsShipped: 0,
    transferValue: 0,
    signatureCompliancePct: 0,
    signatureConformCount: 0,
    signatureTotalCount: 0,
    barcodeMissingCount: 0,
    barcodeMissingRef: null,
};

const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function TransfersClient() {
    const searchParams = useSearchParams();
    const filters = parseFilters(Object.fromEntries(searchParams.entries()));

    // ✅ Source unique de vérité
    const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useTransfers();
    const isBusy = isLoading || isFetching;

    const [selectedTransfer, setSelectedTransfer] = useState<TransferControlRow | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Dérivés — jamais undefined
    const transfers = data?.transfers ?? [];
    const kpis = data?.kpis ?? FALLBACK_KPIS;
    const destinationChartData = data?.destinationChartData ?? [];

    const handleRefresh = async () => {
        try {
            await refetch();
            toast.success("Transferts actualisés");
        } catch {
            toast.error("Échec de l'actualisation");
        }
    };

    const handlePreview = (ref: string) => {
        const found = transfers.find((t) => t.refTransfert === ref) ?? null;
        setSelectedTransfer(found);
        setDialogOpen(true);
    };

    return (
        <div>
            <ReportPageHeader
                title="Contrôle des Transferts & Audit Codes-Barres"
                subtitle="Conformité documentaire et scanning des transferts inter-boutiques"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isBusy}
                onRefresh={handleRefresh}
            >
                <GlobalFilters filters={filters} compact />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {/* ─── KPIs ─────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Transferts Validés"
                        value={`${kpis.validatedCount} TR`}
                        subtitle={`${fmt(kpis.itemsOrdered)} prévus, ${fmt(kpis.itemsShipped)} expédiés`}
                        icon={<PackageCheck className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Valeur Transférée"
                        value={`${fmt(kpis.transferValue)} $`}
                        subtitle="Marchandises sécurisées en transit"
                        icon={<DollarSign className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Conformité Signature"
                        value={`${kpis.signatureCompliancePct.toFixed(1)} %`}
                        subtitle={`${kpis.signatureConformCount}/${kpis.signatureTotalCount} conformes`}
                        icon={<FileCheck className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isBusy}
                    />
                    <CeoKpiCard
                        label="Alerte Code-Barres"
                        value={`${kpis.barcodeMissingCount} non renseigné`}
                        subtitle={kpis.barcodeMissingRef ?? "—"}
                        icon={<AlertOctagon className="w-3.5 h-3.5" />}
                        iconColor="text-rose-600 dark:text-rose-400"
                        iconBg="bg-rose-50 dark:bg-rose-950/40"
                        isLoading={isBusy}
                    />
                </div>

                {/* ─── Graphique ────────────────────────────────── */}
                <div className="rounded-lg border border-border/60 bg-card p-3 shadow-2xs">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                        Répartition des réceptions par destination
                    </h3>
                    <p className="text-[10px] text-muted-foreground/70 mb-2">
                        Valeur marchande ($) et pièces acheminées par point de vente
                    </p>
                    <div className="h-[210px] w-full">
                        {isBusy && destinationChartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center">
                                <div className="w-full max-w-md h-24 bg-muted rounded animate-pulse" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={destinationChartData}
                                    margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: CHART_AXIS_COLOR, fontWeight: 600 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: CHART_AXIS_COLOR }}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipContentStyle}
                                        formatter={(v, name) => [
                                            `${fmt(Number(v ?? 0))} ${name === "Valeur ($)" ? "$" : "pcs"}`,
                                            name,
                                        ]}
                                    />
                                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                                    <Bar dataKey="Valeur ($)" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                    <Bar dataKey="Prévu (pcs)" fill="var(--chart-3)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                    <Bar dataKey="Expédié (pcs)" fill="var(--chart-4)" radius={[3, 3, 0, 0]} maxBarSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* ─── Tableau ──────────────────────────────────── */}
                <ReportSection
                    index={5}
                    title="Contrôle des transferts mensuels · Validation codes-barres"
                >
                    <TransferControlTable data={transfers} onPreview={handlePreview} />
                </ReportSection>
            </div>

            <TransferPreviewDialog
                transfer={selectedTransfer}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
}