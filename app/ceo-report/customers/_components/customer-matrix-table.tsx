// app/ceo-report/customers/_components/customer-matrix-table.tsx
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

export interface CustomerSegmentRow {
    segment: string;
    totalCustomers: number;
    grossAdds: number;
    churn30d: number;
    acqRevenue: number;
    recRevenue: number;
    arpu: number;
}

interface CustomerMatrixTableProps {
    data?: CustomerSegmentRow[];
    isLoading?: boolean; // ✅ Prise en charge de l'état de chargement
}

function formatNumber(val: number): string {
    return Math.round(val || 0).toLocaleString("fr-FR");
}

function formatArpu(val: number): string {
    return `${(val || 0).toFixed(2).replace(".", ",")} $`;
}

export default function CustomerMatrixTable({
    data = [],
    isLoading = false,
}: CustomerMatrixTableProps) {
    // ✅ Calcul 100% dynamique de la ligne TOTAL à partir des données réelles
    const totals = useMemo(() => {
        const sum = data.reduce(
            (acc, row) => ({
                totalCustomers: acc.totalCustomers + (row.totalCustomers || 0),
                grossAdds: acc.grossAdds + (row.grossAdds || 0),
                churn30d: acc.churn30d + (row.churn30d || 0),
                acqRevenue: acc.acqRevenue + (row.acqRevenue || 0),
                recRevenue: acc.recRevenue + (row.recRevenue || 0),
            }),
            {
                totalCustomers: 0,
                grossAdds: 0,
                churn30d: 0,
                acqRevenue: 0,
                recRevenue: 0,
            }
        );

        const totalRevenue = sum.acqRevenue + sum.recRevenue;
        const globalArpu = sum.totalCustomers > 0 ? Number((totalRevenue / sum.totalCustomers).toFixed(2)) : 0;

        return {
            segment: "TOTAL CLIENTS",
            ...sum,
            arpu: globalArpu,
        };
    }, [data]);

    const columns = useMemo<ColumnDef<CustomerSegmentRow>[]>(
        () => [
            {
                accessorKey: "segment",
                header: () => <span className="text-left">Segment Client</span>,
                cell: (info) => {
                    const val = info.getValue() as string;
                    return (
                        <span
                            className={cn(
                                "text-[11px] font-bold",
                                val === "Platinum" && "text-slate-900 dark:text-white font-black",
                                val === "Gold" && "text-amber-600 dark:text-amber-400",
                                val === "Silver" && "text-slate-500 dark:text-slate-400",
                                val === "Autres Clients" && "text-slate-600 dark:text-slate-400 font-medium"
                            )}
                        >
                            {val}
                        </span>
                    );
                },
            },
            {
                accessorKey: "totalCustomers",
                header: () => "Parc Clients Total",
                cell: (info) => formatNumber(info.getValue() as number),
            },
            {
                accessorKey: "grossAdds",
                header: () => "Gross Adds (Nouveaux)",
                cell: (info) => (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{formatNumber(info.getValue() as number)}
                    </span>
                ),
            },
            {
                accessorKey: "churn30d",
                header: () => "Churn (30 Jours)",
                cell: (info) => (
                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                        {formatNumber(info.getValue() as number)}
                    </span>
                ),
            },
            {
                accessorKey: "acqRevenue",
                header: () => "Revenu Acquisitions ($)",
                cell: (info) => `${formatNumber(info.getValue() as number)} $`,
            },
            {
                accessorKey: "recRevenue",
                header: () => "Revenu Récurrent ($)",
                cell: (info) => `${formatNumber(info.getValue() as number)} $`,
            },
            {
                accessorKey: "arpu",
                header: () => "ARPU ($/Client)",
                cell: (info) => (
                    <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                        {formatArpu(info.getValue() as number)}
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
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-none hover:bg-transparent">
                                {headerGroup.headers.map((header, idx) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider h-auto",
                                            idx === 0
                                                ? "text-left sticky left-0 z-20 bg-[#101c30] min-w-[130px]"
                                                : "text-right min-w-[100px]"
                                        )}
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {isLoading ? (
                            // ── Skeletons animés pendant le fetch Odoo ──
                            [1, 2, 3, 4].map((i) => (
                                <TableRow key={i} className="animate-pulse">
                                    <TableCell className="py-2.5 px-3">
                                        <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                                    </TableCell>
                                    {[1, 2, 3, 4, 5, 6].map((c) => (
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
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="py-6 text-center text-slate-400 italic">
                                    Aucune transaction client trouvée sur cette période
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
                                {formatNumber(totals.totalCustomers)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                +{formatNumber(totals.grossAdds)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                {formatNumber(totals.churn30d)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatNumber(totals.acqRevenue)} $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatNumber(totals.recRevenue)} $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30">
                                {formatArpu(totals.arpu)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}