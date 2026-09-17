"use client";

import { useState } from "react";
import {
    Calendar as CalendarIcon,
    RefreshCw,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subDays, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";

import {
    PERIOD_PRESETS,
    parsePeriodFromSearchParams,
    type PeriodPreset,
} from "@/app/ceo-report/_lib/period";

interface PeriodSelectorProps {
    /** Callback optionnel pour rafraîchir les données (TanStack Query) */
    onRefresh?: () => Promise<void>;
    /** Timestamp de dernière sync pour affichage */
    lastUpdatedAt?: Date | null;
    /** État de chargement pour désactiver le bouton refresh */
    isRefreshing?: boolean;
}

export function PeriodSelector({
    onRefresh,
    lastUpdatedAt,
    isRefreshing = false,
}: PeriodSelectorProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isManualRefreshing, setIsManualRefreshing] = useState(false);

    // 1. Lecture de la période depuis l'URL
    const period = parsePeriodFromSearchParams({
        from: searchParams.get("from") ?? undefined,
        to: searchParams.get("to") ?? undefined,
        preset: searchParams.get("preset") ?? undefined,
    });

    // 2. Mise à jour de l'URL
    const updateUrl = (from: Date, to: Date, preset: PeriodPreset) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("from", format(from, "yyyy-MM-dd"));
        params.set("to", format(to, "yyyy-MM-dd"));
        params.set("preset", preset);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // 3. Gestion des presets
    const handlePresetClick = (preset: PeriodPreset) => {
        const now = new Date();
        let from: Date, to: Date;

        switch (preset) {
            case "today":
                from = startOfToday();
                to = now;
                break;
            case "7d":
                from = subDays(startOfToday(), 6);
                to = now;
                break;
            case "30d":
                from = startOfMonth(now);
                to = endOfMonth(now);
                break;
            default:
                return;
        }

        updateUrl(from, to, preset);
    };

    // 4. Sélection custom via calendrier
    const handleCustomSelect = (range: DateRange | undefined) => {
        if (range?.from && range?.to) {
            updateUrl(range.from, range.to, "custom");
        }
    };

    // 5. Rafraîchissement manuel
    const handleManualRefresh = async () => {
        if (!onRefresh) return;
        setIsManualRefreshing(true);
        try {
            await onRefresh();
            toast.success("Données actualisées", {
                description: "Les KPI ont été rechargés depuis Odoo.",
            });
        } catch {
            toast.error("Échec de la synchronisation");
        } finally {
            setIsManualRefreshing(false);
        }
    };

    const isRefreshingGlobal = isRefreshing || isManualRefreshing;
    const dateRange: DateRange = { from: period.from, to: period.to };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Groupe presets + calendrier */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
                {PERIOD_PRESETS.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => handlePresetClick(p.value)}
                        className={cn(
                            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                            period.preset === p.value
                                ? "bg-background text-primary shadow-sm ring-1 ring-border"
                                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                    >
                        {p.label}
                    </button>
                ))}

                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                                period.preset === "custom"
                                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                            )}
                        >
                            <CalendarIcon className="size-3.5" />
                            {period.preset === "custom" ? "Personnalisé" : "Custom"}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="end"
                        className="w-auto rounded-2xl border-border p-0 shadow-2xl"
                    >
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange.from}
                            selected={dateRange}
                            onSelect={handleCustomSelect}
                            numberOfMonths={2}
                            locale={fr}
                            className="p-3"
                        />
                    </PopoverContent>
                </Popover>
            </div>

            <Separator orientation="vertical" className="mx-1 hidden h-8 lg:block" />

            {/* Actions */}
            <div className="flex items-center gap-2">
                <div className="mr-2 hidden flex-col items-end xl:flex">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Période d'analyse
                    </span>
                    <span className="text-xs font-medium">
                        {format(period.from, "dd MMM", { locale: fr })}
                        {" — "}
                        {format(period.to, "dd MMM yyyy", { locale: fr })}
                    </span>
                </div>

                {onRefresh && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2 border-border text-xs hover:bg-accent"
                        onClick={handleManualRefresh}
                        disabled={isRefreshingGlobal}
                    >
                        <RefreshCw
                            className={cn("size-3.5", isRefreshingGlobal && "animate-spin")}
                        />
                        <span className="hidden sm:inline">Actualiser</span>
                    </Button>
                )}
            </div>
        </div>
    );
}