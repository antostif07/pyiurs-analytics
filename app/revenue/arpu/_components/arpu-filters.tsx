// app/revenue/arpu/_components/arpu-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
    ArrowLeftRight,
    Calendar as CalendarIcon,
    Check,
    ChevronDown,
    Loader2,
    Tags,
    X,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ARPU_SEGMENTS, type ArpuSegment } from "../_lib/constants";
import {
    parseArpuFilters,
    toDateRange,
} from "../_lib/filters";

export default function ArpuFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const filters = parseArpuFilters(
        Object.fromEntries(searchParams.entries()),
    );
    const dateRange = toDateRange(filters);

    const updateUrl = (updater: (params: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams.toString());
        updater(params);
        const qs = params.toString();
        startTransition(() => {
            router.replace(qs ? `${pathname}?${qs}` : pathname, {
                scroll: false,
            });
        });
    };

    const toggleSegment = (segment: ArpuSegment) => {
        const set = new Set(filters.segments);
        if (set.has(segment)) set.delete(segment);
        else set.add(segment);

        // Si tous les segments sont décochés → on revient au défaut (tous)
        const next =
            set.size === 0
                ? [...ARPU_SEGMENTS]
                : ARPU_SEGMENTS.filter((s) => set.has(s));

        updateUrl((p) => {
            if (next.length === ARPU_SEGMENTS.length) p.delete("segments");
            else p.set("segments", next.join(","));
        });
    };

    const toggleCompare = () => {
        updateUrl((p) => {
            if (filters.compare) p.delete("compare");
            else p.set("compare", "1");
        });
    };

    const handleDateSelect = (range: DateRange | undefined) => {
        if (!range?.from) return;
        const to = range.to ?? range.from;
        updateUrl((p) => {
            p.set("from", format(range.from!, "yyyy-MM-dd"));
            p.set("to", format(to, "yyyy-MM-dd"));
            p.delete("preset"); // obsolète
        });
    };

    const applyPreset = (preset: "today" | "7d" | "month") => {
        const today = new Date();
        let from: Date;
        let to: Date;
        if (preset === "today") {
            from = today;
            to = today;
        } else if (preset === "7d") {
            from = new Date(today);
            from.setDate(today.getDate() - 6);
            to = today;
        } else {
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        updateUrl((p) => {
            p.set("from", format(from, "yyyy-MM-dd"));
            p.set("to", format(to, "yyyy-MM-dd"));
            p.delete("preset");
        });
    };

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            {/* Segments */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-7 px-2 text-[11px] gap-1.5 font-normal",
                            filters.segments.length < ARPU_SEGMENTS.length &&
                            "border-primary/40 bg-primary/5",
                        )}
                    >
                        <Tags className="w-3 h-3 text-muted-foreground shrink-0" />
                        Segments
                        <Badge
                            variant="secondary"
                            className="h-4 px-1 text-[9px] font-mono bg-muted/60"
                        >
                            {filters.segments.length}/{ARPU_SEGMENTS.length}
                        </Badge>
                        <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="w-52 p-1 rounded-lg shadow-xl"
                >
                    <DropdownMenuLabel className="text-[9px] font-semibold uppercase text-muted-foreground px-2 py-1 tracking-wider">
                        x_studio_segment
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ARPU_SEGMENTS.map((seg) => {
                        const checked = filters.segments.includes(seg);
                        return (
                            <DropdownMenuCheckboxItem
                                key={seg}
                                checked={checked}
                                onCheckedChange={() => toggleSegment(seg)}
                                className="text-xs cursor-pointer"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span>{seg}</span>
                                    {checked && (
                                        <Check className="w-3 h-3 text-primary" />
                                    )}
                                </div>
                            </DropdownMenuCheckboxItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Pills segments actifs */}
            {filters.segments.length < ARPU_SEGMENTS.length && (
                <div className="hidden md:flex items-center gap-1">
                    {filters.segments.map((seg) => (
                        <Badge
                            key={seg}
                            variant="secondary"
                            className="h-5 pl-1.5 pr-0.5 py-0 text-[10px] font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200/60 dark:border-violet-800/60 gap-0.5"
                        >
                            {seg}
                            <button
                                type="button"
                                onClick={() => toggleSegment(seg)}
                                className="p-0.5 hover:bg-violet-200 dark:hover:bg-violet-900 rounded transition-colors"
                                aria-label={`Retirer ${seg}`}
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            {/* Séparateur */}
            <div className="h-4 w-px bg-border" aria-hidden />

            {/* Date range */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 font-normal"
                    >
                        <CalendarIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                        {format(dateRange.from, "dd MMM", { locale: fr })}
                        <span className="text-muted-foreground/50">→</span>
                        {format(dateRange.to, "dd MMM yy", { locale: fr })}
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

            {/* Presets */}
            <div className="inline-flex items-center bg-muted/40 border border-border/70 p-0.5 rounded-lg">
                {(
                    [
                        { key: "today", label: "Auj." },
                        { key: "7d", label: "7J" },
                        { key: "month", label: "Mois" },
                    ] as const
                ).map((p) => (
                    <button
                        key={p.key}
                        type="button"
                        onClick={() => applyPreset(p.key)}
                        className="px-2 py-1 rounded-md text-[10px] font-semibold transition-colors text-muted-foreground hover:text-foreground hover:bg-background/50"
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Compare */}
            <Button
                variant={filters.compare ? "default" : "outline"}
                size="sm"
                onClick={toggleCompare}
                className={cn(
                    "h-7 px-2 text-[11px] gap-1.5",
                    filters.compare
                        ? "bg-violet-600 hover:bg-violet-700 text-white"
                        : "border-border/80",
                )}
            >
                <ArrowLeftRight
                    className={cn(
                        "w-3 h-3",
                        filters.compare && "rotate-180 transition-transform duration-300",
                    )}
                />
                Comparer
            </Button>

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}