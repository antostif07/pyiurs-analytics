"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    ArrowLeft,
    Banknote,
    BadgeCent,
    Clock4,
    ShieldAlert,
    Store,
    Mail,
    Phone,
    MapPin,
    User,
    CheckCircle2,
    Calendar,
    AlertTriangle,
    Clock,
    DollarSign,
    Briefcase,
    Building2,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { EmployeeFolderData } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950 text-white";

type TabKey = "payslips" | "debts" | "attendances" | "sanctions";

export default function EmployeeFolderClient({
    data,
    userRole,
}: {
    data: EmployeeFolderData;
    userRole: string;
}) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>("payslips");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { employee, payslips, debts, attendances } = data;

    const initials = employee.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const activeDebtsTotal = debts
        .filter((d) => d.status === "active")
        .reduce((s, d) => s + d.remainingAmount, 0);

    const latesCount = attendances.filter((a) => a.isLate).length;

    const handleRefresh = async () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => {
            setIsRefreshing(false);
            toast.success("Dossier actualisé");
        }, 400);
    };

    return (
        <div className="space-y-4">
            {/* Header new-ui */}
            <ReportPageHeader
                title={employee.name}
                subtitle={`${employee.jobTitle || "Poste non défini"} · ${employee.department || "Sans département"}`}
                badge={{
                    label: employee.isActive ? "Actif" : "Inactif",
                    tone: employee.isActive ? "emerald" : "rose",
                }}
                isLoading={isRefreshing}
                onRefresh={handleRefresh}
                extraActions={
                    <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5">
                        <Link href="/hr/employees">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Retour à l&apos;annuaire</span>
                        </Link>
                    </Button>
                }
            />

            <div className="p-4 sm:p-5 space-y-4">
                {/* 1. FICHE SYNTHÈSE COLLABORATEUR (Profil + Rémunération) */}
                <div className="rounded-xl border border-border/60 bg-card p-5 shadow-2xs">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                        <div className="flex items-start sm:items-center gap-4">
                            <Avatar className="h-14 w-14 border border-border shadow-xs shrink-0">
                                <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-bold text-foreground">{employee.name}</h2>
                                    {employee.matricule && (
                                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                            {employee.matricule}
                                        </Badge>
                                    )}
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] px-1.5 py-0 font-semibold",
                                            employee.isActive
                                                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60"
                                                : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60"
                                        )}
                                    >
                                        {employee.isActive ? "En poste" : "Contrat suspendu"}
                                    </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1 font-medium text-foreground">
                                        <Briefcase className="w-3 h-3 text-muted-foreground" />
                                        {employee.jobTitle || "Poste non défini"}
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-3 h-3 text-muted-foreground" />
                                        {employee.department || "Sans département"}
                                    </span>
                                    {employee.shopName && (
                                        <>
                                            <span>·</span>
                                            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-medium">
                                                <Store className="w-3 h-3" />
                                                {employee.shopName}
                                            </span>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-2">
                                    {employee.servicePhone && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {employee.servicePhone}
                                        </span>
                                    )}
                                    {employee.email && (
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" /> {employee.email}
                                        </span>
                                    )}
                                    {employee.dailyWorkStartTime && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Début service : {employee.dailyWorkStartTime}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bloc Contrat & Rémunération */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
                            <div className="rounded-lg bg-secondary/50 border border-border/60 p-3 text-left sm:text-right flex-1 sm:flex-initial min-w-[170px]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Salaire de base
                                </span>
                                <span className="text-sm font-mono font-bold text-foreground">
                                    {fmt(employee.baseSalary)} {employee.salaryCurrency}
                                </span>
                                {employee.transportAllowance > 0 && (
                                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        + {fmt(employee.transportAllowance)} {employee.salaryCurrency} (transport)
                                    </span>
                                )}
                            </div>

                            <div className="rounded-lg bg-secondary/50 border border-border/60 p-3 text-left sm:text-right flex-1 sm:flex-initial min-w-[150px]">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Supérieur N+1
                                </span>
                                <span className="text-xs font-semibold text-foreground truncate block">
                                    {employee.managerName || "Non assigné"}
                                </span>
                                <span className="text-[10px] text-muted-foreground block mt-0.5">
                                    Manager direct
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. CARTES KPIS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Fiches de paie"
                        value={String(payslips.length)}
                        subtitle="Historique des bulletins"
                        icon={<Banknote className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Dettes / Avances"
                        value={`${fmt(activeDebtsTotal)} $`}
                        subtitle={`${debts.filter((d) => d.status === "active").length} avance(s) en cours`}
                        icon={<BadgeCent className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                    />
                    <CeoKpiCard
                        label="Retards (30 jours)"
                        value={String(latesCount)}
                        subtitle={latesCount > 0 ? "Retards enregistrés" : "Excellente ponctualité"}
                        icon={<Clock4 className="w-3.5 h-3.5" />}
                        iconColor={latesCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}
                        iconBg={latesCount > 0 ? "bg-rose-50 dark:bg-rose-950/40" : "bg-emerald-50 dark:bg-emerald-950/40"}
                    />
                    <CeoKpiCard
                        label="Pointages récents"
                        value={String(attendances.length)}
                        subtitle="Derniers jours relevés"
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                </div>

                {/* 3. NAVIGATION PAR ONGLETS */}
                <div className="flex border-b border-border/60 gap-1 overflow-x-auto pb-px">
                    {[
                        { id: "payslips", label: `Fiches de Paie (${payslips.length})`, icon: Banknote },
                        { id: "debts", label: `Dettes & Avances (${debts.length})`, icon: BadgeCent },
                        { id: "attendances", label: `Présences & Retards (${attendances.length})`, icon: Clock4 },
                        { id: "sanctions", label: "Dossier Disciplinaire (0)", icon: ShieldAlert },
                    ].map((t) => {
                        const Icon = t.icon;
                        const isActive = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as TabKey)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/60"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* 4. CONTENUS DES ONGLETS */}

                {/* ONGLET 1 : PAIE */}
                {activeTab === "payslips" && (
                    <ReportSection index={1} title={`Historique des Fiches de Paie (${payslips.length})`}>
                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Période</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Salaire Base</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Commissions</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Déductions</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Remb. Avances</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Net à Payer</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Statut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {payslips.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground italic">
                                                    Aucune fiche de paie enregistrée pour ce collaborateur.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            payslips.map((p) => (
                                                <TableRow key={p.id} className="hover:bg-accent/30 transition-colors">
                                                    <TableCell className="py-2 px-3 font-semibold text-foreground">
                                                        {String(p.month).padStart(2, "0")} / {p.year}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                                                        {fmt(p.baseSalary)} {p.currency}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        +{fmt(p.commissionsTotal)} {p.currency}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                                                        -{fmt(p.deductionsAbsences)} {p.currency}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                                                        -{fmt(p.advanceRepayments)} {p.currency}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono font-bold tabular-nums text-foreground">
                                                        {fmt(p.netPayable)} {p.currency}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "h-5 text-[10px] font-semibold",
                                                                p.status === "paid"
                                                                    ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60"
                                                                    : p.status === "validated"
                                                                        ? "text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60"
                                                                        : "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60"
                                                            )}
                                                        >
                                                            {p.status === "paid" ? "Payé" : p.status === "validated" ? "Validé" : "Brouillon"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </ReportSection>
                )}

                {/* ONGLET 2 : DETTES & AVANCES */}
                {activeTab === "debts" && (
                    <ReportSection index={2} title={`Dettes et Avances sur Salaire (${debts.length})`}>
                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Date d&apos;octroi</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Motif / Objet</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Montant Initial</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-right", HEADER_BG)}>Reste à rembourser</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Statut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {debts.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground italic">
                                                    Aucune dette ni avance enregistrée.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            debts.map((d) => (
                                                <TableRow key={d.id} className="hover:bg-accent/30 transition-colors">
                                                    <TableCell className="py-2 px-3 text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(d.createdAt), "dd MMM yyyy", { locale: fr })}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 font-medium text-foreground">
                                                        {d.reason}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-muted-foreground">
                                                        {fmt(d.initialAmount)} $
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400">
                                                        {fmt(d.remainingAmount)} $
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "h-5 text-[10px] font-semibold",
                                                                d.status === "active"
                                                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 border-amber-200/60"
                                                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 border-emerald-200/60"
                                                            )}
                                                        >
                                                            {d.status === "active" ? "En cours" : "Soldé"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </ReportSection>
                )}

                {/* ONGLET 3 : PRÉSENCES & RETARDS */}
                {activeTab === "attendances" && (
                    <ReportSection index={3} title={`Historique Récent des Pointages (${attendances.length} derniers jours)`}>
                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Date</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Heure Arrivée</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Heure Départ</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Retard (min)</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-center", HEADER_BG)}>Statut</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] text-white uppercase text-left", HEADER_BG)}>Observation / Justification</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {attendances.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground italic">
                                                    Aucun relevé de pointage enregistré pour ce collaborateur.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            attendances.map((a) => (
                                                <TableRow key={a.id} className="hover:bg-accent/30 transition-colors">
                                                    <TableCell className="py-2 px-3 font-medium text-foreground whitespace-nowrap">
                                                        {a.date}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center font-mono text-muted-foreground">
                                                        {a.checkIn || "—"}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center font-mono text-muted-foreground">
                                                        {a.checkOut || "—"}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center font-mono">
                                                        {a.isLate ? (
                                                            <span className="font-bold text-amber-600 dark:text-amber-400">
                                                                +{a.arrivalLateMinutes} min
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground/50">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "h-5 text-[10px] font-semibold",
                                                                a.status === "present"
                                                                    ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60"
                                                                    : a.status === "late"
                                                                        ? "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60"
                                                                        : a.status === "absent"
                                                                            ? "text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60"
                                                                            : "text-muted-foreground bg-muted/40 border-border/60"
                                                            )}
                                                        >
                                                            {a.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-muted-foreground">
                                                        {a.observation || "—"}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </ReportSection>
                )}

                {/* ONGLET 4 : DOSSIER DISCIPLINAIRE / SANCTIONS */}
                {activeTab === "sanctions" && (
                    <ReportSection index={4} title="Dossier Disciplinaire & Mesures">
                        <div className="rounded-lg border border-dashed border-border/80 bg-card p-12 text-center space-y-2">
                            <ShieldAlert className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                            <h4 className="text-xs font-semibold text-foreground">Dossier disciplinaire vierge</h4>
                            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                                Aucun avertissement, mise à pied ou blâme n&apos;est enregistré dans le dossier de cet agent.
                            </p>
                        </div>
                    </ReportSection>
                )}
            </div>
        </div>
    );
}