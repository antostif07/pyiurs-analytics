// app/ceo-report/stock/_components/store-stock-audit-sizes-table.tsx
"use client";

import React, { useMemo } from "react";
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

export interface StoreStockAuditRow {
    site: string;       // "P.BC", "P24", "P.MTO", "P.LMB", "P.KTM"
    storeKey: string;   // "PB_BC", "P24", etc.
    femme: number;      // $
    kids: number;       // $
    beauty: number;     // $
    total: number;      // $
    status: string;     // "< 30 Jours", "30-90 Jours", "> 90 Jours"
    level: "ok" | "warning" | "danger";
    sizes: {
        s: number;
        m: number;
        l: number;
        xl: number;
        xxl: number;
    };
}

interface StoreStockAuditSizesTableProps {
    data?: StoreStockAuditRow[];
    isLoading?: boolean;
}

function fmt(n: number): string {
    return Math.round(n).toLocaleString("fr-FR");
}

export default function StoreStockAuditSizesTable({
    data = [],
    isLoading = false,
}: StoreStockAuditSizesTableProps) {
    // Calcul dynamique des totaux à partir des données réelles
    const totals = useMemo(() => {
        return data.reduce(
            (acc, r) => ({
                femme: acc.femme + (r.femme || 0),
                kids: acc.kids + (r.kids || 0),
                beauty: acc.beauty + (r.beauty || 0),
                total: acc.total + (r.total || 0),
                s: acc.s + (r.sizes?.s || 0),
                m: acc.m + (r.sizes?.m || 0),
                l: acc.l + (r.sizes?.l || 0),
                xl: acc.xl + (r.sizes?.xl || 0),
                xxl: acc.xxl + (r.sizes?.xxl || 0),
            }),
            { femme: 0, kids: 0, beauty: 0, total: 0, s: 0, m: 0, l: 0, xl: 0, xxl: 0 }
        );
    }, [data]);

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        <TableRow className="border-none hover:bg-transparent text-[10px] font-bold text-white uppercase tracking-wider">
                            {/* Volet Gauche : Valorisation par Boutique */}
                            <TableHead className="py-2 px-3 text-left sticky left-0 z-20 bg-[#101c30] min-w-[110px] text-white">
                                Site / Société
                            </TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Femme ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Kids ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Beauty ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Total ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-center text-white border-r border-slate-700">
                                Statut Audit
                            </TableHead>

                            {/* Volet Droit : Tailles Femme */}
                            <TableHead className="py-2 px-3 text-left text-white bg-[#0c1626] min-w-[80px]">
                                Site
                            </TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">S (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">M (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">L (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">XL (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">XXL+ (pcs)</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {isLoading ? (
                            // Skeletons de chargement
                            [1, 2, 3, 4, 5].map((i) => (
                                <TableRow key={i} className="animate-pulse">
                                    <TableCell className="py-2 px-3">
                                        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                                    </TableCell>
                                    {[1, 2, 3, 4, 5].map((c) => (
                                        <TableCell key={c} className="py-2 px-2.5 text-right">
                                            <div className="h-3 w-12 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                                        </TableCell>
                                    ))}
                                    <TableCell className="py-2 px-3">
                                        <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800 rounded" />
                                    </TableCell>
                                    {[1, 2, 3, 4, 5].map((c) => (
                                        <TableCell key={c} className="py-2 px-2 text-right">
                                            <div className="h-3 w-8 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : data.length > 0 ? (
                            data.map((row) => (
                                <tr
                                    key={row.site}
                                    className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                                >
                                    <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                        {row.site}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                        {fmt(row.femme)}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                        {fmt(row.kids)}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                        {fmt(row.beauty)}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                                        {fmt(row.total)}
                                    </td>

                                    {/* Statut Audit */}
                                    <td className="py-1.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-800">
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                                                row.level === "ok" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
                                                row.level === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
                                                row.level === "danger" && "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 ring-1 ring-rose-400"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    row.level === "ok" && "bg-emerald-500",
                                                    row.level === "warning" && "bg-amber-500",
                                                    row.level === "danger" && "bg-rose-500"
                                                )}
                                            />
                                            {row.status}
                                        </span>
                                    </td>

                                    {/* Tailles Femme */}
                                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/20 dark:bg-slate-900/20">
                                        {row.site}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">
                                        {fmt(row.sizes.s)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">
                                        {fmt(row.sizes.m)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">
                                        {fmt(row.sizes.l)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">
                                        {fmt(row.sizes.xl)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">
                                        {fmt(row.sizes.xxl)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={12} className="py-4 text-center text-slate-400 italic">
                                    Aucune donnée disponible pour ces boutiques
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>

                    {/* Ligne TOTAL DYNAMIQUE */}
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                TOTAL
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black">{fmt(totals.femme)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black">{fmt(totals.kids)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black">{fmt(totals.beauty)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40">
                                {fmt(totals.total)} $
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-center text-slate-400 border-r border-slate-300 dark:border-slate-700">
                                --
                            </TableCell>

                            <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                TOTAL
                            </TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">{fmt(totals.s)}</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">{fmt(totals.m)}</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">{fmt(totals.l)}</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">{fmt(totals.xl)}</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">{fmt(totals.xxl)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}