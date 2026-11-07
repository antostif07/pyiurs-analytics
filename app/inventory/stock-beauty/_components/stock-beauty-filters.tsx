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
import type {
    FilterState,
    PurchaseOrderOption,
    StockLevels,
} from "../_lib/types";

interface Props {
    brands: string[];
    colors: string[];
    categories: string[];
    suppliers: string[];
    purchaseOrders: PurchaseOrderOption[];
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
    purchaseOrders,
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
        current.brand ||
        current.color ||
        current.category ||
        current.supplier ||
        current.stock ||
        current.purchaseOrder;

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1.5 transition-opacity",
                isPending && "opacity-60",
            )}
        >
            {/* ✅ Nouveau : filtre PO */}
            <Select
                value={current.purchaseOrder ?? "all"}
                onValueChange={(v) => updateParam("po", v)}
            >
                <SelectTrigger className={cn(selectClass, "w-[220px]")}>
                    <SelectValue placeholder="Bon de commande" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                    <SelectItem value="all" className="text-xs">
                        Tous les bons de commande
                    </SelectItem>
                    {purchaseOrders.map((po) => (
                        <SelectItem
                            key={po.id}
                            value={String(po.id)}
                            className="text-xs"
                        >
                            {po.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

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
                            {/* ✅ Catégorie en Select */}
                            <div className="space-y-1.5">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Catégorie
                                </h4>
                                <Select
                                    value={current.category ?? "all"}
                                    onValueChange={(v) => updateParam("category", v)}
                                >
                                    <SelectTrigger className={cn(selectClass, "w-full h-9")}>
                                        <SelectValue placeholder="Toutes catégories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">Toutes catégories</SelectItem>
                                        {categories.map((c) => (
                                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* ✅ Gamme en Select */}
                            <div className="space-y-1.5">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Gamme
                                </h4>
                                <Select
                                    value={current.color ?? "all"}
                                    onValueChange={(v) => updateParam("color", v)}
                                >
                                    <SelectTrigger className={cn(selectClass, "w-full h-9")}>
                                        <SelectValue placeholder="Toutes gammes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">Toutes gammes</SelectItem>
                                        {colors.map((c) => (
                                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* ✅ Fournisseur en Select */}
                            <div className="space-y-1.5">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    Fournisseur
                                </h4>
                                <Select
                                    value={current.supplier ?? "all"}
                                    onValueChange={(v) => updateParam("supplier", v)}
                                >
                                    <SelectTrigger className={cn(selectClass, "w-full h-9")}>
                                        <SelectValue placeholder="Tous fournisseurs" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="text-xs">Tous fournisseurs</SelectItem>
                                        {suppliers.map((s) => (
                                            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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