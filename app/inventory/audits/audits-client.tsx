// app/inventory/audits/audits-client.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
    ScanLine,
    Store,
    CheckCircle2,
    Clock,
    ChevronRight,
    Boxes,
    TrendingDown,
    Lock,
    FileEdit,
    FileCheck2,
    Search,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AuditStatus } from "./_lib/types";
import { useAudits } from "./_lib/hooks/use-audits";
import { NewAuditDialog } from "./_components/new-audit-dialog";
import { DeleteAuditButton } from "./_components/delete-audit-button";

// ─────────────────────────────────────────────────────────────────────────

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

const fmtUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);

const fmtInt = (n: number) => n.toLocaleString("fr-FR");

interface AllowedShop {
    id: string;
    name: string;
    odoo_company_id: number | null;
}

interface AuditsClientProps {
    allowedShops: AllowedShop[];
}

export default function AuditsClient({ allowedShops }: AuditsClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const { data, isLoading } = useAudits();
    const audits = data?.audits ?? [];

    const statusFilter = searchParams.get("status") ?? "all";
    const searchFilter = searchParams.get("search") ?? "";

    // ─── KPIs ─────────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const total = audits.length;
        const active = audits.filter(
            (a) => a.status === "in_progress" || a.status === "draft",
        ).length;
        const pending = audits.filter((a) => a.status === "completed").length;
        const totalScanned = audits.reduce(
            (s, a) => s + (a.total_items_scanned ?? 0),
            0,
        );
        const netDiscrepancy = audits.reduce(
            (s, a) => s + (Number(a.total_discrepancy_value) || 0),
            0,
        );
        return { total, active, pending, totalScanned, netDiscrepancy };
    }, [audits]);

    const updateUrl = (updates: Record<string, string | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [k, v] of Object.entries(updates)) {
            if (!v || v === "all" || v === "") params.delete(k);
            else params.set(k, v);
        }
        const qs = params.toString();
        startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        });
    };

    return (
        <div>
            <ReportPageHeader
                title="Audits & Inventaires Physiques"
                subtitle="Comptage au scanner et suivi analytique de la démarque ($ USD)"
                badge={{ label: "Stock", tone: "violet" }}
            >
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Recherche */}
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60 pointer-events-none" />
                        <Input
                            type="text"
                            placeholder="Rechercher..."
                            defaultValue={searchFilter}
                            onBlur={(e) =>
                                updateUrl({ search: e.target.value.trim() })
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    updateUrl({
                                        search: e.currentTarget.value.trim(),
                                    });
                                }
                            }}
                            className="h-7 w-48 pl-7 text-[11.5px] bg-secondary/60"
                        />
                    </div>

                    {/* Filtre statut */}
                    <Select
                        value={statusFilter}
                        onValueChange={(v) => updateUrl({ status: v })}
                    >
                        <SelectTrigger className="h-7 w-40 text-[11.5px] bg-secondary/60 rounded-lg">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="text-xs">
                                Tous statuts
                            </SelectItem>
                            <SelectItem value="draft" className="text-xs">
                                Brouillon
                            </SelectItem>
                            <SelectItem value="in_progress" className="text-xs">
                                Scan en cours
                            </SelectItem>
                            <SelectItem value="completed" className="text-xs">
                                À valider
                            </SelectItem>
                            <SelectItem value="validated" className="text-xs">
                                Validé
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    {isPending && (
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60" />
                    )}
                </div>
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <CeoKpiCard
                        label="Total Sessions"
                        value={String(kpis.total)}
                        subtitle={`${kpis.total} session${kpis.total > 1 ? "s" : ""}`}
                        icon={<ScanLine className="w-3.5 h-3.5" />}
                        iconColor="text-violet-600 dark:text-violet-400"
                        iconBg="bg-violet-50 dark:bg-violet-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="En cours / Attente"
                        value={String(kpis.active)}
                        subtitle={`${kpis.pending} à valider`}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        iconColor="text-amber-600 dark:text-amber-400"
                        iconBg="bg-amber-50 dark:bg-amber-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Unités Scannées"
                        value={fmtInt(kpis.totalScanned)}
                        subtitle="Sur l'ensemble des sessions"
                        icon={<Boxes className="w-3.5 h-3.5" />}
                        iconColor="text-sky-600 dark:text-sky-400"
                        iconBg="bg-sky-50 dark:bg-sky-950/40"
                        isLoading={isLoading}
                    />
                    <CeoKpiCard
                        label="Démarque Nette"
                        value={fmtUSD(kpis.netDiscrepancy)}
                        subtitle="Écart cumulé en $"
                        icon={<TrendingDown className="w-3.5 h-3.5" />}
                        iconColor={
                            kpis.netDiscrepancy < 0
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-emerald-600 dark:text-emerald-400"
                        }
                        iconBg={
                            kpis.netDiscrepancy < 0
                                ? "bg-rose-50 dark:bg-rose-950/40"
                                : "bg-emerald-50 dark:bg-emerald-950/40"
                        }
                        isLoading={isLoading}
                    />
                </div>

                {/* Table */}
                <ReportSection
                    index={1}
                    title="Sessions d'inventaires enregistrées"
                    actions={
                        <NewAuditDialog shops={allowedShops} />
                    }
                >
                    {isLoading ? (
                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                            <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
                                Chargement des sessions…
                            </p>
                        </div>
                    ) : audits.length === 0 ? (
                        <div className="rounded-lg border border-border/60 border-dashed bg-card shadow-2xs p-8 text-center">
                            <ScanLine className="mx-auto w-6 h-6 text-muted-foreground/40" />
                            <h3 className="text-[12px] font-semibold text-foreground mt-2">
                                Aucune session d&apos;audit trouvée
                            </h3>
                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                {searchFilter || statusFilter !== "all"
                                    ? "Essayez d'élargir les filtres."
                                    : "Cliquez sur « Nouvel audit » pour démarrer un comptage."}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="w-full text-[11px]">
                                    <TableHeader className={HEADER_BG}>
                                        <TableRow className={cn("border-none", HEADER_BG)}>
                                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[150px]">
                                                Référence / Date
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-left text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[130px]">
                                                Boutique
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[110px]">
                                                Département
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[90px]">
                                                Scans
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[100px]">
                                                Écart Qté
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[110px]">
                                                Écart ($)
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-center text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[120px]">
                                                Statut
                                            </TableHead>
                                            <TableHead className="py-2 px-3 text-right text-[10px] font-semibold text-white uppercase tracking-wider h-auto min-w-[140px]">
                                                Actions
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-border/40">
                                        {audits.map((a) => {
                                            const diffQty = a.total_discrepancy_qty ?? 0;
                                            const diffVal = Number(a.total_discrepancy_value) || 0;
                                            return (
                                                <TableRow
                                                    key={a.id}
                                                    className="hover:bg-accent/30 transition-colors border-b border-border/40"
                                                >
                                                    <TableCell className="py-1.5 px-3 text-left">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-[11px] font-bold text-foreground">
                                                                {a.reference}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground/70 tabular-nums mt-0.5">
                                                                {a.created_at
                                                                    ? format(new Date(a.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })
                                                                    : "—"}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-left">
                                                        <div className="flex items-center gap-1.5">
                                                            <Store className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                                            <span className="text-[11px] font-medium text-foreground truncate">
                                                                {a.shop_name}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className="h-5 px-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/30 border-border/60"
                                                        >
                                                            {a.department}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-foreground">
                                                        {fmtInt(a.total_items_scanned ?? 0)}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums">
                                                        <span className={cn("font-semibold",
                                                            diffQty < 0 ? "text-rose-600 dark:text-rose-400" :
                                                                diffQty > 0 ? "text-emerald-600 dark:text-emerald-400" :
                                                                    "text-muted-foreground/50")}>
                                                            {diffQty > 0 ? `+${diffQty}` : diffQty}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums">
                                                        <span className={cn("font-semibold",
                                                            diffVal < 0 ? "text-rose-600 dark:text-rose-400" :
                                                                diffVal > 0 ? "text-emerald-600 dark:text-emerald-400" :
                                                                    "text-muted-foreground/50")}>
                                                            {diffVal > 0 ? `+${fmtUSD(diffVal)}` : fmtUSD(diffVal)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-center">
                                                        <AuditStatusBadge status={a.status} />
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link href={`/inventory/audits/${a.id}`}>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-[10px] gap-1 border-border/80 hover:bg-accent/60"
                                                                >
                                                                    <span>
                                                                        {a.status === "validated" ? "Consulter" : "Ouvrir"}
                                                                    </span>
                                                                    <ChevronRight className="w-3 h-3" />
                                                                </Button>
                                                            </Link>
                                                            {a.status !== "validated" ? (
                                                                <DeleteAuditButton
                                                                    auditId={a.id}
                                                                    reference={a.reference}
                                                                />
                                                            ) : (
                                                                <div className="p-1 text-muted-foreground/40" title="Audit validé et verrouillé">
                                                                    <Lock className="w-3 h-3" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </ReportSection>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────

const AUDIT_STATUSES = [
    "draft",
    "in_progress",
    "completed",
    "validated",
] as const satisfies readonly AuditStatus[];

function isAuditStatus(v: unknown): v is AuditStatus {
    return (
        typeof v === "string" &&
        (AUDIT_STATUSES as readonly string[]).includes(v)
    );
}

function AuditStatusBadge({ status }: { status: unknown }) {
    if (!isAuditStatus(status)) {
        return (
            <Badge variant="outline" className="text-[10px]">
                {String(status)}
            </Badge>
        );
    }

    switch (status) {
        case "draft":
            return (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/40 border-border/60">
                    <FileEdit className="w-2.5 h-2.5 mr-1" />
                    Brouillon
                </Badge>
            );
        case "in_progress":
            return (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60">
                    <Clock className="w-2.5 h-2.5 mr-1" />
                    Scan en cours
                </Badge>
            );
        case "completed":
            return (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60">
                    <FileCheck2 className="w-2.5 h-2.5 mr-1" />À valider
                </Badge>
            );
        case "validated":
            return (
                <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                    Validé
                </Badge>
            );
    }
}