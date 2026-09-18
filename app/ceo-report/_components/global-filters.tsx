"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ReportFilter, Period, Store, Segment } from "../_lib/types/reports";
import { serializeFilters } from "../_lib/filters";

const PERIODS: { value: Period; label: string }[] = [
    { value: "today", label: "Aujourd'hui" },
    { value: "week", label: "Cette semaine" },
    { value: "month", label: "Ce mois" },
    { value: "last_month", label: "Mois précédent" },
    { value: "quarter", label: "Trimestre" },
    { value: "year", label: "Année" },
    { value: "custom", label: "Personnalisé" },
];

const STORES: { value: Store; label: string }[] = [
    { value: "all", label: "Toutes boutiques" },
    { value: "P24", label: "P24" },
    { value: "P.MTO", label: "P.MTO" },
    { value: "P.LMB", label: "P.LMB" },
    { value: "P.KTM", label: "P.KTM" },
    { value: "P.ONL", label: "P.ONL" },
    { value: "P.BC", label: "P.BC" },
];

const SEGMENTS: { value: Segment; label: string }[] = [
    { value: "all", label: "Tous segments" },
    { value: "Femme", label: "Femme" },
    { value: "Kids", label: "Kids" },
    { value: "Beauty", label: "Beauty" },
];

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface GlobalFiltersProps {
    filters: ReportFilter;
    onRefresh?: () => void;
    onExport?: () => void;
    compact?: boolean;
}

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function GlobalFilters({
    filters,
    onRefresh,
    onExport,
    compact = false,
}: GlobalFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const update = (partial: Partial<ReportFilter>) => {
        const next: ReportFilter = { ...filters, ...partial };
        const sp = serializeFilters(next);
        const qs = sp.toString();
        startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        });
    };

    const handleRefresh = () => {
        if (onRefresh) return onRefresh();
        startTransition(() => router.refresh());
    };

    const handleExport = () => {
        if (onExport) return onExport();
        // TODO: export CSV / XLSX — à brancher (route handler ou server action)
    };

    return (
        <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
            <Select value={filters.period} onValueChange={(v) => update({ period: v as Period })}>
                <SelectTrigger className={cn(selectClass, "w-32")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value} className="text-xs">
                            {p.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={String(filters.year)} onValueChange={(v) => update({ year: Number(v) })}>
                <SelectTrigger className={cn(selectClass, "w-20")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026].map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={filters.month !== null ? String(filters.month) : "all"}
                onValueChange={(v) => update({ month: v === "all" ? null : Number(v) })}
            >
                <SelectTrigger className={cn(selectClass, "w-28")}>
                    <SelectValue placeholder="Tous mois" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">Tous mois</SelectItem>
                    {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)} className="text-xs">{m}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.store} onValueChange={(v) => update({ store: v as Store })}>
                <SelectTrigger className={cn(selectClass, "w-32")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {STORES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={filters.segment} onValueChange={(v) => update({ segment: v as Segment })}>
                <SelectTrigger className={cn(selectClass, "w-28")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {SEGMENTS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isPending}
                    className="h-7 px-2 text-[11px] gap-1.5 text-muted-foreground/60 hover:text-foreground"
                >
                    {isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                </Button>
                {onExport && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExport}
                        className="h-7 px-2 text-[11px] gap-1.5 text-muted-foreground/60 hover:text-foreground"
                    >
                        <Download size={11} />
                    </Button>
                )}
            </div>
        </div>
    );
}