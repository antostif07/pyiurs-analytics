// app/ceo-report/stock/_components/store-stock-audit-sizes-table.tsx
"use client";

import React from "react";
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

const STOCK_AUDIT_DATA = [
    { site: "P.BC", femme: 32000, kids: 11000, beauty: 8500, total: 51500, status: "< 30 Jours", level: "ok" },
    { site: "P24", femme: 12500, kids: 4200, beauty: 3100, total: 19800, status: "< 30 Jours", level: "ok" },
    { site: "P.MTO", femme: 8500, kids: 3100, beauty: 2400, total: 14000, status: "30-90 Jours", level: "warning" },
    { site: "P.LMB", femme: 6200, kids: 2800, beauty: 1950, total: 10950, status: "> 90 Jours", level: "danger" }, // ⚠️ ALERTE ARNOLD BI
    { site: "P.KTM", femme: 5850, kids: 2890, beauty: 2000, total: 10740, status: "< 30 Jours", level: "ok" },
];

const SIZES_DATA = [
    { site: "P.BC", s: 120, m: 250, l: 210, xl: 140, xxl: 80 },
    { site: "P24", s: 45, m: 90, l: 85, xl: 50, xxl: 30 },
    { site: "P.MTO", s: 30, m: 65, l: 55, xl: 35, xxl: 15 },
    { site: "P.LMB", s: 25, m: 50, l: 45, xl: 25, xxl: 10 },
    { site: "P.KTM", s: 20, m: 45, l: 40, xl: 25, xxl: 15 },
];

function fmt(n: number) {
    return n.toLocaleString("fr-FR");
}

export default function StoreStockAuditSizesTable() {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        <TableRow className="border-none hover:bg-transparent text-[10px] font-bold text-white uppercase tracking-wider">
                            {/* Volet Gauche : Valorisation par Boutique */}
                            <TableHead className="py-2 px-3 text-left sticky left-0 z-20 bg-[#101c30] min-w-[110px] text-white">Site / Société</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Femme ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Kids ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Beauty ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Total ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-center text-white border-r border-slate-700">Statut Audit</TableHead>

                            {/* Volet Droit : Tailles Femme */}
                            <TableHead className="py-2 px-3 text-left text-white bg-[#0c1626] min-w-[80px]">Site</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">S (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">M (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">L (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">XL (pcs)</TableHead>
                            <TableHead className="py-2 px-2 text-right text-white bg-[#0c1626]">XXL+ (pcs)</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {STOCK_AUDIT_DATA.map((row, idx) => {
                            const sizes = SIZES_DATA[idx];

                            return (
                                <tr key={row.site} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                                    <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                        {row.site}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.femme)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.kids)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.beauty)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">{fmt(row.total)}</td>

                                    {/* Statut Audit */}
                                    <td className="py-1.5 px-2.5 text-center border-r border-slate-200 dark:border-slate-800">
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                                                row.level === "ok" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
                                                row.level === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
                                                row.level === "danger" && "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 ring-1 ring-rose-400 animate-pulse"
                                            )}
                                        >
                                            <span className={cn("w-1.5 h-1.5 rounded-full", row.level === "ok" && "bg-emerald-500", row.level === "warning" && "bg-amber-500", row.level === "danger" && "bg-rose-500")} />
                                            {row.status}
                                        </span>
                                    </td>

                                    {/* Tailles Femme */}
                                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/20 dark:bg-slate-900/20">{sizes.site}</td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">{sizes.s}</td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">{sizes.m}</td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">{sizes.l}</td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">{sizes.xl}</td>
                                    <td className="py-1.5 px-2 text-right font-mono tabular-nums bg-slate-50/20 dark:bg-slate-900/20">{sizes.xxl}</td>
                                </tr>
                            );
                        })}
                    </TableBody>

                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                TOTAL
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black">{fmt(65050)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black">{fmt(23990)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black">{fmt(17950)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40">
                                {fmt(106990)} $
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-center text-slate-400 border-r border-slate-300 dark:border-slate-700">--</TableCell>

                            <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">TOTAL</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">240</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">500</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">435</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">275</TableCell>
                            <TableCell className="py-2 px-2 text-right font-mono font-black bg-slate-100/60 dark:bg-slate-800">150</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}