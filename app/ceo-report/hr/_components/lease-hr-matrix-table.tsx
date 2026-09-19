// app/ceo-report/hr/_components/lease-hr-matrix-table.tsx
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

const MONTHS = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUN", "JUL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"] as const;

// 9.1 Matrice des Loyers
const LEASE_DATA = [
    { site: "P24", rent: 2200, paidMonths: 9, partialAmount: null, totalPaid: 19800 },
    { site: "P.MTO", rent: 1800, paidMonths: 9, partialAmount: null, totalPaid: 16200 },
    { site: "P.LMB", rent: 1400, paidMonths: 7, partialAmount: { month: "AOÛ", val: 800 }, totalPaid: 10600 },
];

// 9.2 Tableau RH
const HR_DATA = [
    { team: "Vente P24", staff: 3, baseSalary: 1200, perks: 300, totalCost: 1500, leaves: 12 },
    { team: "Vente P.MTO", staff: 2, baseSalary: 800, perks: 200, totalCost: 1000, leaves: 8 },
    { team: "Vente P.LMB", staff: 2, baseSalary: 800, perks: 200, totalCost: 1000, leaves: 6 },
    { team: "Vente P.KTM", staff: 2, baseSalary: 800, perks: 200, totalCost: 1000, leaves: 10 },
    { team: "P.ONL (Vente En Ligne)", staff: 2, baseSalary: 900, perks: 250, totalCost: 1150, leaves: 7 },
    { team: "P.BC (Admin, Stock, Compta)", staff: 4, baseSalary: 2100, perks: 650, totalCost: 2750, leaves: 18 },
];

function fmt(n: number) {
    return n.toLocaleString("fr-FR");
}

export default function LeaseHrMatrixTable() {
    return (
        <div className="space-y-6">
            {/* ── 9.1 MATRICE DES LOYERS ── */}
            <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    9.1 Matrice des Loyers & Baux par Boutique (12 Mois 2026)
                </h4>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="w-full text-[11px]">
                            <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                                <TableRow className="border-none hover:bg-transparent text-[10px] font-bold text-white uppercase tracking-wider">
                                    <TableHead className="py-2 px-3 text-left sticky left-0 z-20 bg-[#101c30] min-w-[100px] text-white">Site</TableHead>
                                    <TableHead className="py-2 px-2.5 text-right text-white min-w-[90px]">Loyer ($)</TableHead>
                                    {MONTHS.map((m) => (
                                        <TableHead key={m} className="py-2 px-1 text-center text-white min-w-[55px] text-[9.5px]">
                                            {m}
                                        </TableHead>
                                    ))}
                                    <TableHead className="py-2 px-3 text-right text-white min-w-[110px]">Total Payé ($)</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {LEASE_DATA.map((row) => (
                                    <tr key={row.site} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                                        <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                            {row.site}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                                            {fmt(row.rent)}
                                        </td>

                                        {/* 12 Mois avec Pastilles Vert / Jaune / Rouge */}
                                        {MONTHS.map((m, idx) => {
                                            const isPartial = row.partialAmount?.month === m;
                                            const isPaid = idx < row.paidMonths && !isPartial;
                                            const isDue = idx >= row.paidMonths;

                                            return (
                                                <td key={m} className="py-1 px-1 text-center">
                                                    {isPaid && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                                                            {row.rent}
                                                        </span>
                                                    )}
                                                    {isPartial && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                                                            {row.partialAmount?.val}
                                                        </span>
                                                    )}
                                                    {isDue && (
                                                        <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                                                            {row.rent}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                                            {fmt(row.totalPaid)}
                                        </td>
                                    </tr>
                                ))}
                            </TableBody>

                            <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                        TOTAL LOYERS
                                    </TableCell>
                                    <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                        7 800
                                    </TableCell>
                                    <TableCell colSpan={7} className="py-2 px-1 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                        7 800 / mois payé
                                    </TableCell>
                                    <TableCell className="py-2 px-1 text-center font-mono font-bold text-amber-700">7 200</TableCell>
                                    <TableCell className="py-2 px-1 text-center font-mono font-bold text-amber-700">6 400</TableCell>
                                    <TableCell colSpan={3} className="py-2 px-1 text-center font-mono text-slate-400">7 800 (À échoir)</TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40">
                                        68 200 $
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
            </div>

            {/* ── 9.2 TABLEAU RH & SALAIRES ── */}
            <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    9.2 Tableau de Bord Ressources Humaines & Salaires
                </h4>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="w-full text-[11px]">
                            <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                                <TableRow className="border-none hover:bg-transparent text-[10px] font-bold text-white uppercase tracking-wider">
                                    <TableHead className="py-2 px-3 text-left sticky left-0 z-20 bg-[#101c30] min-w-[180px] text-white">Unité / Équipe</TableHead>
                                    <TableHead className="py-2 px-3 text-right text-white">Actifs</TableHead>
                                    <TableHead className="py-2 px-3 text-right text-white">Salaires ($)</TableHead>
                                    <TableHead className="py-2 px-3 text-right text-white">Avantages ($)</TableHead>
                                    <TableHead className="py-2 px-3 text-right text-white">Total Chargé ($)</TableHead>
                                    <TableHead className="py-2 px-3 text-right text-white">Congés (J)</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {HR_DATA.map((row) => (
                                    <tr key={row.team} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                                        <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                            {row.team}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">{row.staff}</td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.baseSalary)}</td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">{fmt(row.perks)}</td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">{fmt(row.totalCost)}</td>
                                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{row.leaves}</td>
                                    </tr>
                                ))}
                            </TableBody>

                            <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                        TOTAL RH
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">15</TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">{fmt(6600)}</TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">{fmt(1800)}</TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40">
                                        {fmt(8400)} $
                                    </TableCell>
                                    <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">61 jours</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
}