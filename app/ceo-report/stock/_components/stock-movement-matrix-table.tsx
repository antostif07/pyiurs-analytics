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

function formatUsd(val: number): string {
    return `${Math.round(val).toLocaleString("fr-FR")} $`;
}

interface StockMovementMatrixTableProps {
    data?: StockMovementRow[];
    isLoading?: boolean;
}

export default function StockMovementMatrixTable({
    data = [],
    isLoading = false,
}: StockMovementMatrixTableProps) {
    // Calcul dynamique de la ligne TOTAL à partir des vraies données
    const totals = useMemo(() => {
        return data.reduce(
            (acc, row) => ({
                segment: "TOTAL STOCK",
                initialStock: acc.initialStock + (row.initialStock || 0),
                purchases: acc.purchases + (row.purchases || 0),
                sales: acc.sales + (row.sales || 0),
                adjustments: acc.adjustments + (row.adjustments || 0),
                closingStock: acc.closingStock + (row.closingStock || 0),
            }),
            {
                segment: "TOTAL STOCK",
                initialStock: 0,
                purchases: 0,
                sales: 0,
                adjustments: 0,
                closingStock: 0,
            }
        );
    }, [data]);

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
                    const val = Number(info.getValue() || 0);
                    return (
                        <span
                            className={cn(
                                "font-bold font-mono",
                                val < 0
                                    ? "text-rose-600 dark:text-rose-400"
                                    : val > 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-slate-400"
                            )}
                        >
                            {val < 0 ? `-${formatUsd(Math.abs(val))}` : val > 0 ? `+${formatUsd(val)}` : "0 $"}
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

                    {/* Lignes de données ou Skeleton */}
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {isLoading ? (
                            // Skeletons de chargement
                            [1, 2, 3].map((i) => (
                                <TableRow key={i} className="animate-pulse">
                                    <TableCell className="py-2.5 px-3">
                                        <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                                    </TableCell>
                                    {[1, 2, 3, 4, 5].map((c) => (
                                        <TableCell key={c} className="py-2.5 px-3 text-right">
                                            <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : table.getRowModel().rows.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
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
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="py-4 text-center text-slate-400 italic">
                                    Aucun mouvement de stock sur cette période
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>

                    {/* Ligne TOTAL DYNAMIQUE */}
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                {totals.segment}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(totals.initialStock)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(totals.purchases)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(totals.sales)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                {totals.adjustments < 0 ? `-${formatUsd(Math.abs(totals.adjustments))}` : `${formatUsd(totals.adjustments)}`}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30">
                                {formatUsd(totals.closingStock)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}