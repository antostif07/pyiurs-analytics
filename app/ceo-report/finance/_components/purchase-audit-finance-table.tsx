// app/ceo-report/finance/_components/purchase-audit-finance-table.tsx
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
import { cn } from "@/lib/utils";
import type {
    LandedCostRow,
    LandedCostTotal,
    PurchaseAuditRow,
    PurchaseAuditTotals,
} from "../_lib/types";

interface PurchaseAuditFinanceTableProps {
    rows: PurchaseAuditRow[];
    landedCosts: LandedCostRow[];
    totals?: PurchaseAuditTotals;
    landedTotal?: LandedCostTotal;
}

function formatUsd(val: number): string {
    return val.toLocaleString("fr-FR");
}

export default function PurchaseAuditFinanceTable({
    rows,
    landedCosts,
    totals,
    landedTotal,
}: PurchaseAuditFinanceTableProps) {
    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    {/* Header inchangé */}
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        {/* … (inchangé) … */}
                    </TableHeader>

                    {/* Body inchangé */}
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {/* … (inchangé) … */}
                    </TableBody>

                    {/* Footer : uniquement si totals + landedTotal fournis */}
                    {totals && landedTotal && (
                        <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                    {totals.category}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                    {formatUsd(totals.priceRequest)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                    {formatUsd(totals.poAmount)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                    {formatUsd(totals.receivedAmount)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                    {formatUsd(totals.reliquatAmount)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                    {formatUsd(totals.soldAmount)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                                    {formatUsd(totals.invoicedOdoo)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                                    {totals.status}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 border-r border-slate-300 dark:border-slate-700 bg-indigo-50/40 dark:bg-indigo-950/30">
                                    {formatUsd(totals.paidAmount)}
                                </TableCell>

                                <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                    TOTAL APPROCHE
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                    {formatUsd(landedTotal.amount)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono font-black text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800">
                                    {landedTotal.percentPo.toFixed(2).replace(".", ",")} %
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </div>
        </div>
    );
}