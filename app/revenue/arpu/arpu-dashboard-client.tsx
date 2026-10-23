// app/revenue/arpu/arpu-dashboard-client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import { DashboardSkeleton } from "@/components/new-ui/layout/skeletons";

import ArpuFilters from "./_components/arpu-filters";
import ArpuKpiGrid from "./_components/kpi-grid";
import ArpuAnalytics from "./_components/analytics-section";
import ArpuMonthlyMatrix from "./_components/arpu-monthly-matrix";
import InsightCard from "./_components/insight-card";
import ArpuDistribution from "./_components/arpu-distribution";
import { useArpuData } from "./_lib/hooks/use-arpu";

export default function ArpuDashboardClient() {
    const searchParams = useSearchParams();

    const { data, isLoading, isError, refetch } = useArpuData();

    // Pas d'early return : on garde le header visible même en chargement
    const showSkeleton = isLoading && !data;

    return (
        <div>
            <ReportPageHeader
                title="Intelligence ARPU"
                subtitle="Rentabilité par utilisateur et performance des segments"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                isLoading={isLoading}
                onRefresh={async () => {
                    await refetch();
                }}
            >
                <ArpuFilters />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {showSkeleton ? (
                    <DashboardSkeleton />
                ) : isError ? (
                    <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center gap-2 text-[11px] text-rose-700 dark:text-rose-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        Erreur lors du chargement des données ARPU. Réessayez.
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <ReportSection index={1} title="Indicateurs clés">
                            <ArpuKpiGrid
                                stats={{
                                    arpu: data?.globalArpu || 0,
                                    revenue: data?.totalRevenue || 0,
                                    customers: data?.totalCustomers || 0,
                                }}
                            />
                        </ReportSection>

                        {/* Analytics + Insights */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
                            <div className="xl:col-span-2">
                                <ReportSection index={2} title="Analytiques">
                                    <ArpuAnalytics
                                        chartData={data?.chartData || []}
                                        segmentsMix={data?.segmentsMix || {}}
                                    />
                                </ReportSection>
                            </div>

                            <div className="space-y-4">
                                <ReportSection
                                    index={3}
                                    title="Insights stratégiques"
                                >
                                    <div className="space-y-2">
                                        <InsightCard
                                            type="positive"
                                            text={`ARPU moyen sur la période : ${(data?.globalArpu || 0).toFixed(2)} $ par mobile unique.`}
                                        />
                                        <InsightCard
                                            type={
                                                (data?.totalCustomers ?? 0) < 10
                                                    ? "warning"
                                                    : "positive"
                                            }
                                            text={`Base : ${data?.totalCustomers || 0} clients identifiés via téléphone.`}
                                        />
                                    </div>
                                </ReportSection>

                                <ReportSection
                                    index={4}
                                    title="Revenue mix par segment"
                                >
                                    <ArpuDistribution
                                        data={data?.segmentsMix || {}}
                                    />
                                </ReportSection>
                            </div>
                        </div>

                        {/* Monthly Matrix */}
                        <ReportSection
                            index={5}
                            title="Récapitulatif annuel"
                        >
                            <ArpuMonthlyMatrix
                                data={data?.yearlySummary || []}
                            />
                        </ReportSection>
                    </>
                )}
            </div>
        </div>
    );
}