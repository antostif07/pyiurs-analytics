// app/inventory/purchases/_components/purchases-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
    Calendar as CalendarIcon,
    Loader2,
    X,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

interface Props {
    currentStatus: string | null;
    currentStartDate: string | null;
    currentEndDate: string | null;
}

const selectClass =
    "h-7 text-[11px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function PurchasesFilters({
    currentStatus,
    currentStartDate,
    currentEndDate,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [tempDate, setTempDate] = useState<DateRange | undefined>(() => {
        if (currentStartDate && currentEndDate) {
            return {
                from: new Date(currentStartDate),
                to: new Date(currentEndDate),
            };
        }
        return undefined;
    });

    const updateParams = useCallback(
        (mutate: (sp: URLSearchParams) => void) => {
            const next = new URLSearchParams(searchParams.toString());
            mutate(next);
            const qs = next.toString();
            startTransition(() => {
                router.replace(qs ? `${pathname}?${qs}` : pathname, {
                    scroll: false,
                });
            });
        },
        [pathname, router, searchParams],
    );

    const handleStatusChange = useCallback(
        (value: string) => {
            updateParams((sp) => {
                if (value === "all") sp.delete("status");
                else sp.set("status", value);
            });
        },
        [updateParams],
    );

    const applyDateRange = useCallback(
        (range: DateRange | undefined) => {
            if (!range?.from || !range?.to) return;
            updateParams((sp) => {
                sp.set("start_date", format(range.from!, "yyyy-MM-dd"));
                sp.set("end_date", format(range.to!, "yyyy-MM-dd"));
            });
            setIsDatePickerOpen(false);
        },
        [updateParams],
    );

    const clearDateRange = useCallback(() => {
        updateParams((sp) => {
            sp.delete("start_date");
            sp.delete("end_date");
        });
        setTempDate(undefined);
        setIsDatePickerOpen(false);
    }, [updateParams]);

    const clearAll = useCallback(() => {
        startTransition(() => {
            router.replace(pathname, { scroll: false });
        });
        setTempDate(undefined);
    }, [pathname, router]);

    const hasActiveFilters =
        currentStatus !== null ||
        (currentStartDate !== null && currentEndDate !== null);

    const dateLabel = (() => {
        if (!currentStartDate || !currentEndDate) return "Toutes les dates";
        return `${format(new Date(currentStartDate), "dd/MM/yy")} → ${format(
            new Date(currentEndDate),
            "dd/MM/yy",
        )}`;
    })();

    const isDateActive = currentStartDate !== null && currentEndDate !== null;

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            {/* Statut */}
            <Select
                value={currentStatus ?? "all"}
                onValueChange={handleStatusChange}
            >
                <SelectTrigger className={cn(selectClass, "w-[160px]")}>
                    <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">
                        Tous les statuts
                    </SelectItem>
                    <SelectItem value="Done" className="text-xs">
                        Réceptionné (Done)
                    </SelectItem>
                    <SelectItem value="Ready" className="text-xs">
                        Prêt à recevoir (Ready)
                    </SelectItem>
                    <SelectItem value="Waiting" className="text-xs">
                        En attente (Waiting)
                    </SelectItem>
                    <SelectItem value="Late" className="text-xs">
                        En retard (Late)
                    </SelectItem>
                    <SelectItem value="Draft" className="text-xs">
                        Brouillon (Draft)
                    </SelectItem>
                </SelectContent>
            </Select>

            {/* Période */}
            <Popover
                open={isDatePickerOpen}
                onOpenChange={(open) => {
                    setIsDatePickerOpen(open);
                    if (open) {
                        // Sync temp avec URL courante
                        if (currentStartDate && currentEndDate) {
                            setTempDate({
                                from: new Date(currentStartDate),
                                to: new Date(currentEndDate),
                            });
                        } else {
                            setTempDate(undefined);
                        }
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        variant={isDateActive ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 border-border/80 hover:bg-accent/60"
                    >
                        <CalendarIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{dateLabel}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        defaultMonth={tempDate?.from}
                        selected={tempDate}
                        onSelect={setTempDate}
                        numberOfMonths={2}
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
                    {isDateActive && (
                        <div className="px-3 pb-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                onClick={clearDateRange}
                            >
                                <X className="w-3 h-3" />
                                Retirer la période
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

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