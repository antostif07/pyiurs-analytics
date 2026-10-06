// app/revenue/invoices-redsup/_components/redsup-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Activity, CalendarIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { RedsupFilter } from "../_lib/types";

interface RedsupFiltersProps {
    filters: RedsupFilter;
}

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function RedsupFilters({ filters }: RedsupFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const dateRange: DateRange = {
        from: parseISO(filters.from),
        to: parseISO(filters.to),
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

    const handleStateChange = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value === "all") next.delete("state");
        else next.set("state", value);
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
                        {format(dateRange.to ?? dateRange.from!, "dd MMM yy", {
                            locale: fr,
                        })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-auto p-0 rounded-xl shadow-2xl"
                >
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

            {/* Statut validation */}
            <Select value={filters.state} onValueChange={handleStateChange}>
                <SelectTrigger className={cn(selectClass, "w-[140px]")}>
                    <Activity className="w-3 h-3 text-muted-foreground shrink-0" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Toutes
                    </SelectItem>
                    <SelectItem value="validated" className="text-xs">
                        Validées
                    </SelectItem>
                    <SelectItem value="pending" className="text-xs">
                        En attente
                    </SelectItem>
                </SelectContent>
            </Select>

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}