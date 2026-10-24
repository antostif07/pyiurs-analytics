// app/inventory/stock-femme/_components/column-range-filter.tsx
"use client";

import { useState } from "react";
import type { Column } from "@tanstack/react-table";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColumnRangeFilterProps<T> {
    column: Column<T, unknown>;
    label: string;
}

export function ColumnRangeFilter<T>({
    column,
    label,
}: ColumnRangeFilterProps<T>) {
    const [open, setOpen] = useState(false);
    const [min, setMin] = useState<string>("");
    const [max, setMax] = useState<string>("");

    const filterValue =
        (column.getFilterValue() as
            | [number | undefined, number | undefined]
            | undefined) ?? undefined;
    const isActive = column.getIsFiltered();

    const handleOpenChange = (v: boolean) => {
        setOpen(v);
        if (v) {
            // Sync local state avec le filtre courant
            setMin(filterValue?.[0]?.toString() ?? "");
            setMax(filterValue?.[1]?.toString() ?? "");
        }
    };

    const apply = () => {
        const minN = min.trim() === "" ? undefined : Number(min);
        const maxN = max.trim() === "" ? undefined : Number(max);
        if (minN === undefined && maxN === undefined) {
            column.setFilterValue(undefined);
        } else {
            column.setFilterValue([minN, maxN]);
        }
        setOpen(false);
    };

    const clear = () => {
        setMin("");
        setMax("");
        column.setFilterValue(undefined);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        "ml-1 p-0.5 rounded transition-colors",
                        isActive
                            ? "text-sky-400 hover:text-sky-300"
                            : "text-white/40 hover:text-white/80",
                    )}
                    aria-label={`Filtrer ${label}`}
                >
                    <Filter
                        className="h-2.5 w-2.5"
                        fill={isActive ? "currentColor" : "none"}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-56 p-3"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                        {label}
                    </h4>
                    {isActive && (
                        <button
                            type="button"
                            onClick={clear}
                            className="text-[10px] text-rose-600 hover:text-rose-700"
                        >
                            Effacer
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">
                            Min
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={min}
                            onChange={(e) => setMin(e.target.value)}
                            placeholder="0"
                            className="w-full h-7 px-2 text-[11px] bg-secondary/60 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring font-mono tabular-nums"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-muted-foreground mb-1">
                            Max
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={max}
                            onChange={(e) => setMax(e.target.value)}
                            placeholder="∞"
                            className="w-full h-7 px-2 text-[11px] bg-secondary/60 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring font-mono tabular-nums"
                        />
                    </div>
                </div>

                <Button
                    size="sm"
                    onClick={apply}
                    className="w-full mt-2 h-7 text-[11px]"
                >
                    Appliquer
                </Button>
            </PopoverContent>
        </Popover>
    );
}