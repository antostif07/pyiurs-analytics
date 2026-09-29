"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ReportFilter, Period, Store, Segment } from "../_lib/types/reports";
import { serializeFilters } from "../_lib/filters";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { fr } from "date-fns/locale/fr";
import { Calendar } from "@/components/ui/calendar";

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
    compact?: boolean;
    className?: string;
}

export const AVAILABLE_YEARS: number[] = (() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => currentYear - 3 + i);
})();

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function GlobalFilters({
    filters,
    compact = false,
    className,
}: GlobalFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const update = (partial: Partial<ReportFilter>) => {
        const next: ReportFilter = { ...filters, ...partial };
        const qs = serializeFilters(next).toString();
        startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        });
    };

    // Changement de période : si on quitte "custom", on purge les dates.
    const handlePeriodChange = (period: Period) => {
        if (period === "custom") {
            update({ period });
        } else {
            update({ period, from: undefined, to: undefined });
        }
    };

    // Plage courante (uniquement si period === "custom" ET dates valides)
    const dateRange: DateRange | undefined =
        filters.period === "custom" && filters.from && filters.to
            ? { from: parseISO(filters.from), to: parseISO(filters.to) }
            : undefined;

    const handleRangeSelect = (range: DateRange | undefined) => {
        if (!range?.from || !range?.to) return;
        update({
            from: format(range.from, "yyyy-MM-dd"),
            to: format(range.to, "yyyy-MM-dd"),
        });
    };

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                compact && "gap-1",
                isPending && "opacity-60",
                className,
            )}
        >
            {/* Période */}
            <Select
                value={filters.period}
                onValueChange={(v) => handlePeriodChange(v as Period)}
            >
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

            {/* ⬇️ Picker de dates — visible UNIQUEMENT si period === "custom" */}
            {filters.period === "custom" && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                selectClass,
                                "w-auto px-2 justify-start gap-1.5 font-normal",
                            )}
                        >
                            <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                            {dateRange?.from && dateRange?.to ? (
                                <>
                                    {format(dateRange.from, "dd MMM", { locale: fr })}
                                    <span className="text-muted-foreground/50">→</span>
                                    {format(dateRange.to, "dd MMM yy", { locale: fr })}
                                </>
                            ) : (
                                <span className="text-muted-foreground/60">
                                    Choisir dates
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        className="w-auto p-0 rounded-xl shadow-2xl border-border"
                    >
                        <Calendar
                            mode="range"
                            numberOfMonths={2}
                            locale={fr}
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={handleRangeSelect}
                            className="p-3"
                        />
                    </PopoverContent>
                </Popover>
            )}

            {/* Année */}
            <Select
                value={String(filters.year)}
                onValueChange={(v) => update({ year: Number(v) })}
            >
                <SelectTrigger className={cn(selectClass, "w-20")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {AVAILABLE_YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)} className="text-xs">
                            {y}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Mois */}
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
                        <SelectItem key={i} value={String(i + 1)} className="text-xs">
                            {m}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Boutique */}
            <Select
                value={filters.store}
                onValueChange={(v) => update({ store: v as Store })}
            >
                <SelectTrigger className={cn(selectClass, "w-32")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {STORES.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Segment */}
            <Select
                value={filters.segment}
                onValueChange={(v) => update({ segment: v as Segment })}
            >
                <SelectTrigger className={cn(selectClass, "w-28")}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {SEGMENTS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}