// app/ceo-report/operations/_components/transfer-control-table.tsx
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
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TransferControlRow {
    refTransfert: string;
    date: string;
    origin: string;
    destination: string;
    itemCount: number;
    value: number;
    docCompliance: "conforme" | "manque_signature";
    barcodeCompliance: "scanne" | "manquant";
}

export const DEFAULT_TRANSFERS: TransferControlRow[] = [
    { refTransfert: "TR-2026-0801", date: "04/09/2026", origin: "P.BC", destination: "P24", itemCount: 145, value: 4500, docCompliance: "conforme", barcodeCompliance: "scanne" },
    { refTransfert: "TR-2026-0802", date: "06/09/2026", origin: "P.BC", destination: "P.MTO", itemCount: 98, value: 3200, docCompliance: "conforme", barcodeCompliance: "scanne" },
    { refTransfert: "TR-2026-0803", date: "10/09/2026", origin: "P.BC", destination: "P.LMB", itemCount: 75, value: 2400, docCompliance: "manque_signature", barcodeCompliance: "manquant" },
    { refTransfert: "TR-2026-0804", date: "12/09/2026", origin: "P.BC", destination: "P.KTM", itemCount: 60, value: 1900, docCompliance: "conforme", barcodeCompliance: "scanne" },
    { refTransfert: "TR-2026-0805", date: "15/09/2026", origin: "P.BC", destination: "P.ONL", itemCount: 110, value: 3800, docCompliance: "conforme", barcodeCompliance: "scanne" },
];

export default function TransferControlTable({
    data = DEFAULT_TRANSFERS,
    onPreview,
}: {
    data?: TransferControlRow[];
    onPreview?: (ref: string) => void;
}) {
    const columns = useMemo<ColumnDef<TransferControlRow>[]>(
        () => [
            {
                accessorKey: "refTransfert",
                header: () => <span className="text-left">Réf. Transfert (Odoo TR)</span>,
                cell: (info) => (
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "date",
                header: () => "Date",
                cell: (info) => <span className="text-center">{info.getValue() as string}</span>,
            },
            {
                accessorKey: "origin",
                header: () => "Origine",
                cell: (info) => <span className="text-center">{info.getValue() as string}</span>,
            },
            {
                accessorKey: "destination",
                header: () => "Destination",
                cell: (info) => <span className="text-center font-semibold">{info.getValue() as string}</span>,
            },
            {
                accessorKey: "itemCount",
                header: () => "Nb Articles",
                cell: (info) => `${info.getValue()} pcs`,
            },
            {
                accessorKey: "value",
                header: () => "Valeur ($)",
                cell: (info) => `${(info.getValue() as number).toLocaleString("fr-FR")} $`,
            },
            {
                accessorKey: "docCompliance",
                header: () => "Conformité Document",
                cell: (info) => {
                    const isOk = info.getValue() === "conforme";
                    return (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
                                isOk
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60"
                                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60"
                            )}
                        >
                            <span className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-emerald-500" : "bg-rose-500")} />
                            {isOk ? "Conforme" : "Manque Signature"}
                        </span>
                    );
                },
            },
            {
                accessorKey: "barcodeCompliance",
                header: () => "Validation Codes-Barres",
                cell: (info) => {
                    const isOk = info.getValue() === "scanne";
                    return (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
                                isOk
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60"
                                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60"
                            )}
                        >
                            <span className={cn("w-1.5 h-1.5 rounded-full", isOk ? "bg-emerald-500" : "bg-rose-500")} />
                            {isOk ? "Scanné & Renseigné" : "Non Renseigné / Manquant"}
                        </span>
                    );
                },
            },
            {
                id: "actions",
                header: () => "Action",
                cell: (info) => (
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => onPreview?.(info.row.original.refTransfert)}
                        className="h-6 px-2 text-[10px] gap-1 bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-xs rounded-md"
                    >
                        <Eye className="w-3 h-3" />
                        <span>Prévisualiser</span>
                    </Button>
                ),
            },
        ],
        [onPreview]
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
                                            idx === 0 ? "text-left sticky left-0 z-20 bg-[#101c30] min-w-[130px]" : "text-center min-w-[110px]"
                                        )}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                                                : "text-center text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>

                    {/* Ligne TOTAL CUMUL MOIS */}
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="py-2 px-3 text-left font-black uppercase tracking-wider text-slate-900 dark:text-white sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700">
                                TOTAL CUMUL MOIS
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono text-slate-400">--</TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">P.BC</TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">Tous Sites</TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono font-black text-slate-900 dark:text-white">488 pcs</TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30">
                                15 800 $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                                4 Conformes / 1 Anomalie
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                                4 Valides (🟢) / 1 Manquant (🔴)
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center text-slate-400">--</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}