// app/ceo-report/operations/_components/purchase-dispatch-matrix-table.tsx
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

export interface PurchaseDispatchRow {
    category: string;
    poAmount: number;
    receivedPbc: number;
    stores: {
        p24: number;
        pMto: number;
        pLmb: number;
        pKtm: number;
        pOnl: number;
    };
    totalTransferred: number;
    reliquatPbc: number;
}

export const DEFAULT_PURCHASE_DISPATCH: PurchaseDispatchRow[] = [
    {
        category: "Achats Femme",
        poAmount: 22000,
        receivedPbc: 22000,
        stores: { p24: 5500, pMto: 4200, pLmb: 3100, pKtm: 2800, pOnl: 4400 },
        totalTransferred: 20000,
        reliquatPbc: 2000,
    },
    {
        category: "Achats Kids",
        poAmount: 8000,
        receivedPbc: 8000,
        stores: { p24: 2100, pMto: 1500, pLmb: 1200, pKtm: 1000, pOnl: 1700 },
        totalTransferred: 7500,
        reliquatPbc: 500,
    },
    {
        category: "Achats Beauty",
        poAmount: 12000,
        receivedPbc: 10500,
        stores: { p24: 2800, pMto: 2200, pLmb: 1800, pKtm: 1500, pOnl: 1700 },
        totalTransferred: 10000,
        reliquatPbc: 500,
    },
];

const TOTALS = {
    category: "TOTAL ACHATS PO",
    poAmount: 42000,
    receivedPbc: 40500,
    stores: { p24: 10400, pMto: 7900, pLmb: 6100, pKtm: 5300, pOnl: 7800 },
    totalTransferred: 37500,
    reliquatPbc: 3000,
};

function formatUsd(val: number): string {
    return `${val.toLocaleString("fr-FR")}`;
}

export default function PurchaseDispatchMatrixTable({
    data = DEFAULT_PURCHASE_DISPATCH,
}: {
    data?: PurchaseDispatchRow[];
}) {
    const columns = useMemo<ColumnDef<PurchaseDispatchRow>[]>(
        () => [
            {
                accessorKey: "category",
                header: () => <span className="text-left">Catégorie</span>,
                cell: (info) => (
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "poAmount",
                header: () => "Commande PO ($)",
                cell: (info) => formatUsd(info.getValue() as number),
            },
            {
                accessorKey: "receivedPbc",
                header: () => "Reçu P.BC ($)",
                cell: (info) => formatUsd(info.getValue() as number),
            },
            // Sous-colonnes Boutiques
            {
                accessorKey: "stores.p24",
                header: () => "P24 ($)",
                cell: (info) => formatUsd(info.row.original.stores.p24),
            },
            {
                accessorKey: "stores.pMto",
                header: () => "P.MTO ($)",
                cell: (info) => formatUsd(info.row.original.stores.pMto),
            },
            {
                accessorKey: "stores.pLmb",
                header: () => "P.LMB ($)",
                cell: (info) => formatUsd(info.row.original.stores.pLmb),
            },
            {
                accessorKey: "stores.pKtm",
                header: () => "P.KTM ($)",
                cell: (info) => formatUsd(info.row.original.stores.pKtm),
            },
            {
                accessorKey: "stores.pOnl",
                header: () => "P.ONL ($)",
                cell: (info) => formatUsd(info.row.original.stores.pOnl),
            },
            {
                accessorKey: "totalTransferred",
                header: () => "Total Transféré ($)",
                cell: (info) => (
                    <span className="font-bold text-slate-900 dark:text-white">
                        {formatUsd(info.getValue() as number)}
                    </span>
                ),
            },
            {
                accessorKey: "reliquatPbc",
                header: () => "Reliquat au P.BC ($)",
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
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        {/* Ligne 1 d'en-tête avec groupe multi-colonnes */}
                        <TableRow className="border-b border-slate-800 hover:bg-transparent">
                            <TableHead rowSpan={2} className="py-2 px-3 text-[10px] font-bold text-white uppercase tracking-wider sticky left-0 z-20 bg-[#101c30] min-w-[120px]">
                                Catégorie
                            </TableHead>
                            <TableHead rowSpan={2} className="py-2 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider min-w-[110px]">
                                Commande PO ($)
                            </TableHead>
                            <TableHead rowSpan={2} className="py-2 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider min-w-[100px]">
                                Reçu P.BC ($)
                            </TableHead>
                            <TableHead colSpan={5} className="py-1 px-3 text-center text-[10px] font-bold text-white uppercase tracking-wider bg-[#0c1626] border-x border-slate-700">
                                Ventilation des Transferts Envoyés aux Boutiques ($)
                            </TableHead>
                            <TableHead rowSpan={2} className="py-2 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider min-w-[110px]">
                                Total Transféré ($)
                            </TableHead>
                            <TableHead rowSpan={2} className="py-2 px-3 text-right text-[10px] font-bold text-white uppercase tracking-wider min-w-[110px]">
                                Reliquat au P.BC ($)
                            </TableHead>
                        </TableRow>

                        {/* Ligne 2 : Sous-colonnes boutiques */}
                        <TableRow className="border-none hover:bg-transparent bg-[#0c1626]">
                            {["P24 ($)", "P.MTO ($)", "P.LMB ($)", "P.KTM ($)", "P.ONL ($)"].map((s) => (
                                <TableHead key={s} className="py-1.5 px-2.5 text-right text-[10px] font-bold text-slate-300">
                                    {s}
                                </TableHead>
                            ))}
                        </TableRow>
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
                                            "py-1.5 px-2.5 font-mono tabular-nums",
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
                                {TOTALS.category}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(TOTALS.poAmount)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(TOTALS.receivedPbc)}
                            </TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatUsd(TOTALS.stores.p24)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatUsd(TOTALS.stores.pMto)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatUsd(TOTALS.stores.pLmb)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatUsd(TOTALS.stores.pKtm)}</TableCell>
                            <TableCell className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">{formatUsd(TOTALS.stores.pOnl)}</TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-950/30">
                                {formatUsd(TOTALS.totalTransferred)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                {formatUsd(TOTALS.reliquatPbc)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}