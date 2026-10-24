// app/inventory/stock-femme/_components/stock-femme-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { format, endOfMonth, startOfMonth } from "date-fns";
import {
    Calendar as CalendarIcon,
    ChevronDown,
    Filter,
    Loader2,
    X,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import type { FilterState, StockLevels } from "../_lib/types";

interface StockFemmeFiltersProps {
    brands: string[];
    colors: string[];
    partners: string[];
    orderNames: string[];
    stockLevels: StockLevels;
    current: FilterState;
}

const selectClass =
    "h-7 text-[11px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function StockFemmeFilters({
    brands,
    colors,
    partners,
    orderNames,
    stockLevels,
    current,
}: StockFemmeFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [tempDate, setTempDate] = useState<DateRange | undefined>(() => {
        if (current.start_date && current.end_date) {
            return {
                from: new Date(current.start_date),
                to: new Date(current.end_date),
            };
        }
        const today = new Date();
        return { from: startOfMonth(today), to: endOfMonth(today) };
    });

    const updateParam = useCallback(
        (key: string, value: string | null) => {
            const next = new URLSearchParams(searchParams.toString());
            if (!value || value === "all") next.delete(key);
            else next.set(key, value);

            const qs = next.toString();
            startTransition(() => {
                router.replace(qs ? `${pathname}?${qs}` : pathname, {
                    scroll: false,
                });
            });
        },
        [pathname, router, searchParams],
    );

    const applyDateRange = useCallback(
        (range: DateRange | undefined) => {
            if (!range?.from || !range?.to) return;
            const next = new URLSearchParams(searchParams.toString());
            next.set("start_date", format(range.from, "yyyy-MM-dd"));
            next.set("end_date", format(range.to, "yyyy-MM-dd"));
            const qs = next.toString();
            startTransition(() => {
                router.replace(qs ? `${pathname}?${qs}` : pathname, {
                    scroll: false,
                });
            });
            setIsDatePickerOpen(false);
        },
        [pathname, router, searchParams],
    );

    const clearAll = useCallback(() => {
        startTransition(() => {
            router.replace(pathname, { scroll: false });
        });
    }, [pathname, router]);

    const isCurrentMonth = (() => {
        if (!current.start_date || !current.end_date) return true;
        const today = new Date();
        return (
            current.start_date === format(startOfMonth(today), "yyyy-MM-dd") &&
            current.end_date === format(endOfMonth(today), "yyyy-MM-dd")
        );
    })();

    const getDateLabel = () => {
        if (!current.start_date || !current.end_date || isCurrentMonth) {
            return "Mois actuel";
        }
        return `${format(new Date(current.start_date), "dd/MM/yy")} → ${format(
            new Date(current.end_date),
            "dd/MM/yy",
        )}`;
    };

    const hasActiveFilters =
        current.brand ||
        current.color ||
        current.stock ||
        current.partner ||
        current.purchase_order ||
        (!isCurrentMonth && current.start_date && current.end_date);

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            {/* Période */}
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 border-border/80 hover:bg-accent/60"
                    >
                        <CalendarIcon className="w-3 h-3" />
                        {getDateLabel()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        defaultMonth={tempDate?.from}
                        selected={tempDate}
                        onSelect={setTempDate}
                        numberOfMonths={1}
                        className="p-3"
                    />
                    <div className="p-3 border-t flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => applyDateRange(tempDate)}
                            disabled={!tempDate?.from || !tempDate?.to}
                        >
                            Appliquer
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setIsDatePickerOpen(false)}
                        >
                            Annuler
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Marque */}
            <Select
                value={current.brand ?? "all"}
                onValueChange={(v) => updateParam("brand", v)}
            >
                <SelectTrigger className={cn(selectClass, "w-[160px]")}>
                    <SelectValue placeholder="Marque" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Toutes les marques
                    </SelectItem>
                    {brands.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">
                            {b}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Niveau stock */}
            <Select
                value={current.stock ?? "all"}
                onValueChange={(v) => updateParam("stock", v)}
            >
                <SelectTrigger className={cn(selectClass, "w-[150px]")}>
                    <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Tous les stocks
                    </SelectItem>
                    <SelectItem value="out_of_stock" className="text-xs">
                        Rupture ({stockLevels.outOfStock})
                    </SelectItem>
                    <SelectItem value="critical" className="text-xs">
                        Critique ({stockLevels.critical})
                    </SelectItem>
                    <SelectItem value="low" className="text-xs">
                        Faible ({stockLevels.low})
                    </SelectItem>
                    <SelectItem value="good" className="text-xs">
                        Bon ({stockLevels.good})
                    </SelectItem>
                </SelectContent>
            </Select>

            {/* Sheet filtres avancés */}
            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 border-border/80 hover:bg-accent/60"
                    >
                        <Filter className="w-3 h-3" />
                        <span className="hidden sm:inline">Plus</span>
                        <ChevronDown className="w-3 h-3" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="text-sm">
                            Filtres avancés
                        </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full py-4">
                        <div className="space-y-5 px-4">
                            <div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Couleur
                                </h4>
                                <div className="space-y-1">
                                    <Button
                                        variant={!current.color ? "secondary" : "ghost"}
                                        size="sm"
                                        className="w-full justify-start text-xs h-7"
                                        onClick={() => updateParam("color", "all")}
                                    >
                                        Toutes
                                    </Button>
                                    {colors.map((c) => (
                                        <Button
                                            key={c}
                                            variant={current.color === c ? "secondary" : "ghost"}
                                            size="sm"
                                            className="w-full justify-start text-xs h-7"
                                            onClick={() => updateParam("color", c)}
                                        >
                                            {c}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Fournisseur
                                </h4>
                                <div className="space-y-1">
                                    <Button
                                        variant={!current.partner ? "secondary" : "ghost"}
                                        size="sm"
                                        className="w-full justify-start text-xs h-7"
                                        onClick={() => updateParam("partner", "all")}
                                    >
                                        Tous
                                    </Button>
                                    {partners.map((p) => (
                                        <Button
                                            key={p}
                                            variant={current.partner === p ? "secondary" : "ghost"}
                                            size="sm"
                                            className="w-full justify-start text-xs h-7"
                                            onClick={() => updateParam("partner", p)}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Commande d&apos;achat
                                </h4>
                                <div className="space-y-1">
                                    <Button
                                        variant={!current.purchase_order ? "secondary" : "ghost"}
                                        size="sm"
                                        className="w-full justify-start text-xs h-7"
                                        onClick={() => updateParam("purchase_order", "all")}
                                    >
                                        Toutes
                                    </Button>
                                    {orderNames.map((o) => (
                                        <Button
                                            key={o}
                                            variant={current.purchase_order === o ? "secondary" : "ghost"}
                                            size="sm"
                                            className="w-full justify-start text-xs h-7"
                                            onClick={() => updateParam("purchase_order", o)}
                                        >
                                            {o}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {/* Reset */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                    <X className="w-3 h-3" />
                    <span className="hidden sm:inline">Effacer</span>
                </Button>
            )}

            {isPending && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/60 shrink-0" />
            )}
        </div>
    );
}