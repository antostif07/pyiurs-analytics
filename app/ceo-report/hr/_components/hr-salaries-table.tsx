// app/ceo-report/hr/_components/hr-salaries-table.tsx
"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { HrRow, HrTotals } from "../_lib/types";

interface HrSalariesTableProps {
    rows: HrRow[];
    totals: HrTotals;
}

function fmt(n: number) {
    return n.toLocaleString("fr-FR");
}

export default function HrSalariesTable({ rows, totals }: HrSalariesTableProps) {
    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        <TableRow className="border-none hover:bg-transparent text-[10px] font-bold text-white uppercase tracking-wider">
                            <TableHead className="py-2 px-3 text-left sticky left-0 z-20 bg-[#101c30] min-w-[180px] text-white">
                                Unité / Équipe
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-white">
                                Actifs
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-white">
                                Salaires ($)
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-white">
                                Avantages ($)
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-white">
                                Total Chargé ($)
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-white">
                                Congés (J)
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {rows.map((row) => (
                            <tr
                                key={row.team}
                                className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                            >
                                <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                    {row.team}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                                    {row.staff}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                    {fmt(row.baseSalary)}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                    {fmt(row.perks)}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                                    {fmt(row.totalCost)}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                    {row.leaves}
                                </td>
                            </tr>
                        ))}
                    </TableBody>

                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                TOTAL RH
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {totals.staff}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {fmt(totals.baseSalary)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {fmt(totals.perks)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40">
                                {fmt(totals.totalCost)} $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {totals.leaves} jours
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}