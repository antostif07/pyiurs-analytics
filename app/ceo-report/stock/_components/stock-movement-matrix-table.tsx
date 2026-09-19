// app/ceo-report/stock/_components/stock-movement-matrix-table.tsx
"use client";

import React, { useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table";
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

export interface StockMovementRow {
    segment: string;
    initialStock: number;
    purchases: number;
    sales: number;
    adjustments: number;
    closingStock: number;
}

// Données fidèles à la capture d'écran
export const DEFAULT_STOCK_MOVEMENTS: StockMovementRow[] = [
    {
        segment: "Femme",
        initialStock: 65000,
        purchases: 22000,
        sales: 21500,
        adjustments: -450,
        closingStock: 65050,
    },
    {
        segment: "Kids",
        initialStock: 24000,
        purchases: 8000,
        sales: 7800,
        adjustments: -200,
        closingStock: 23990,
    },
    {
        segment: "Beauty",
        initialStock: 18000,
        purchases: 12000,
        sales: 11900,
        adjustments: -150,
        closingStock: 17950,
    },
];

const TOTALS = {
    segment: "TOTAL STOCK",
    initialStock: 107000,
    purchases: 42000,
    sales: 41200,
    adjustments: -800,
    closingStock: 106990,
};

function formatUsd(val: number): string {
    return `${val.toLocaleString("fr-FR")} $`;
}

export default function StockMovementMatrixTable({
    data = DEFAULT_STOCK_MOVEMENTS,
}: {
    data?: StockMovementRow[];
}) {
    const columns = useMemo<ColumnDef<StockMovementRow>[]>(
        () => [
            {
                accessorKey: "segment",
                header: () => <span className="text-left">Segment</span>,
                cell: (info) => (
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "initialStock",
                header: () => "Stock Initial (Clôture M-1) ($)",
                cell: (info) => formatUsd(info.getValue() as number),
            },
            {
                accessorKey: "purchases",
                header: () => "Achats Fournisseurs ($)",
                cell: (info) => (
                    <span className="text-slate-700 dark:text-slate-300">
                        {formatUsd(info.getValue() as number)}
                    </span>
                ),
            },
            {
                accessorKey: "sales",
                header: () => "Ventes Clients Finaux ($)",
                cell: (info) => formatUsd(info.getValue() as number),
            },
            {
                accessorKey: "adjustments",
                header: () => "Ajustements Stock (Casses/Écarts) ($)",
                cell: (info) => {
                    const val = info.getValue() as number;
                    return (
                        <span
                            className={cn(
                                "font-bold font-mono",
                                val < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                            )}
                        >
                            {val < 0 ? `-${formatUsd(Math.abs(val))}` : `+${formatUsd(val)}`}
                        </span>
                    );
                },
            },
            {
                accessorKey: "closingStock",
                header: () => "Stock Clôture Mois ($)",
                cell: (info) => (
                    <span className="font-bold text-slate-900 dark:text-white">
                        {formatUsd(info.getValue() as number)}
                    </span>
                ),
            },
        ],
        []
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    {/* Header dense bleu nuit */}
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="border-none hover:bg-transparent"
                            >
                                {headerGroup.headers.map((header, idx) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider h-auto",
                                            idx === 0
                                                ? "text-left sticky left-0 z-20 bg-[#101c30] min-w-[130px]"
                                                : "text-right min-w-[140px]"
                                        )}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    {/* Lignes de données */}
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                            >
                                {row.getVisibleCells().map((cell, idx) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            "py-1.5 px-3 font-mono tabular-nums",
                                            idx === 0
                                                ? "text-left sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800"
                                                : "text-right text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>

                    {/* Ligne TOTAL FOOTER */}
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                {TOTALS.segment}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(TOTALS.initialStock)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(TOTALS.purchases)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(TOTALS.sales)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                -{formatUsd(Math.abs(TOTALS.adjustments))}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30">
                                {formatUsd(TOTALS.closingStock)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}