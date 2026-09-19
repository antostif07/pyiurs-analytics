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

const CASH_DATA = [
    { site: "P24", cash: 4200, diff: 0 },
    { site: "P.MTO", cash: 3100, diff: -20 },
    { site: "P.LMB", cash: 2400, diff: 0 },
    { site: "P.KTM", cash: 1900, diff: 0 },
    { site: "P.BC / P.ONL", cash: 18500, diff: 0 },
];

const OPEX_DATA = [
    { label: "Marchandises (Achats)", amount: 42000, share: 64.8, classification: "Achat Stock / COGS" },
    { label: "Charges Financières", amount: 650, share: 1.0, classification: "Frais Bancaires & POS" },
    { label: "Marketing & Publicité", amount: 3500, share: 5.4, classification: "Social Ads, WhatsApp & Promos" },
    { label: "Fiscalité & Taxes", amount: 2400, share: 3.7, classification: "Impôts Locaux & Réglementaire" },
    { label: "Loyers & Charges Locatives", amount: 7800, share: 12.0, classification: "Baux Commerciaux" },
    { label: "Masse Salariale & RH", amount: 8400, share: 13.0, classification: "Salaires & Avantages Sociaux" },
];

function fmt(n: number) {
    return n.toLocaleString("fr-FR");
}

export default function CashOpexMatrixTable() {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        <TableRow className="border-none hover:bg-transparent text-[10px] font-bold text-white uppercase tracking-wider">
                            {/* Volet Gauche : Cash POS */}
                            <TableHead className="py-2 px-3 text-left sticky left-0 z-20 bg-[#101c30] min-w-[130px] text-white">
                                Site / Unité
                            </TableHead>
                            <TableHead className="py-2 px-3 text-right text-white min-w-[100px]">Cash Dispo ($)</TableHead>
                            <TableHead className="py-2 px-3 text-right text-white min-w-[100px] border-r border-slate-700">
                                Écart Caisse ($)
                            </TableHead>

                            {/* Volet Droit : Classification OPEX */}
                            <TableHead className="py-2 px-3 text-left text-white bg-[#0c1626] min-w-[180px]">Typologie de Charge</TableHead>
                            <TableHead className="py-2 px-3 text-right text-white bg-[#0c1626] min-w-[100px]">Montant ($)</TableHead>
                            <TableHead className="py-2 px-3 text-right text-white bg-[#0c1626] min-w-[80px]">Part (%)</TableHead>
                            <TableHead className="py-2 px-3 text-left text-white bg-[#0c1626] min-w-[190px]">Classification BI</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {OPEX_DATA.map((opex, idx) => {
                            const cash = CASH_DATA[idx];

                            return (
                                <tr key={opex.label} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                                    {/* Cash POS */}
                                    <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                        {cash?.site || ""}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                        {cash ? fmt(cash.cash) : ""}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums border-r border-slate-200 dark:border-slate-800">
                                        {cash ? (
                                            cash.diff < 0 ? (
                                                <span className="font-bold text-rose-600 dark:text-rose-400">{cash.diff}</span>
                                            ) : (
                                                <span className="text-slate-400">{cash.diff}</span>
                                            )
                                        ) : (
                                            ""
                                        )}
                                    </td>

                                    {/* OPEX */}
                                    <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 bg-slate-50/20 dark:bg-slate-900/20">
                                        {opex.label}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 bg-slate-50/20 dark:bg-slate-900/20">
                                        {fmt(opex.amount)}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-600 dark:text-slate-400 bg-slate-50/20 dark:bg-slate-900/20">
                                        {opex.share.toFixed(1).replace(".", ",")} %
                                    </td>
                                    <td className="py-1.5 px-3 text-slate-500 dark:text-slate-400 text-[10.5px] bg-slate-50/20 dark:bg-slate-900/20">
                                        {opex.classification}
                                    </td>
                                </tr>
                            );
                        })}
                    </TableBody>

                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                TOTAL CASH
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/30">
                                30 100 $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-rose-600 border-r border-slate-300 dark:border-slate-700">
                                -20 $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-left font-black uppercase text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                TOTAL OPEX
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                64 750 $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                100 %
                            </TableCell>
                            <TableCell className="py-2 px-3 text-left font-bold text-slate-600 dark:text-slate-300 bg-slate-100/60 dark:bg-slate-800">
                                Charges Opérationnelles Globales
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}