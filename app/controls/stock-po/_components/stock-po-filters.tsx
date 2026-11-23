"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, CalendarIcon } from "lucide-react";
import {
    endOfMonth,
    format,
    parseISO,
    startOfMonth,
    subMonths,
} from "date-fns";
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
import type { StockPoFilter } from "../_lib/types";

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function StockPoFilters({
    filters,
    hideSupplierFilter = false,
}: {
    filters: StockPoFilter;
    hideSupplierFilter?: boolean;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [dateOpen, setDateOpen] = useState(false);
    const [draftRange, setDraftRange] = useState<DateRange | undefined>({
        from: parseISO(filters.from),
        to: parseISO(filters.to),
    });

    useEffect(() => {
        setDraftRange({ from: parseISO(filters.from), to: parseISO(filters.to) });
    }, [filters.from, filters.to]);

    const updateUrl = (params: URLSearchParams) => {
        const qs = params.toString();
        window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    };

    const applyRange = (range: DateRange | undefined) => {
        if (!range?.from) return;
        const next = new URLSearchParams(searchParams.toString());
        next.set("from", format(range.from, "yyyy-MM-dd"));
        next.set("to", format(range.to ?? range.from, "yyyy-MM-dd"));
        updateUrl(next);
        setDateOpen(false);
    };

    const handleSupplierChange = (val: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (val === "all") next.delete("supplier");
        else next.set("supplier", val);
        updateUrl(next);
    };

    const now = new Date();
    const committedFrom = parseISO(filters.from);
    const committedTo = parseISO(filters.to);

    return (
        <div className="flex flex-wrap items-center gap-1.5">
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
                            onClick={() => applyRange({ from: startOfMonth(now), to: now })}
                        >
                            Ce mois
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                                const prev = subMonths(now, 1);
                                applyRange({
                                    from: startOfMonth(prev),
                                    to: endOfMonth(prev),
                                });
                            }}
                        >
                            Mois dernier
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() =>
                                applyRange({
                                    from: startOfMonth(subMonths(now, 2)),
                                    to: now,
                                })
                            }
                        >
                            3 derniers mois
                        </Button>
                    </div>
                    <Calendar
                        mode="range"
                        numberOfMonths={2}
                        locale={fr}
                        defaultMonth={draftRange?.from ?? committedFrom}
                        selected={draftRange}
                        onSelect={setDraftRange}
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

            {!hideSupplierFilter && (
                <Select
                    value={filters.supplierPrefix}
                    onValueChange={handleSupplierChange}
                >
                    <SelectTrigger className={cn(selectClass, "w-[155px]")}>
                        <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">
                            P.BTY + P.FEM
                        </SelectItem>
                        <SelectItem value="P.BTY" className="text-xs">
                            P.BTY uniquement
                        </SelectItem>
                        <SelectItem value="P.FEM" className="text-xs">
                            P.FEM uniquement
                        </SelectItem>
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}