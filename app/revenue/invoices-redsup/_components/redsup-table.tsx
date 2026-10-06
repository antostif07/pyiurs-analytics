// app/revenue/invoices-redsup/_components/redsup-table.tsx
"use client";

import { useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
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
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    Clock,
    Eye,
    Image as ImageIcon,
    List,
    Trash2,
    Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import type { RedsupInvoiceRow } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

interface RedsupTableProps {
    data: RedsupInvoiceRow[];
    onValidate: (invoice: RedsupInvoiceRow) => void;
    onUnvalidate: (invoice: RedsupInvoiceRow) => void;
    onViewDetails: (invoice: RedsupInvoiceRow) => void;
    onViewPhoto: (url: string) => void;
}

export default function RedsupTable({
    data,
    onValidate,
    onUnvalidate,
    onViewDetails,
    onViewPhoto,
}: RedsupTableProps) {
    const totals = useMemo(() => {
        const totalAmount = data.reduce((s, i) => s + i.totalRedsupAmount, 0);
        const totalQty = data.reduce((s, i) => s + i.totalRedsupQty, 0);
        const validatedCount = data.filter((i) => i.isValidated).length;
        return { totalAmount, totalQty, validatedCount };
    }, [data]);

    const columns = useMemo<ColumnDef<RedsupInvoiceRow>[]>(
        () => [
            {
                accessorKey: "date",
                header: () => "Date",
                cell: (info) => (
                    <span className="tabular-nums">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "orderName",
                header: () => "N° Commande",
                cell: (info) => (
                    <span className="font-mono font-semibold text-foreground">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "partnerName",
                header: () => "Client",
                cell: (info) => (
                    <span className="truncate">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "posName",
                header: () => "POS",
                cell: (info) => (
                    <span className="text-muted-foreground">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "lineCount",
                header: () => "Articles",
                cell: (info) => {
                    const row = info.row.original;
                    return (
                        <button
                            type="button"
                            onClick={() => onViewDetails(row)}
                            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 text-[11px] font-semibold"
                        >
                            <List className="w-3 h-3" />
                            {row.lineCount} ligne{row.lineCount > 1 ? "s" : ""}
                        </button>
                    );
                },
            },
            {
                accessorKey: "totalRedsupQty",
                header: () => "Qté",
                cell: (info) => (
                    <span className="font-mono tabular-nums">
                        {info.getValue() as number}
                    </span>
                ),
            },
            {
                accessorKey: "totalRedsupAmount",
                header: () => "Montant RedSup",
                cell: (info) => (
                    <span className="font-mono tabular-nums font-semibold">
                        {fmt(info.getValue() as number)} $
                    </span>
                ),
            },
            {
                id: "status",
                header: () => "Validation",
                cell: (info) => {
                    const row = info.row.original;
                    return row.isValidated ? (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                        >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Validée
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60"
                        >
                            <Clock className="w-3 h-3 mr-1" />
                            En attente
                        </Badge>
                    );
                },
            },
            {
                id: "photo",
                header: () => "Photo",
                cell: (info) => {
                    const row = info.row.original;
                    if (!row.isValidated || !row.validationPhotoUrl) {
                        return (
                            <span className="text-muted-foreground/40">—</span>
                        );
                    }
                    return (
                        <button
                            type="button"
                            onClick={() =>
                                onViewPhoto(row.validationPhotoUrl!)
                            }
                            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 dark:text-sky-400 text-[10px] font-semibold"
                        >
                            <ImageIcon className="w-3 h-3" />
                            Voir
                        </button>
                    );
                },
            },
            {
                id: "actions",
                header: () => "Action",
                cell: (info) => {
                    const row = info.row.original;
                    return row.isValidated ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUnvalidate(row)}
                            className="h-6 px-2 text-[10px] gap-1 text-rose-600 hover:text-rose-700 border-rose-200/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                            <Trash2 className="w-3 h-3" />
                            Retirer
                        </Button>
                    ) : (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onValidate(row)}
                            className="h-6 px-2 text-[10px] gap-1 bg-pink-600 hover:bg-pink-700 text-white"
                        >
                            <Upload className="w-3 h-3" />
                            Valider
                        </Button>
                    );
                },
            },
        ],
        [onValidate, onUnvalidate, onViewDetails, onViewPhoto],
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: { pageSize: 25 },
        },
    });

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <Eye className="w-6 h-6 mx-auto text-muted-foreground/40" />
                <p className="text-[12px] font-semibold text-foreground mt-2">
                    Aucune facture RedSup
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Aucune facture ne contient de produit RedSup sur la période.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    <TableHeader className={HEADER_BG}>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow
                                key={hg.id}
                                className={cn("border-none", HEADER_BG)}
                            >
                                {hg.headers.map((header, idx) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto",
                                            idx === 0 && "text-left min-w-[90px]",
                                            idx === 1 &&
                                            "text-left min-w-[150px]",
                                            idx === 2 &&
                                            "text-left min-w-[150px]",
                                            idx === 3 &&
                                            "text-center min-w-[100px]",
                                            idx === 4 &&
                                            "text-center min-w-[100px]",
                                            idx === 5 &&
                                            "text-center min-w-[80px]",
                                            idx === 6 &&
                                            "text-right min-w-[130px]",
                                            idx === 7 &&
                                            "text-center min-w-[100px]",
                                            idx === 8 &&
                                            "text-center min-w-[80px]",
                                            idx === hg.headers.length - 1 &&
                                            "text-right min-w-[130px]",
                                            HEADER_BG,
                                        )}
                                    >
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody className="divide-y divide-border/40">
                        {table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className="hover:bg-accent/30 transition-colors border-b border-border/40"
                            >
                                {row.getVisibleCells().map((cell, idx) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            "py-1.5 px-3",
                                            idx === 0 &&
                                            "text-left text-muted-foreground",
                                            idx === 1 && "text-left",
                                            idx === 2 && "text-left",
                                            idx >= 3 &&
                                            idx <= 5 &&
                                            "text-center text-muted-foreground",
                                            idx === 6 &&
                                            "text-right font-mono tabular-nums",
                                            idx === 7 && "text-center",
                                            idx === 8 && "text-center",
                                            idx ===
                                            row.getVisibleCells().length -
                                            1 && "text-right",
                                        )}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext(),
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>

                    <TableFooter className="bg-muted/50 border-t border-border/80">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell
                                colSpan={5}
                                className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider"
                            >
                                Total ({data.length} facture
                                {data.length > 1 ? "s" : ""})
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                {totals.totalQty}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-pink-700 dark:text-pink-300">
                                {fmt(totals.totalAmount)} $
                            </TableCell>
                            <TableCell
                                colSpan={3}
                                className="py-2 px-3 text-[10px]"
                            >
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {totals.validatedCount} validée
                                    {totals.validatedCount > 1 ? "s" : ""}
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            <DataTablePagination
                table={table}
                totalRows={data.length}
                rowLabel="facture"
            />
        </div>
    );
}