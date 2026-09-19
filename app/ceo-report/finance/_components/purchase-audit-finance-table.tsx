// app/ceo-report/finance/_components/purchase-audit-finance-table.tsx
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

export interface PurchaseAuditRow {
    category: string;
    priceRequest: number;
    poAmount: number;
    receivedAmount: number;
    reliquatAmount: number;
    soldAmount: number;
    invoicedOdoo: number;
    paymentStatus: "Partiel" | "Total";
    paidAmount: number;
}

export interface LandedCostRow {
    label: string;
    amount: number;
    percentPo: number;
}

const AUDIT_ROWS: PurchaseAuditRow[] = [
    { category: "Achats Femme", priceRequest: 25000, poAmount: 22000, receivedAmount: 22000, reliquatAmount: 0, soldAmount: 11500, invoicedOdoo: 22000, paymentStatus: "Partiel", paidAmount: 16000 },
    { category: "Achats Kids", priceRequest: 10000, poAmount: 8000, receivedAmount: 8000, reliquatAmount: 0, soldAmount: 3800, invoicedOdoo: 6500, paymentStatus: "Total", paidAmount: 6500 },
    { category: "Achats Beauty", priceRequest: 14000, poAmount: 12000, receivedAmount: 10500, reliquatAmount: 1500, soldAmount: 7200, invoicedOdoo: 12000, paymentStatus: "Total", paidAmount: 12000 },
];

const LANDED_COSTS: LandedCostRow[] = [
    { label: "Frets du mois", amount: 3800, percentPo: 9.05 },
    { label: "Douanes & Dédouanement", amount: 2900, percentPo: 6.90 },
    { label: "Transports sur achats", amount: 1100, percentPo: 2.62 },
];

const TOTAL_AUDIT = {
    category: "TOTAL COMPTA",
    priceRequest: 49000,
    poAmount: 42000,
    receivedAmount: 40500,
    reliquatAmount: 1500,
    soldAmount: 22500,
    invoicedOdoo: 40500,
    status: "Contrôle Odoo",
    paidAmount: 34500,
};

const TOTAL_LANDED = {
    label: "TOTAL APPROCHE",
    amount: 7800,
    percentPo: 18.57,
};

function formatUsd(val: number): string {
    return val.toLocaleString("fr-FR");
}

export default function PurchaseAuditFinanceTable() {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    {/* Header dense bleu nuit */}
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        <TableRow className="border-none hover:bg-transparent text-[10px] font-bold text-white uppercase tracking-wider">
                            <TableHead className="py-2 px-3 text-left sticky left-0 z-20 bg-[#101c30] min-w-[120px] text-white">Catégorie</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Demande Prix ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Commande PO ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Reçu ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Reliquat ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Vendus ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white">Facturé Odoo ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-center text-white">Statut Paiement</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white border-r border-slate-700">Payé ($)</TableHead>

                            {/* Colonnes Frais Logistiques d'approche */}
                            <TableHead className="py-2 px-3 text-left text-white bg-[#0c1626] min-w-[140px]">Poste Logistique</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white bg-[#0c1626]">Montant ($)</TableHead>
                            <TableHead className="py-2 px-2.5 text-right text-white bg-[#0c1626]">% Achats</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {AUDIT_ROWS.map((row, idx) => {
                            const landed = LANDED_COSTS[idx];

                            return (
                                <tr
                                    key={row.category}
                                    className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                                >
                                    <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800">
                                        {row.category}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">{formatUsd(row.priceRequest)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">{formatUsd(row.poAmount)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">{formatUsd(row.receivedAmount)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">{formatUsd(row.reliquatAmount)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">{formatUsd(row.soldAmount)}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-bold text-slate-800 dark:text-slate-200">{formatUsd(row.invoicedOdoo)}</td>

                                    {/* Badge Statut */}
                                    <td className="py-1.5 px-2.5 text-center">
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono",
                                                row.paymentStatus === "Total"
                                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
                                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                                            )}
                                        >
                                            {row.paymentStatus}
                                        </span>
                                    </td>

                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800">
                                        {formatUsd(row.paidAmount)}
                                    </td>

                                    {/* Cellules Frais Logistiques */}
                                    <td className="py-1.5 px-3 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-900/30">
                                        {landed?.label || ""}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-800 dark:text-slate-200 bg-slate-50/30 dark:bg-slate-900/30">
                                        {landed ? `${formatUsd(landed.amount)}` : ""}
                                    </td>
                                    <td className="py-1.5 px-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-900/30">
                                        {landed ? `${landed.percentPo.toFixed(2).replace(".", ",")} %` : ""}
                                    </td>
                                </tr>
                            );
                        })}
                    </TableBody>

                    {/* Ligne TOTAL COMPTA & TOTAL APPROCHE */}
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                {TOTAL_AUDIT.category}
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">{formatUsd(TOTAL_AUDIT.priceRequest)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">{formatUsd(TOTAL_AUDIT.poAmount)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">{formatUsd(TOTAL_AUDIT.receivedAmount)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">{formatUsd(TOTAL_AUDIT.reliquatAmount)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">{formatUsd(TOTAL_AUDIT.soldAmount)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">{formatUsd(TOTAL_AUDIT.invoicedOdoo)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-center font-bold text-slate-800 dark:text-slate-200">{TOTAL_AUDIT.status}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 border-r border-slate-300 dark:border-slate-700 bg-indigo-50/40 dark:bg-indigo-950/30">
                                {formatUsd(TOTAL_AUDIT.paidAmount)}
                            </TableCell>

                            {/* Totaux Frais Logistiques */}
                            <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                {TOTAL_LANDED.label}
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                {formatUsd(TOTAL_LANDED.amount)}
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                {TOTAL_LANDED.percentPo.toFixed(2).replace(".", ",")} %
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}