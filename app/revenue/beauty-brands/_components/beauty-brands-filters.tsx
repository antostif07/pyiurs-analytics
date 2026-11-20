"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, Download, Store } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BeautyBrandsFilter, BeautyShopOption } from "../_lib/types";

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const selectClass =
    "h-7 text-[11.5px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function BeautyBrandsFilters({
    filters,
    boutiques,
    onExportCsv,
    canExport,
}: {
    filters: BeautyBrandsFilter;
    boutiques: BeautyShopOption[];
    onExportCsv: () => void;
    canExport: boolean;
}) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

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
            <Select
                value={String(filters.month)}
                onValueChange={(v) => updateParam("month", v)}
            >
                <SelectTrigger className={cn(selectClass, "w-[130px]")}>
                    <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {MONTHS.map((label, idx) => (
                        <SelectItem key={idx + 1} value={String(idx + 1)} className="text-xs">
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={String(filters.year)}
                onValueChange={(v) => updateParam("year", v)}
            >
                <SelectTrigger className={cn(selectClass, "w-[90px]")}>
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

            {boutiques.length > 1 ? (
                <Select
                    value={filters.boutique}
                    onValueChange={(v) => updateParam("boutique", v)}
                >
                    <SelectTrigger className={cn(selectClass, "w-[180px]")}>
                        <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Toutes boutiques" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">
                            Toutes boutiques ({boutiques.length})
                        </SelectItem>
                        {boutiques.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)} className="text-xs">
                                {b.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : boutiques.length === 1 ? (
                <Badge variant="outline" className="h-7 px-2.5 text-[11px] font-medium">
                    <Store className="w-3 h-3 mr-1 text-muted-foreground" />
                    {boutiques[0].name}
                </Badge>
            ) : null}

            <Button
                variant="outline"
                size="sm"
                onClick={onExportCsv}
                disabled={!canExport}
                className="h-7 px-2.5 text-[11px] gap-1.5"
            >
                <Download className="w-3 h-3" />
                CSV
            </Button>
        </div>
    );
}