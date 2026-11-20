"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import {
    endOfMonth,
    format,
    parseISO,
    startOfMonth,
    startOfToday,
    subDays,
    subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { RedsupFilter } from "../_lib/types";

export default function RedsupFilters({ filters }: { filters: RedsupFilter }) {
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

    const applyRange = (range: DateRange | undefined) => {
        if (!range?.from) return;
        const next = new URLSearchParams(searchParams.toString());
        next.set("from", format(range.from, "yyyy-MM-dd"));
        next.set("to", format(range.to ?? range.from, "yyyy-MM-dd"));
        const qs = next.toString();
        window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
        setDateOpen(false);
    };

    const now = new Date();
    const committedFrom = parseISO(filters.from);
    const committedTo = parseISO(filters.to);

    return (
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
                        onClick={() => applyRange({ from: startOfToday(), to: now })}
                    >
                        Aujourd&apos;hui
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => applyRange({ from: subDays(now, 6), to: now })}
                    >
                        7 derniers jours
                    </Button>
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
                            applyRange({ from: startOfMonth(prev), to: endOfMonth(prev) });
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
    );
}