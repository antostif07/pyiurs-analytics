// app/inventory/stock-beauty/_components/stock-beauty-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Filter, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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

interface Props {
    brands: string[];
    colors: string[];
    categories: string[];
    suppliers: string[];
    stockLevels: StockLevels;
    current: FilterState;
}

const selectClass =
    "h-7 text-[11px] bg-secondary/60 border-border hover:border-ring/60 focus:border-ring text-foreground/80 rounded-lg";

export default function StockBeautyFilters({
    brands,
    colors,
    categories,
    suppliers,
    stockLevels,
    current,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

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

    const clearAll = useCallback(() => {
        startTransition(() => {
            router.replace(pathname, { scroll: false });
        });
    }, [pathname, router]);

    const hasActive =
        current.brand || current.color || current.category || current.supplier || current.stock;

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            <Select
                value={current.brand ?? "all"}
                onValueChange={(v) => updateParam("brand", v)}
            >
                <SelectTrigger className={cn(selectClass, "w-[150px]")}>
                    <SelectValue placeholder="Marque" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">Toutes marques</SelectItem>
                    {brands.map((b) => (
                        <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={current.stock ?? "all"}
                onValueChange={(v) => updateParam("stock", v)}
            >
                <SelectTrigger className={cn(selectClass, "w-[140px]")}>
                    <SelectValue placeholder="Stock" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="text-xs">Tous stocks</SelectItem>
                    <SelectItem value="out_of_stock" className="text-xs">Rupture ({stockLevels.outOfStock})</SelectItem>
                    <SelectItem value="critical" className="text-xs">Critique ({stockLevels.critical})</SelectItem>
                    <SelectItem value="low" className="text-xs">Faible ({stockLevels.low})</SelectItem>
                    <SelectItem value="good" className="text-xs">Bon ({stockLevels.good})</SelectItem>
                </SelectContent>
            </Select>

            <Sheet>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px] gap-1.5 border-border/80 hover:bg-accent/60"
                    >
                        <Filter className="w-3 h-3" />
                        <span className="hidden sm:inline">Plus</span>
                    </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle className="text-sm">Filtres avancés</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full py-4">
                        <div className="space-y-4 px-4">
                            {[
                                { label: "Catégorie", key: "category", options: categories, current: current.category },
                                { label: "Gamme", key: "color", options: colors, current: current.color },
                                { label: "Fournisseur", key: "supplier", options: suppliers, current: current.supplier },
                            ].map(({ label, key, options, current: c }) => (
                                <div key={key}>
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        {label}
                                    </h4>
                                    <div className="space-y-1">
                                        <Button
                                            variant={!c ? "secondary" : "ghost"}
                                            size="sm"
                                            className="w-full justify-start text-xs h-7"
                                            onClick={() => updateParam(key, "all")}
                                        >
                                            Toutes
                                        </Button>
                                        {options.map((opt) => (
                                            <Button
                                                key={opt}
                                                variant={c === opt ? "secondary" : "ghost"}
                                                size="sm"
                                                className="w-full justify-start text-xs h-7"
                                                onClick={() => updateParam(key, opt)}
                                            >
                                                {opt}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            {hasActive && (
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