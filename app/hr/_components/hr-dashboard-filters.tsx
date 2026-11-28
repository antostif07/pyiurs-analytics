"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarIcon, Store } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
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
import type { HrDashboardFilter } from "../_lib/filters";
import type { HrShopOption } from "../_lib/server/hr-dashboard-service";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function HrDashboardFilters({
    filters,
    shops,
    selectedShop,
    showShopAndPayrollFilters,
}: {
    filters: HrDashboardFilter;
    shops: HrShopOption[];
    selectedShop: string;
    showShopAndPayrollFilters: boolean;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [dateOpen, setDateOpen] = useState(false);

    const parsedDate = parseISO(filters.date);
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

    const updateParam = (key: string, value: string | null) => {
        const next = new URLSearchParams(searchParams.toString());
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
        const qs = next.toString();
        window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {/* Date pointage */}
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] gap-1.5 font-normal"
                    >
                        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                        {format(parsedDate, "dd MMM yyyy", { locale: fr })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0 rounded-xl shadow-2xl">
                    <div className="border-b border-border/60 p-2 flex justify-between items-center">
                        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                            Date pointage
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => {
                                updateParam("date", format(new Date(), "yyyy-MM-dd"));
                                setDateOpen(false);
                            }}
                        >
                            Aujourd&apos;hui
                        </Button>
                    </div>
                    <Calendar
                        mode="single"
                        locale={fr}
                        selected={parsedDate}
                        onSelect={(d) => {
                            if (d) {
                                updateParam("date", format(d, "yyyy-MM-dd"));
                                setDateOpen(false);
                            }
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {showShopAndPayrollFilters && (
                <>
                    {/* Mois Paie */}
                    <Select
                        value={String(filters.month)}
                        onValueChange={(v) => updateParam("month", v)}
                    >
                        <SelectTrigger className={cn(selectClass, "w-[125px]")}>
                            <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map((label, idx) => (
                                <SelectItem
                                    key={idx + 1}
                                    value={String(idx + 1)}
                                    className="text-xs"
                                >
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Année Paie */}
                    <Select
                        value={String(filters.year)}
                        onValueChange={(v) => updateParam("year", v)}
                    >
                        <SelectTrigger className={cn(selectClass, "w-[85px]")}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)} className="text-xs">
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Boutique */}
                    {shops.length > 1 && (
                        <Select
                            value={selectedShop}
                            onValueChange={(v) => updateParam("shop", v)}
                        >
                            <SelectTrigger className={cn(selectClass, "w-[175px]")}>
                                <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                                <SelectValue placeholder="Toutes boutiques" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">
                                    Toutes boutiques ({shops.length})
                                </SelectItem>
                                {shops.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </>
            )}
        </div>
    );
}