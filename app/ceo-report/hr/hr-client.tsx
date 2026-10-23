// app/ceo-report/hr/hr-client.tsx
"use client";

import {
    Users,
    Banknote,
    Building2,
    Calendar,
    Loader2,
    Download,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import PayrollBarChart from "./_components/payroll-bar-chart";
import LeaseMatrixTable from "./_components/lease-matrix-table";
import HrSalariesTable from "./_components/hr-salaries-table";
import { useHr } from "./_lib/hooks/use-hr";
import { useExportHr } from "./_lib/hooks/use-export-hr";

const fmtMoney = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }) + " $";

export default function HrClient() {
    const { data, isLoading, error } = useHr();
    const { exportHr, isExporting } = useExportHr();

    const kpis = data?.kpis;
    const payroll = data?.payroll ?? [];
    const leases = data?.leases ?? [];
    const hr = data?.hr ?? [];

    return (
        <div>
            {/* ══════════════ HEADER ══════════════ */}
            <ReportPageHeader
                title="Ressources Humaines & Baux"
                subtitle="Masse salariale, effectifs et échéancier des loyers"
                badge={{ label: "RH", tone: "sky" }}
                isLoading={isLoading}
                extraActions={
                    data ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="sm"
                                    disabled={isExporting}
                                    className="h-7 px-2.5 text-[11px] gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
                                >
                                    {isExporting ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Download className="w-3 h-3" />
                                    )}
                                    {isExporting ? "Export…" : "Exporter"}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-56 p-1 rounded-lg shadow-xl"
                            >
                                <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                                    Format
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={isExporting}
                                    onClick={() => exportHr("XLSX")}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    Excel (.xlsx)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={isExporting}
                                    onClick={() => exportHr("CSV")}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    CSV (données brutes)
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={isExporting}
                                    onClick={() => exportHr("PDF")}
                                    className="text-xs py-1.5 cursor-pointer"
                                >
                                    PDF (rapport)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : undefined
                }
            />

            {/* ══════════════ CONTENU ══════════════ */}
            <div className="p-4 sm:p-5 space-y-4">
                {error ? (
                    <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-center text-[11px] text-rose-700 dark:text-rose-400">
                        Erreur :{" "}
                        {error instanceof Error
                            ? error.message
                            : "Inconnue"}
                    </div>
                ) : isLoading ? (
                    <div className="rounded-lg border border-border/60 bg-card p-8 text-center">
                        <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
                            Chargement des données RH & Baux…
                        </p>
                    </div>
                ) : !data ? (
                    <EmptyHr />
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <CeoKpiCard
                                label="Effectif actif"
                                value={String(kpis?.activeStaff ?? 0)}
                                subtitle={`${kpis?.staffInShops ?? 0} en boutique / ${kpis?.staffInHQ ?? 0} au siège`}
                                icon={<Users className="w-3.5 h-3.5" />}
                                iconColor="text-violet-600 dark:text-violet-400"
                                iconBg="bg-violet-50 dark:bg-violet-950/40"
                            />
                            <CeoKpiCard
                                label="Masse salariale chargée"
                                value={fmtMoney(kpis?.payrollLoaded ?? 0)}
                                subtitle={`${fmtMoney(kpis?.baseSalaryTotal ?? 0)} salaires + ${fmtMoney(kpis?.perksTotal ?? 0)} avantages`}
                                icon={<Banknote className="w-3.5 h-3.5" />}
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                            />
                            <CeoKpiCard
                                label="Loyers payés (YTD)"
                                value={fmtMoney(kpis?.rentPaidYtd ?? 0)}
                                subtitle={`Loyer mensuel consolidé : ${fmtMoney(kpis?.monthlyRent ?? 0)}`}
                                icon={<Building2 className="w-3.5 h-3.5" />}
                                iconColor="text-sky-600 dark:text-sky-400"
                                iconBg="bg-sky-50 dark:bg-sky-950/40"
                            />
                            <CeoKpiCard
                                label="Congés cumulés"
                                value={`${kpis?.leavesTotal ?? 0} Jours`}
                                subtitle="Provision passif social à surveiller"
                                icon={<Calendar className="w-3.5 h-3.5" />}
                                iconColor="text-amber-600 dark:text-amber-400"
                                iconBg="bg-amber-50 dark:bg-amber-950/40"
                            />
                        </div>

                        <ReportSection
                            index={1}
                            title="Ventilation du coût salarial chargé par entité"
                        >
                            <PayrollBarChart rows={payroll} />
                        </ReportSection>

                        <ReportSection
                            index={2}
                            title="Matrice des loyers & baux par boutique"
                        >
                            <LeaseMatrixTable rows={leases} />
                        </ReportSection>

                        <ReportSection
                            index={3}
                            title="Tableau de bord RH & salaires"
                        >
                            <HrSalariesTable rows={hr} totals={data.hrTotals} />
                        </ReportSection>
                    </>
                )}
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────── */
/* État vide : aucune donnée RH disponible                      */
/* ──────────────────────────────────────────────────────────── */

function EmptyHr() {
    return (
        <div className="rounded-lg border border-border/60 border-dashed bg-card shadow-2xs p-8 text-center">
            <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="text-[13px] font-semibold text-foreground">
                Aucune donnée RH disponible
            </h3>
            <p className="text-[11px] text-muted-foreground/70 mt-1 max-w-md mx-auto">
                Les données de masse salariale, d'effectifs et de loyers ne sont
                pas encore disponibles pour cet exercice.
            </p>
        </div>
    );
}