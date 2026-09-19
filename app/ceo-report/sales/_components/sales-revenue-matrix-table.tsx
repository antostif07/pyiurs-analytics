// app/ceo-report/sales/_components/sales-revenue-matrix-table.tsx
"use client";

import { FileSpreadsheet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SalesMatrixData } from "./types";

interface SalesRevenueMatrixTableProps {
    data: SalesMatrixData;
}

function formatUsd(val: number): string {
    return `${val.toLocaleString("en-US")} $`;
}

function formatPercent(val: number): string {
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(1).replace(".", ",")} %`;
}

export default function SalesRevenueMatrixTable({ data }: SalesRevenueMatrixTableProps) {
    const { stores, rows, totals } = data;

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {/* Header compact façon cockpit financier */}
            <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-amber-500 rounded-full shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        1. Performance Commerciale & Matrice des Revenus du Mois ($ USD)
                    </h3>
                </div>

                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                    {stores.length} Boutiques
                </span>
            </div>

            {/* Table Ultra-Dense */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-[#101c30] text-white text-[10px] font-bold uppercase tracking-wider">
                            <th className="sticky left-0 z-20 bg-[#101c30] py-2 px-3 min-w-[130px]">
                                Catégorie
                            </th>
                            {stores.map((s) => (
                                <th
                                    key={s.id}
                                    className="py-2 px-2.5 text-right min-w-[85px]"
                                >
                                    {s.code}
                                </th>
                            ))}
                            <th className="py-2 px-3 text-right min-w-[110px] bg-[#0c1626]">
                                Total Réalisé ($)
                            </th>
                            <th className="py-2 px-3 text-right min-w-[110px]">
                                Écart vs Budget ($)
                            </th>
                            <th className="py-2 px-3 text-right min-w-[110px]">
                                Écart vs Budget (%)
                            </th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                        {rows.map((row) => {
                            const isPositive = row.varianceAmount >= 0;

                            return (
                                <tr
                                    key={row.categoryId}
                                    className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors"
                                >
                                    {/* Catégorie (Sticky Left) */}
                                    <td className="sticky left-0 z-10 py-1.5 px-3 font-semibold bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                                        {row.categoryName}
                                    </td>

                                    {/* Colonnes Boutiques */}
                                    {stores.map((s) => (
                                        <td
                                            key={s.id}
                                            className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300"
                                        >
                                            {formatUsd(row.storeValues[s.id] || 0)}
                                        </td>
                                    ))}

                                    {/* Total Réalisé */}
                                    <td className="py-1.5 px-3 text-right font-bold font-mono tabular-nums text-slate-900 dark:text-white bg-slate-50/40 dark:bg-slate-800/30">
                                        {formatUsd(row.totalRealized)}
                                    </td>

                                    {/* Écart vs Budget ($) */}
                                    <td className="py-1.5 px-3 text-right">
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums",
                                                isPositive
                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50"
                                                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50"
                                            )}
                                        >
                                            {isPositive ? "+" : ""}
                                            {formatUsd(row.varianceAmount)}
                                        </span>
                                    </td>

                                    {/* Écart vs Budget (%) */}
                                    <td className="py-1.5 px-3 text-right">
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums",
                                                isPositive
                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50"
                                                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/50"
                                            )}
                                        >
                                            {isPositive ? (
                                                <ArrowUpRight className="w-3 h-3" />
                                            ) : (
                                                <ArrowDownRight className="w-3 h-3" />
                                            )}
                                            {formatPercent(row.variancePercent)}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}

                        {/* LIGNE FOOTER 1 : Total Réalisé ($) */}
                        <tr className="bg-slate-50 dark:bg-slate-800/70 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-[11px]">
                            <td className="sticky left-0 z-10 py-2 px-3 font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                Total Réalisé ($)
                            </td>
                            {stores.map((s) => (
                                <td
                                    key={s.id}
                                    className="py-2 px-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-white"
                                >
                                    {formatUsd(totals.totalRealizedByStore[s.id] || 0)}
                                </td>
                            ))}
                            <td className="py-2 px-3 text-right font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/30">
                                {formatUsd(totals.totalRealizedGlobal)}
                            </td>
                            <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50">
                                    +{formatUsd(totals.totalVarianceGlobal)}
                                </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50">
                                    +{totals.totalVariancePercentGlobal.toFixed(1)} %
                                </span>
                            </td>
                        </tr>

                        {/* LIGNE FOOTER 2 : Écart vs Budget ($) */}
                        <tr className="bg-slate-50/40 dark:bg-slate-800/30 text-[11px]">
                            <td className="sticky left-0 z-10 py-1.5 px-3 font-semibold uppercase tracking-wider bg-slate-50/80 dark:bg-slate-800/60 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                Écart vs Budget ($)
                            </td>
                            {stores.map((s) => {
                                const val = totals.varianceAmountByStore[s.id] || 0;
                                const pos = val >= 0;
                                return (
                                    <td key={s.id} className="py-1.5 px-2.5 text-right">
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-1 py-0.2 rounded text-[10px] font-mono font-bold tabular-nums",
                                                pos
                                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                                                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-600"
                                            )}
                                        >
                                            {pos ? `+${val.toLocaleString("en-US")}` : val.toLocaleString("en-US")}
                                        </span>
                                    </td>
                                );
                            })}
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-[11px] text-emerald-600">
                                +{formatUsd(totals.totalVarianceGlobal)}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-400 font-mono text-[10px]">--</td>
                            <td className="py-1.5 px-3 text-right text-slate-400 font-mono text-[10px]">--</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}