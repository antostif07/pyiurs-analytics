"use client";

import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
    ArrowDown,
    ArrowUp,
    ChevronDown,
    ChevronRight,
    ChevronsDownUp,
    ChevronsUpDown,
    Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BeautyBrandRow, DailySaleMetric } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function BeautyBrandsTable({
    brands,
    dateRange,
}: {
    brands: BeautyBrandRow[];
    dateRange: string[];
}) {
    const [search, setSearch] = useState("");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const filteredBrands = useMemo(() => {
        const q = search.trim().toLowerCase();
        const base = !q
            ? brands
            : brands
                .map((b) => {
                    if (b.name.toLowerCase().includes(q)) return b;
                    const matchedHs = b.hsGroups.filter(
                        (h) =>
                            h.name.toLowerCase().includes(q) ||
                            h.hsCode.toLowerCase().includes(q) ||
                            h.products.some((p) => p.name.toLowerCase().includes(q)),
                    );
                    if (matchedHs.length === 0) return null;
                    return { ...b, hsGroups: matchedHs };
                })
                .filter((x): x is BeautyBrandRow => x !== null);

        return [...base].sort((a, b) =>
            sortDir === "desc"
                ? b.totalAmount - a.totalAmount
                : a.totalAmount - b.totalAmount,
        );
    }, [brands, search, sortDir]);

    const dailyTotals = useMemo(() => {
        const map: Record<string, DailySaleMetric> = {};
        let grandAmount = 0;
        let grandQty = 0;
        for (const d of dateRange) map[d] = { amount: 0, quantity: 0 };

        for (const b of filteredBrands) {
            grandAmount += b.totalAmount;
            grandQty += b.totalQuantity;
            for (const d of dateRange) {
                const cell = b.dailySales[d];
                if (cell) {
                    map[d].amount += cell.amount;
                    map[d].quantity += cell.quantity;
                }
            }
        }
        return { byDate: map, grandAmount, grandQty };
    }, [filteredBrands, dateRange]);

    const toggle = (id: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAllBrands = () => {
        setExpanded(new Set(filteredBrands.map((b) => b.id)));
    };

    const collapseAll = () => setExpanded(new Set());

    if (brands.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucune vente Beauty enregistrée sur cette période.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {/* Barre outils */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher marque, HS code, produit..."
                        className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                <div className="flex items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={expandAllBrands}
                        className="h-7 px-2 text-[10.5px] gap-1"
                    >
                        <ChevronsUpDown className="w-3 h-3" />
                        Déplier marques
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={collapseAll}
                        className="h-7 px-2 text-[10.5px] gap-1"
                    >
                        <ChevronsDownUp className="w-3 h-3" />
                        Tout replier
                    </Button>
                </div>
            </div>

            {/* Tableau avec 1ère colonne sticky compatible dark mode */}
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-[11px] border-collapse">
                        <TableHeader className={HEADER_BG}>
                            <TableRow className={cn("border-none", HEADER_BG)}>
                                <TableHead
                                    className={cn(
                                        "sticky left-0 z-20 min-w-[260px] py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-left border-r border-slate-800",
                                        HEADER_BG,
                                    )}
                                >
                                    Marque / Gamme / Produit
                                </TableHead>
                                <TableHead
                                    onClick={() =>
                                        setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                                    }
                                    className={cn(
                                        "min-w-[110px] py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider text-right cursor-pointer hover:text-pink-300 select-none",
                                        HEADER_BG,
                                    )}
                                >
                                    <span className="inline-flex items-center gap-1">
                                        Total
                                        {sortDir === "desc" ? (
                                            <ArrowDown className="w-2.5 h-2.5" />
                                        ) : (
                                            <ArrowUp className="w-2.5 h-2.5" />
                                        )}
                                    </span>
                                </TableHead>
                                {dateRange.map((d) => {
                                    const dt = parseISO(d);
                                    return (
                                        <TableHead
                                            key={d}
                                            className={cn(
                                                "min-w-[88px] py-1.5 px-2 text-center text-white",
                                                HEADER_BG,
                                            )}
                                        >
                                            <div className="text-[10px] font-semibold leading-tight">
                                                {format(dt, "dd MMM", { locale: fr })}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-normal">
                                                {format(dt, "EEE", { locale: fr })}
                                            </div>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>

                        <TableBody className="divide-y divide-border/40">
                            {filteredBrands.map((brand) => {
                                const brandOpen = expanded.has(brand.id);
                                return (
                                    <React.Fragment key={brand.id}>
                                        {/* Niveau 1 : Marque */}
                                        <TableRow
                                            onClick={() => toggle(brand.id)}
                                            className="bg-card hover:bg-accent/40 cursor-pointer font-semibold"
                                        >
                                            <TableCell className="sticky left-0 z-10 bg-card py-2 px-3 border-r border-border/40">
                                                <div className="flex items-center gap-2">
                                                    {brandOpen ? (
                                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    )}
                                                    <span className="text-sky-600 dark:text-sky-400 truncate">
                                                        {brand.name}
                                                    </span>
                                                    <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                                                        {brand.hsGroups.length}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                                                <span>{fmt(brand.totalAmount)} $</span>
                                                <span className="ml-1 text-[10px] text-muted-foreground font-normal">
                                                    ({brand.totalQuantity})
                                                </span>
                                            </TableCell>
                                            {dateRange.map((d) => (
                                                <MetricCell key={d} metric={brand.dailySales[d]} bold />
                                            ))}
                                        </TableRow>

                                        {/* Niveau 2 : Gammes (HS Code) */}
                                        {brandOpen &&
                                            brand.hsGroups.map((hs) => {
                                                const hsOpen = expanded.has(hs.id);
                                                return (
                                                    <React.Fragment key={hs.id}>
                                                        <TableRow
                                                            onClick={() => toggle(hs.id)}
                                                            className="bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/30 cursor-pointer"
                                                        >
                                                            <TableCell className="sticky left-0 z-10 bg-emerald-50/90 dark:bg-emerald-950/60 py-1.5 px-3 pl-7 border-r border-border/40">
                                                                <div className="flex items-center gap-1.5">
                                                                    {hsOpen ? (
                                                                        <ChevronDown className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                                                    ) : (
                                                                        <ChevronRight className="w-3 h-3 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                                                    )}
                                                                    <span
                                                                        className="text-emerald-700 dark:text-emerald-300 font-medium truncate max-w-[210px]"
                                                                        title={hs.name}
                                                                    >
                                                                        {hs.name}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums whitespace-nowrap font-medium">
                                                                <span>{fmt(hs.totalAmount)} $</span>
                                                                <span className="ml-1 text-[10px] text-muted-foreground">
                                                                    ({hs.totalQuantity})
                                                                </span>
                                                            </TableCell>
                                                            {dateRange.map((d) => (
                                                                <MetricCell key={d} metric={hs.dailySales[d]} />
                                                            ))}
                                                        </TableRow>

                                                        {/* Niveau 3 : Produits */}
                                                        {hsOpen &&
                                                            hs.products.map((prod) => (
                                                                <TableRow
                                                                    key={prod.id}
                                                                    className="bg-muted/20 hover:bg-accent/20"
                                                                >
                                                                    <TableCell className="sticky left-0 z-10 bg-card py-1.5 px-3 pl-12 border-r border-border/40">
                                                                        <span
                                                                            className="text-muted-foreground truncate block max-w-[200px]"
                                                                            title={prod.name}
                                                                        >
                                                                            {prod.name}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="py-1.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-muted-foreground">
                                                                        <span>{fmt(prod.totalAmount)} $</span>
                                                                        <span className="ml-1 text-[10px]">
                                                                            ({prod.totalQuantity})
                                                                        </span>
                                                                    </TableCell>
                                                                    {dateRange.map((d) => (
                                                                        <MetricCell
                                                                            key={d}
                                                                            metric={prod.dailySales[d]}
                                                                            muted
                                                                        />
                                                                    ))}
                                                                </TableRow>
                                                            ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>

                        <TableFooter className="bg-muted/60 border-t border-border/80">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell className="sticky left-0 z-10 bg-muted py-2 px-3 text-[10px] font-bold uppercase border-r border-border/40">
                                    Total ({filteredBrands.length} marque{filteredBrands.length > 1 ? "s" : ""})
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                                    {fmt(dailyTotals.grandAmount)} $ ({dailyTotals.grandQty})
                                </TableCell>
                                {dateRange.map((d) => (
                                    <MetricCell key={d} metric={dailyTotals.byDate[d]} bold />
                                ))}
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>
        </div>
    );
}

function MetricCell({
    metric,
    bold,
    muted,
}: {
    metric?: DailySaleMetric;
    bold?: boolean;
    muted?: boolean;
}) {
    if (!metric || (metric.amount === 0 && metric.quantity === 0)) {
        return (
            <TableCell className="py-1.5 px-2 text-center text-muted-foreground/30">
                —
            </TableCell>
        );
    }
    return (
        <TableCell
            className={cn(
                "py-1.5 px-2 text-center font-mono tabular-nums whitespace-nowrap",
                bold && "font-semibold",
                muted && "text-muted-foreground",
            )}
        >
            <span>{fmt(metric.amount)}$</span>
            <span className="ml-0.5 text-[9.5px] text-muted-foreground font-normal">
                ({metric.quantity})
            </span>
        </TableCell>
    );
}