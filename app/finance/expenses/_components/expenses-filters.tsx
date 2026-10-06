// app/finance/expenses/_components/expenses-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Building2, CalendarIcon, Check, Filter, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseCompany } from "../_lib/types";

interface ExpensesFiltersProps {
    from: string;
    to: string;
    categoryIds: number[];
    categories: ExpenseCategory[];
    companyId: number | null;
    companies: ExpenseCompany[];
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
}: ExpensesFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const dateRange: DateRange = {
        from: parseISO(from),
        to: parseISO(to),
    };

    const updateUrl = (params: URLSearchParams) => {
        const qs = params.toString();
        startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        });
    };

    const handleDateSelect = (range: DateRange | undefined) => {
        if (!range?.from) return;
        const next = new URLSearchParams(searchParams.toString());
        next.set("from", format(range.from, "yyyy-MM-dd"));
        next.set("to", format(range.to ?? range.from, "yyyy-MM-dd"));
        updateUrl(next);
    };

    const handleCompanyChange = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value === "all") next.delete("company");
        else next.set("company", value);
        updateUrl(next);
    };

    const toggleCategory = (id: number) => {
        const next = new URLSearchParams(searchParams.toString());
        const set = new Set(categoryIds);
        if (set.has(id)) set.delete(id);
        else set.add(id);

        if (set.size === 0) next.delete("categories");
        else next.set("categories", Array.from(set).join(","));

        updateUrl(next);
    };

    const clearCategories = () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("categories");
        updateUrl(next);
    };

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            {/* Dates */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 font-normal"
                    >
                        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                        {format(dateRange.from!, "dd MMM", { locale: fr })}
                        <span className="text-muted-foreground/50">→</span>
                        {format(dateRange.to ?? dateRange.from!, "dd MMM yy", { locale: fr })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0 rounded-xl shadow-2xl">
                    <Calendar
                        mode="range"
                        numberOfMonths={2}
                        locale={fr}
                        defaultMonth={dateRange.from}
                        selected={dateRange}
                        onSelect={handleDateSelect}
                        className="p-3"
                    />
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
                <PopoverContent align="start" className="w-56 p-1 rounded-lg shadow-xl">
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

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}