"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    BadgeCent,
    Banknote,
    CalendarOff,
    CheckCircle2,
    Clock4,
    FileSpreadsheet,
    RefreshCw,
    UserCheck,
    Users,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import HrDashboardFilters from "./_components/hr-dashboard-filters";
import { useHrDashboard } from "./_lib/hooks/use-hr-dashboard";
import type { HrDashboardData } from "./_lib/server/hr-dashboard-service";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function HrDashboardClient({
    initialData,
    initialQueryKeyString,
    initialFetchedAt,
    userRole,
    userName,
}: {
    initialData: HrDashboardData;
    initialQueryKeyString: string;
    initialFetchedAt: number;
    userRole: string;
    userName: string;
}) {
    const {
        data,
        filters,
        isFetching,
        isError,
        error,
        refetch,
        dataUpdatedAt,
    } = useHrDashboard({
        initialData,
        initialQueryKeyString,
        initialFetchedAt,
    });

    const report = data ?? initialData;

    const handleRefresh = async () => {
        const res = await refetch();
        if (res.isError) toast.error("Échec de l'actualisation");
        else toast.success("Tableau de bord RH actualisé");
    };

    if (report.mode === "personal") {
        const quickLinks = [
            { label: "Mes Pointages", href: "/hr/attendance", Icon: Clock4 },
            { label: "Mes Plannings", href: "/hr/schedules", Icon: CheckCircle2 },
            { label: "Mes Congés", href: "/hr/leaves", Icon: CalendarOff },
            { label: "Mes Fiches de Paie", href: "/hr/payroll/payslips", Icon: Banknote },
        ];

        return (
            <div>
                <ReportPageHeader
                    title={`Bonjour, ${userName}`}
                    subtitle={`Mon espace personnel RH · pointage au ${report.date}`}
                    badge={{ label: userRole, tone: "sky" }}
                    lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                    isLoading={isFetching}
                    onRefresh={handleRefresh}
                >
                    <HrDashboardFilters
                        filters={filters}
                        shops={[]}
                        selectedShop="all"
                        showShopAndPayrollFilters={false}
                    />
                </ReportPageHeader>

                <div className="p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <CeoKpiCard
                            label="Pointage sélectionné"
                            value={report.todayAttendance ? report.todayAttendance.status : "Non pointé"}
                            subtitle={
                                report.todayAttendance?.checkIn
                                    ? `Arrivée : ${report.todayAttendance.checkIn}`
                                    : report.date
                            }
                            icon={<Clock4 className="w-3.5 h-3.5" />}
                            iconColor="text-sky-600 dark:text-sky-400"
                            iconBg="bg-sky-50 dark:bg-sky-950/40"
                        />
                        <CeoKpiCard
                            label="Poste & Boutique"
                            value={report.employee?.shopName || "—"}
                            subtitle={report.employee?.jobTitle || "Profil agent non lié"}
                            icon={<Users className="w-3.5 h-3.5" />}
                            iconColor="text-emerald-600 dark:text-emerald-400"
                            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                        />
                        <CeoKpiCard
                            label="Dernier bulletin"
                            value={
                                report.recentPayslips[0]
                                    ? `${fmt(report.recentPayslips[0].netPayable)} ${report.recentPayslips[0].currency}`
                                    : "—"
                            }
                            subtitle={
                                report.recentPayslips[0]
                                    ? `${String(report.recentPayslips[0].month).padStart(2, "0")}/${report.recentPayslips[0].year} · ${report.recentPayslips[0].status}`
                                    : "Aucun bulletin"
                            }
                            icon={<Banknote className="w-3.5 h-3.5" />}
                            iconColor="text-violet-600 dark:text-violet-400"
                            iconBg="bg-violet-50 dark:bg-violet-950/40"
                        />
                        <CeoKpiCard
                            label="Avances / Dettes en cours"
                            value={`${fmt(report.activeDebtsTotal)} $`}
                            subtitle={`${report.activeDebtsCount} dette${report.activeDebtsCount > 1 ? "s" : ""} active${report.activeDebtsCount > 1 ? "s" : ""}`}
                            icon={<BadgeCent className="w-3.5 h-3.5" />}
                            iconColor="text-amber-600 dark:text-amber-400"
                            iconBg="bg-amber-50 dark:bg-amber-950/40"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ReportSection index={1} title="Mes 7 derniers pointages">
                            <div className="rounded-lg border border-border/60 bg-card p-3 divide-y divide-border/40 text-xs">
                                {report.recentAttendances.length === 0 ? (
                                    <p className="py-6 text-center text-muted-foreground italic">
                                        Aucun pointage enregistré jusqu&apos;à cette date.
                                    </p>
                                ) : (
                                    report.recentAttendances.map((a) => (
                                        <div key={a.id} className="py-2 flex items-center justify-between">
                                            <span className="font-mono font-medium">{a.date}</span>
                                            <div className="flex items-center gap-2">
                                                {a.checkIn && (
                                                    <span className="text-[11px] text-muted-foreground font-mono">
                                                        {a.checkIn}
                                                    </span>
                                                )}
                                                <Badge variant="outline" className="h-5 text-[10px]">
                                                    {a.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ReportSection>

                        <ReportSection index={2} title="Accès rapides">
                            <div className="grid grid-cols-2 gap-2.5">
                                {quickLinks.map(({ label, href, Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className="rounded-lg border border-border/60 bg-card p-3.5 hover:bg-accent/40 transition-colors flex items-center justify-between"
                                    >
                                        <span className="inline-flex items-center gap-2 text-xs font-semibold">
                                            <Icon className="w-4 h-4 text-primary" />
                                            {label}
                                        </span>
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        </ReportSection>
                    </div>
                </div>
            </div>
        );
    }

    const payrollSummary =
        report.kpis.payslipNetByCurrency.length > 0
            ? report.kpis.payslipNetByCurrency
                .map((c) => `${fmt(c.amount)} ${c.currency}`)
                .join(" · ")
            : "0,00 $";

    const canPrepPayroll = ["admin", "financier", "manager"].includes(userRole);

    return (
        <div>
            <ReportPageHeader
                title="Tableau de Bord RH"
                subtitle={`Pointages du ${report.date} · Paie ${String(report.month).padStart(2, "0")}/${report.year}`}
                badge={{ label: report.scopeLabel, tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isFetching}
                onRefresh={handleRefresh}
            >
                <HrDashboardFilters
                    filters={filters}
                    shops={report.shops}
                    selectedShop={report.selectedShop}
                    showShopAndPayrollFilters
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

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Agents Actifs"
                        value={String(report.kpis.activeEmployees)}
                        subtitle={`${report.kpis.unrecordedToday} non pointé${report.kpis.unrecordedToday > 1 ? "s" : ""}`}
                        icon={<Users className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Présents à la date"
                        value={String(report.kpis.presentToday)}
                        subtitle={`${report.kpis.lateToday} retard${report.kpis.lateToday > 1 ? "s" : ""} · ${report.kpis.absentToday} absent${report.kpis.absentToday > 1 ? "s" : ""}`}
                        icon={<UserCheck className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="Paie du mois"
                        value={payrollSummary}
                        subtitle={`${report.kpis.payslipsValidatedOrPaid} / ${report.kpis.payslipsTotal} bulletin(s) validé(s)`}
                        icon={<Banknote className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                    <CeoKpiCard
                        label="Dettes / Avances actives"
                        value={`${fmt(report.kpis.activeDebtsTotal)} $`}
                        subtitle={`${report.kpis.activeDebtsCount} dossier${report.kpis.activeDebtsCount > 1 ? "s" : ""} en cours`}
                        icon={<BadgeCent className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <ReportSection index={1} title={`Présences · ${report.date}`}>
                        <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2 text-xs">
                            {report.attendanceBreakdown.length === 0 ? (
                                <p className="py-6 text-center text-muted-foreground italic">
                                    Aucune donnée de présence.
                                </p>
                            ) : (
                                report.attendanceBreakdown.map((item) => (
                                    <div
                                        key={item.status}
                                        className="flex items-center justify-between py-1 border-b last:border-none border-border/40"
                                    >
                                        <span className="text-muted-foreground">{item.label}</span>
                                        <Badge variant="secondary" className="h-5 font-mono text-[11px]">
                                            {item.count}
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </ReportSection>

                    <ReportSection index={2} title="Retards signalés">
                        <div className="rounded-lg border border-border/60 bg-card p-3 space-y-2 text-xs">
                            {report.recentLateEmployees.length === 0 ? (
                                <p className="py-6 text-center text-muted-foreground italic">
                                    Aucun retard enregistré sur cette date.
                                </p>
                            ) : (
                                report.recentLateEmployees.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between py-1 border-b last:border-none border-border/40"
                                    >
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{r.employeeName}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {r.shopName} {r.checkIn ? `· ${r.checkIn}` : ""}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="h-5 text-[10px] text-amber-700 dark:text-amber-400 border-amber-200/60 shrink-0"
                                        >
                                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                            +{r.lateMinutes} min
                                        </Badge>
                                    </div>
                                ))
                            )}
                        </div>
                    </ReportSection>

                    <ReportSection index={3} title="Accès rapides RH">
                        <div className="space-y-2">
                            <Link
                                href="/hr/employees"
                                className="rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/40 transition-colors flex items-center justify-between text-xs font-semibold"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Users className="w-4 h-4 text-sky-600" />
                                    Annuaire Employés
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </Link>
                            <Link
                                href="/hr/attendance"
                                className="rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/40 transition-colors flex items-center justify-between text-xs font-semibold"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Clock4 className="w-4 h-4 text-emerald-600" />
                                    Pointages (Présences)
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </Link>
                            {canPrepPayroll && (
                                <Link
                                    href="/hr/payroll/preparation"
                                    className="rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/40 transition-colors flex items-center justify-between text-xs font-semibold"
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-violet-600" />
                                        Préparation de la Paie
                                    </span>
                                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                                </Link>
                            )}
                            <Link
                                href="/hr/payroll/payslips"
                                className="rounded-lg border border-border/60 bg-card p-3 hover:bg-accent/40 transition-colors flex items-center justify-between text-xs font-semibold"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Banknote className="w-4 h-4 text-amber-600" />
                                    Fiches de Paie
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                            </Link>
                        </div>
                    </ReportSection>
                </div>
            </div>
        </div>
    );
}