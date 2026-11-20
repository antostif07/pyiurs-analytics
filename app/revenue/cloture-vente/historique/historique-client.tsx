"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
    ArrowLeft,
    Building,
    Calendar,
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileText,
    Search,
    Store,
} from "lucide-react";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
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
import type { ClotureDataView } from "@/lib/cloture-service";
import { pdfService } from "@/lib/pdf/cloture-service";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function HistoriqueClient({
    clotures,
}: {
    clotures: ClotureDataView[];
}) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return clotures.filter((c) => {
            if (statusFilter === "completed" && c.closure_status !== "completed") return false;
            if (statusFilter === "pending" && c.closure_status === "completed") return false;
            if (!q) return true;
            return (
                (c.shop_name ?? "").toLowerCase().includes(q) ||
                c.opening_date.includes(q) ||
                c.closing_date.includes(q)
            );
        });
    }, [clotures, search, statusFilter]);

    const formatPeriod = (openingDate?: string | null, closingDate?: string | null) => {
        if (!openingDate && !closingDate) return "—";
        const opening = new Date(openingDate ?? closingDate!);
        const closing = new Date(closingDate ?? openingDate!);
        if (opening.toDateString() === closing.toDateString()) {
            return format(opening, "dd MMM yyyy", { locale: fr });
        }
        return `${format(opening, "dd/MM")} → ${format(closing, "dd MMM yyyy", { locale: fr })}`;
    };

    const getStatusBadge = (status?: string) => {
        const map = {
            draft: { label: "Brouillon", cls: "text-muted-foreground bg-muted/40 border-border/60" },
            manager_validated: { label: "Manager OK", cls: "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60" },
            financier_validated: { label: "Financier OK", cls: "text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-200/60" },
            completed: { label: "Terminée", cls: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60" },
        };
        const item = map[(status ?? "draft") as keyof typeof map] ?? map.draft;
        return (
            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-semibold", item.cls)}>
                {item.label}
            </Badge>
        );
    };

    const handleDownloadPDF = async (cloture: ClotureDataView) => {
        try {
            const pdfData = {
                closure: cloture,
                mainCash: cloture.cash_closure_main_cash || [],
                secondaryCash: cloture.cash_closure_secondary_cash || [],
                denominations: (cloture.denominations || []).map((d) => ({
                    id: d.id || "",
                    cash_closure_id: d.cash_closure_id,
                    currency: d.currency,
                    denomination: d.denomination,
                    quantity: d.quantity || 0,
                    amount: d.amount || 0,
                    created_at: d.created_at || new Date().toISOString(),
                })),
                shopInfo: { name: cloture.shop_name || `Boutique #${cloture.shop_id}` },
            };

            const blob = await pdfService.generateCloturePDF(pdfData);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const safeDate = cloture.closing_date ?? cloture.opening_date ?? new Date().toISOString();
            link.download = `cloture-${cloture.id}-${format(new Date(safeDate), "dd-MM-yyyy")}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Erreur lors de la génération du PDF");
        }
    };

    const completedCount = clotures.filter((c) => c.closure_status === "completed").length;

    return (
        <div>
            <ReportPageHeader
                title="Historique des Clôtures"
                subtitle="Consultation des clôtures de caisse enregistrées"
                badge={{ label: "Archives", tone: "neutral" }}
            >
                <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1.5">
                    <Link href="/revenue/cloture-vente">
                        <ArrowLeft className="w-3 h-3" />
                        Clôture du jour
                    </Link>
                </Button>
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Total Clôtures"
                        value={String(clotures.length)}
                        icon={<FileText className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                    />
                    <CeoKpiCard
                        label="Terminées"
                        value={String(completedCount)}
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        iconColor="text-emerald-600 dark:text-emerald-400"
                        iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                    />
                    <CeoKpiCard
                        label="En attente"
                        value={String(clotures.length - completedCount)}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                    />
                    <CeoKpiCard
                        label="Boutiques"
                        value={String(new Set(clotures.map((c) => c.shop_id)).size)}
                        icon={<Store className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                    />
                </div>

                <ReportSection index={1} title="Liste des clôtures">
                    <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="relative w-full sm:w-72">
                                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Rechercher boutique ou date..."
                                    className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                                {(
                                    [
                                        { id: "all", label: `Toutes (${clotures.length})` },
                                        { id: "completed", label: `Terminées (${completedCount})` },
                                        { id: "pending", label: `En attente (${clotures.length - completedCount})` },
                                    ] as const
                                ).map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[10.5px] font-medium transition-colors",
                                            statusFilter === tab.id
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:text-foreground",
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-left", HEADER_BG)}>Période</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-left", HEADER_BG)}>Boutique</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>Ventes</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>Dépenses</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>Différence</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-center", HEADER_BG)}>Statut</TableHead>
                                            <TableHead className={cn("py-2 px-3 text-[10px] font-semibold text-white uppercase text-right", HEADER_BG)}>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {filtered.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="py-8 text-center text-[11px] text-muted-foreground italic">
                                                    Aucune clôture trouvée.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filtered.map((c) => (
                                                <TableRow key={c.id} className="hover:bg-accent/30">
                                                    <TableCell className="py-2 px-3">
                                                        <span className="inline-flex items-center gap-1.5 font-medium">
                                                            <Calendar className="w-3 h-3 text-muted-foreground" />
                                                            {formatPeriod(c.opening_date, c.closing_date)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Building className="w-3 h-3 text-muted-foreground" />
                                                            {c.shop_name || `Boutique #${c.shop_id}`}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-semibold">
                                                        {fmt(c.total_sales ?? 0)} $
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                                                        {fmt(c.total_expenses ?? 0)} $
                                                    </TableCell>
                                                    <TableCell
                                                        className={cn(
                                                            "py-2 px-3 text-right font-mono tabular-nums font-semibold",
                                                            Math.abs(c.difference ?? 0) < 0.01
                                                                ? "text-emerald-600 dark:text-emerald-400"
                                                                : (c.difference ?? 0) > 0
                                                                    ? "text-amber-600 dark:text-amber-400"
                                                                    : "text-rose-600 dark:text-rose-400",
                                                        )}
                                                    >
                                                        {fmt(c.difference ?? 0)} $
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-center">
                                                        {getStatusBadge(c.closure_status)}
                                                    </TableCell>
                                                    <TableCell className="py-2 px-3 text-right">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <Button asChild variant="outline" size="sm" className="h-6 px-2 text-[10px] gap-1">
                                                                <Link href={`/revenue/cloture-vente/${c.id}`}>
                                                                    <Eye className="w-3 h-3" />
                                                                    Voir
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDownloadPDF(c)}
                                                                className="h-6 px-2 text-[10px] gap-1"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                PDF
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </ReportSection>
            </div>
        </div>
    );
}