"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Activity, Building2, CalendarIcon, Check, Filter } from "lucide-react";
import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseCompany, ExpenseState } from "../_lib/types";

const STATE_OPTIONS: Array<{ value: ExpenseState; label: string }> = [
    { value: "draft", label: "Brouillon" },
    { value: "submitted", label: "Soumis" },
    { value: "approved", label: "Approuvé" },
    { value: "posted", label: "Comptabilisé" },
    { value: "in_payment", label: "En cours" },
    { value: "paid", label: "Payé" },
    { value: "refused", label: "Refusé" },
];

interface ExpensesFiltersProps {
    from: string;
    to: string;
    categoryIds: number[];
    categories: ExpenseCategory[];
    companyId: number | null;
    companies: ExpenseCompany[];
    state: ExpenseState | null;
}

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function ExpensesFilters({
    from,
    to,
    categoryIds,
    categories,
    companyId,
    companies,
    state,
}: ExpensesFiltersProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [dateOpen, setDateOpen] = useState(false);
    const [draftRange, setDraftRange] = useState<DateRange | undefined>({
        from: parseISO(from),
        to: parseISO(to),
    });

    useEffect(() => {
        setDraftRange({ from: parseISO(from), to: parseISO(to) });
    }, [from, to]);

    // Mise à jour URL shallow sans déclencher de navigation RSC serveur
    const updateUrl = (params: URLSearchParams) => {
        const qs = params.toString();
        const nextUrl = qs ? `${pathname}?${qs}` : pathname;
        window.history.replaceState(null, "", nextUrl);
    };

    const applyRange = (range: DateRange | undefined) => {
        if (!range?.from) return;
        const next = new URLSearchParams(searchParams.toString());
        next.set("from", format(range.from, "yyyy-MM-dd"));
        next.set("to", format(range.to ?? range.from, "yyyy-MM-dd"));
        updateUrl(next);
        setDateOpen(false);
    };

    const handleDateSelect = (range: DateRange | undefined) => {
        setDraftRange(range);
    };

    const applyPreset = (range: DateRange) => {
        setDraftRange(range);
        applyRange(range);
    };

    const handleCompanyChange = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value === "all") next.delete("company");
        else next.set("company", value);
        updateUrl(next);
    };

    const handleStateChange = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value === "all") next.delete("state");
        else next.set("state", value);
        updateUrl(next);
    };

    const toggleCategory = (id: number) => {
        const next = new URLSearchParams(searchParams.toString());
        const set = new Set(categoryIds);
        if (set.has(id)) set.delete(id);
        else set.add(id);

        if (set.size === 0) next.delete("categories");
        else next.set("categories", Array.from(set).sort((a, b) => a - b).join(","));
        updateUrl(next);
    };

    const clearCategories = () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("categories");
        updateUrl(next);
    };

    const committedFrom = parseISO(from);
    const committedTo = parseISO(to);
    const now = new Date();

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {/* Dates avec draft local + raccourcis */}
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 font-normal"
                    >
                        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                        {format(committedFrom, "dd MMM", { locale: fr })}
                        <span className="text-muted-foreground/50">→</span>
                        {format(committedTo, "dd MMM yy", { locale: fr })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0 rounded-xl shadow-2xl">
                    <div className="flex flex-wrap gap-1 border-b border-border/60 p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => applyPreset({ from: now, to: now })}
                        >
                            Aujourd&apos;hui
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => applyPreset({ from: subDays(now, 6), to: now })}
                        >
                            7 derniers jours
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() =>
                                applyPreset({ from: startOfMonth(now), to: now })
                            }
                        >
                            Ce mois
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                                const prev = subMonths(now, 1);
                                applyPreset({
                                    from: startOfMonth(prev),
                                    to: endOfMonth(prev),
                                });
                            }}
                        >
                            Mois dernier
                        </Button>
                    </div>
                    <Calendar
                        mode="range"
                        numberOfMonths={2}
                        locale={fr}
                        defaultMonth={draftRange?.from ?? committedFrom}
                        selected={draftRange}
                        onSelect={handleDateSelect}
                        className="p-3"
                    />
                    <div className="flex items-center justify-end gap-2 border-t border-border/60 p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => setDateOpen(false)}
                        >
                            Annuler
                        </Button>
                        <Button
                            size="sm"
                            className="h-7 text-[11px]"
                            disabled={!draftRange?.from}
                            onClick={() => applyRange(draftRange)}
                        >
                            Appliquer
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Company */}
            <Select
                value={companyId !== null ? String(companyId) : "all"}
                onValueChange={handleCompanyChange}
            >
                <SelectTrigger className={cn(selectClass, "w-[180px]")}>
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Toutes sociétés" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Toutes sociétés
                    </SelectItem>
                    {companies.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                            {c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Statut Odoo */}
            <Select value={state ?? "all"} onValueChange={handleStateChange}>
                <SelectTrigger className={cn(selectClass, "w-[140px]")}>
                    <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Tous statuts" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Tous statuts
                    </SelectItem>
                    {STATE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="text-xs">
                            {s.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Catégories */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-7 px-2 text-[11px] gap-1.5 font-normal",
                            categoryIds.length > 0 && "border-primary/40 bg-primary/5",
                        )}
                    >
                        <Filter className="w-3 h-3 text-muted-foreground shrink-0" />
                        {categoryIds.length === 0
                            ? "Toutes catégories"
                            : `${categoryIds.length} catégorie${categoryIds.length > 1 ? "s" : ""}`}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-60 p-1 rounded-lg shadow-xl">
                    <div className="max-h-64 overflow-y-auto">
                        {categories.map((c) => {
                            const checked = categoryIds.includes(c.id);
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => toggleCategory(c.id)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] hover:bg-accent/40 transition-colors text-left"
                                >
                                    <span
                                        className={cn(
                                            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                            checked
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-border",
                                        )}
                                    >
                                        {checked && <Check className="w-2.5 h-2.5" />}
                                    </span>
                                    <span className="truncate">{c.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    {categoryIds.length > 0 && (
                        <div className="border-t border-border/60 mt-1 pt-1">
                            <button
                                type="button"
                                onClick={clearCategories}
                                className="w-full px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground text-left"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    );
}