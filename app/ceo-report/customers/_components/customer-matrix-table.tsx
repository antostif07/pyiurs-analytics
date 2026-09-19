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

export const DEFAULT_CUSTOMER_DATA: CustomerSegmentRow[] = [
    { segment: "Platinum", totalCustomers: 80, grossAdds: 6, churn30d: 1, acqRevenue: 2400, recRevenue: 18500, arpu: 261.25 },
    { segment: "Gold", totalCustomers: 220, grossAdds: 18, churn30d: 4, acqRevenue: 4500, recRevenue: 21000, arpu: 115.91 },
    { segment: "Silver", totalCustomers: 650, grossAdds: 55, churn30d: 22, acqRevenue: 6800, recRevenue: 24500, arpu: 48.15 },
    { segment: "Autres Clients", totalCustomers: 1800, grossAdds: 210, churn30d: 95, acqRevenue: 11200, recRevenue: 7100, arpu: 10.17 },
];

const TOTALS = {
    segment: "TOTAL CLIENTS",
    totalCustomers: 2750,
    grossAdds: 289,
    churn30d: 122,
    acqRevenue: 24900,
    recRevenue: 71100,
    arpu: 34.91,
};

function formatNumber(val: number): string {
    return val.toLocaleString("fr-FR");
}

function formatArpu(val: number): string {
    return `${val.toFixed(2).replace(".", ",")} $`;
}

export default function CustomerMatrixTable({
    data = DEFAULT_CUSTOMER_DATA,
}: {
    data?: CustomerSegmentRow[];
}) {
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
                                val === "Silver" && "text-slate-500",
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
                cell: (info) => formatNumber(info.getValue() as number),
            },
            {
                accessorKey: "recRevenue",
                header: () => "Revenu Récurrent ($)",
                cell: (info) => formatNumber(info.getValue() as number),
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
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>

                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                {TOTALS.segment}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatNumber(TOTALS.totalCustomers)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                +{formatNumber(TOTALS.grossAdds)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                {formatNumber(TOTALS.churn30d)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatNumber(TOTALS.acqRevenue)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatNumber(TOTALS.recRevenue)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30">
                                {formatArpu(TOTALS.arpu)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}