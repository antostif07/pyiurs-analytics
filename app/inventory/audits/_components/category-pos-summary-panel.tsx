"use client";

import React, { useMemo } from "react";
import { BarChart3, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    StockAuditItem,
} from "../_lib/types";
import { aggregateByPosCategory } from "../_lib/helpers";

const formatUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);

interface Props {
    /** Liste COMPLÈTE des items (non filtrée) pour une vue d'ensemble stable */
    items: StockAuditItem[];
    /** IDs de catégories actuellement sélectionnées dans le filtre */
    selectedCategoryIds: number[];
    /** Bascule une catégorie dans le filtre (multi-select) */
    onToggleCategory: (id: number) => void;
    /** Efface le filtre POS (sélectionne tout) */
    onClearFilter: () => void;
}

export function PosSummaryPanel({
    items,
    selectedCategoryIds,
    onToggleCategory,
    onClearFilter,
}: Props) {
    const aggregates = useMemo(() => aggregateByPosCategory(items), [items]);
    const selectedSet = useMemo(
        () => new Set(selectedCategoryIds),
        [selectedCategoryIds]
    );
    const hasFilter = selectedCategoryIds.length > 0;
    const distinctCount = aggregates.filter((a) => a.id !== null).length;

    /* Totaux du pied de tableau */
    const totals = useMemo(
        () =>
            aggregates.reduce(
                (acc, a) => ({
                    total: acc.total + a.totalItems,
                    scanned: acc.scanned + a.scannedItems,
                    remaining: acc.remaining + a.remainingItems,
                    sold: acc.sold + a.soldElsewhere,
                    diffQty: acc.diffQty + a.totalDiffQty,
                    diffValue: acc.diffValue + a.totalDiffValue,
                }),
                {
                    total: 0,
                    scanned: 0,
                    remaining: 0,
                    sold: 0,
                    diffQty: 0,
                    diffValue: 0,
                }
            ),
        [aggregates]
    );

    if (aggregates.length === 0) {
        return (
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
                <p className="text-xs text-muted-foreground">
                    Aucune donnée POS disponible. Synchronisez Odoo pour charger les catégories.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* ─── HEADER ─── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                        Synthèse par catégorie POS
                    </h3>
                    <Badge
                        variant="outline"
                        className="text-[9px] font-mono border-border/60"
                    >
                        {distinctCount} catégorie{distinctCount > 1 ? "s" : ""}
                    </Badge>
                </div>

                {hasFilter && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilter}
                        className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                    >
                        <X className="w-3 h-3 mr-1" />
                        Effacer le filtre
                    </Button>
                )}
            </div>

            {/* ─── TABLE ─── */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border">
                        <tr className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            <th className="text-left py-2 px-4">Catégorie</th>
                            <th className="text-center py-2 px-3">Progression</th>
                            <th className="text-center py-2 px-3">Total</th>
                            <th className="text-center py-2 px-3">Scannés</th>
                            <th className="text-center py-2 px-3">Restants</th>
                            <th className="text-center py-2 px-3">Vendus (-1)</th>
                            <th className="text-center py-2 px-3">Écart qté</th>
                            <th className="text-right py-2 px-4">Écart ($)</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-border/40">
                        {aggregates.map((agg) => {
                            const isSelected =
                                agg.id !== null && selectedSet.has(agg.id);
                            const isUncategorized = agg.id === null;
                            const disabled = isUncategorized;   // clic désactivé
                            const progress =
                                agg.totalItems > 0
                                    ? Math.round(
                                        (agg.scannedItems / agg.totalItems) * 100
                                    )
                                    : 0;

                            return (
                                <tr
                                    key={`pos-${agg.id ?? "uncat"}`}
                                    onClick={() =>
                                        !disabled &&
                                        agg.id !== null &&
                                        onToggleCategory(agg.id)
                                    }
                                    className={cn(
                                        "transition-colors",
                                        !disabled && "cursor-pointer hover:bg-muted/30",
                                        isSelected &&
                                        "bg-primary/5 hover:bg-primary/10",
                                        disabled && "opacity-60"
                                    )}
                                >
                                    {/* Catégorie */}
                                    <td className="py-2 px-4">
                                        <div className="flex items-center gap-2">
                                            {isSelected && (
                                                <span className="w-1 h-5 rounded bg-primary shrink-0" />
                                            )}
                                            <span
                                                className={cn(
                                                    "font-medium",
                                                    isUncategorized &&
                                                    "italic text-muted-foreground"
                                                )}
                                            >
                                                {agg.name}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Barre de progression */}
                                    <td className="py-2 px-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all",
                                                        progress >= 90
                                                            ? "bg-emerald-500"
                                                            : progress >= 50
                                                                ? "bg-amber-500"
                                                                : "bg-rose-500"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                                                {progress}%
                                            </span>
                                        </div>
                                    </td>

                                    <td className="py-2 px-3 text-center font-mono">
                                        {agg.totalItems}
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600">
                                        {agg.scannedItems}
                                    </td>
                                    <td className="py-2 px-3 text-center font-mono text-amber-600">
                                        {agg.remainingItems}
                                    </td>
                                    <td
                                        className={cn(
                                            "py-2 px-3 text-center font-mono",
                                            agg.soldElsewhere > 0
                                                ? "text-rose-600 font-bold"
                                                : "text-muted-foreground/60"
                                        )}
                                    >
                                        {agg.soldElsewhere}
                                    </td>
                                    <td
                                        className={cn(
                                            "py-2 px-3 text-center font-mono font-bold",
                                            agg.totalDiffQty < 0
                                                ? "text-rose-600"
                                                : "text-muted-foreground/60"
                                        )}
                                    >
                                        {agg.totalDiffQty > 0
                                            ? `+${agg.totalDiffQty}`
                                            : agg.totalDiffQty}
                                    </td>
                                    <td
                                        className={cn(
                                            "py-2 px-4 text-right font-mono font-bold",
                                            agg.totalDiffValue < 0
                                                ? "text-rose-600"
                                                : "text-muted-foreground/60"
                                        )}
                                    >
                                        {formatUSD(agg.totalDiffValue)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* ─── LIGNE TOTAL ─── */}
                    <tfoot className="bg-amber-50/50 dark:bg-amber-500/5 border-t-2 border-amber-500/30">
                        <tr className="font-bold">
                            <td className="py-2.5 px-4">TOTAL GÉNÉRAL</td>
                            <td className="py-2.5 px-3" />
                            <td className="py-2.5 px-3 text-center font-mono">
                                {totals.total}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-emerald-600">
                                {totals.scanned}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-amber-600">
                                {totals.remaining}
                            </td>
                            <td
                                className={cn(
                                    "py-2.5 px-3 text-center font-mono",
                                    totals.sold > 0 && "text-rose-600"
                                )}
                            >
                                {totals.sold}
                            </td>
                            <td
                                className={cn(
                                    "py-2.5 px-3 text-center font-mono",
                                    totals.diffQty < 0 && "text-rose-600"
                                )}
                            >
                                {totals.diffQty > 0
                                    ? `+${totals.diffQty}`
                                    : totals.diffQty}
                            </td>
                            <td
                                className={cn(
                                    "py-2.5 px-4 text-right font-mono",
                                    totals.diffValue < 0 && "text-rose-600"
                                )}
                            >
                                {formatUSD(totals.diffValue)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* ─── NOTE EXPLICATIVE ─── */}
            <div className="px-4 py-2 border-t border-border bg-muted/20">
                <p className="text-[10px] text-muted-foreground italic">
                    ⓘ Les items multi-catégories sont comptés dans chacune d&apos;elles.
                    Cliquez sur une catégorie pour filtrer le tableau ci-dessous.
                </p>
            </div>
        </div>
    );
}