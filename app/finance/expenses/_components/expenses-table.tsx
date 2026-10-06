// app/finance/expenses/_components/expenses-table.tsx
"use client";

import { useMemo } from "react";
import {
    useReactTable, getCoreRowModel, flexRender, type ColumnDef,
} from "@tanstack/react-table";
import {
    Table, TableBody, TableCell, TableFooter, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExpenseRow } from "../_lib/types";

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ExpensesTableProps {
    data: ExpenseRow[];
    onValidate: (expense: ExpenseRow) => void;
    onUnvalidate: (expense: ExpenseRow) => void;
    onViewPhoto: (url: string) => void;
}

const HEADER_BG = "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function ExpensesTable({
    data,
    onValidate,
    onUnvalidate,
    onViewPhoto,
}: ExpensesTableProps) {
    const totals = useMemo(() => {
        const totalAmount = data.reduce((s, e) => s + e.totalAmount, 0);
        const validatedAmount = data
            .filter((e) => e.isValidated)
            .reduce((s, e) => s + e.totalAmount, 0);
        const validatedCount = data.filter((e) => e.isValidated).length;
        return { totalAmount, validatedAmount, validatedCount };
    }, [data]);

    const columns = useMemo<ColumnDef<ExpenseRow>[]>(
        () => [
            {
                accessorKey: "date",
                header: () => "Date",
                cell: (info) => (
                    <span className="text-center tabular-nums">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "employeeName",
                header: () => "Employé",
                cell: (info) => (
                    <span className="text-left truncate">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "name",
                header: () => "Description",
                cell: (info) => (
                    <span className="text-left truncate" title={info.getValue() as string}>
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "categoryName",
                header: () => "Catégorie",
                cell: (info) => (
                    <span className="text-center text-muted-foreground">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "totalAmount",
                header: () => "Montant",
                cell: (info) => {
                    const row = info.row.original;
                    return (
                        <span className="font-semibold tabular-nums">
                            {fmt(row.totalAmount)} {row.currency}
                        </span>
                    );
                },
            },
            {
                id: "status",
                header: () => "Statut",
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
                        return <span className="text-muted-foreground/40">—</span>;
                    }
                    return (
                        <button
                            type="button"
                            onClick={() => onViewPhoto(row.validationPhotoUrl!)}
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
                            className="h-6 px-2 text-[10px] gap-1 bg-sky-600 hover:bg-sky-700 text-white"
                        >
                            <Upload className="w-3 h-3" />
                            Valider
                        </Button>
                    );
                },
            },
        ],
        [onValidate, onUnvalidate, onViewPhoto],
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucune dépense sur la période sélectionnée.
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
                            <TableRow key={hg.id} className={cn("border-none", HEADER_BG)}>
                                {hg.headers.map((header, idx) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto",
                                            idx <= 2 ? "text-left" : "text-center",
                                            "min-w-[90px]",
                                            HEADER_BG,
                                        )}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
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
                                            idx === 4 && "font-mono tabular-nums",
                                            idx <= 2 ? "text-left" : "text-center",
                                        )}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>

                    <TableFooter className="bg-muted/50 border-t border-border/80">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell colSpan={4} className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider">
                                Total ({data.length} dépenses)
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold">
                                {fmt(totals.totalAmount)} $
                            </TableCell>
                            <TableCell colSpan={3} className="py-2 px-3 text-[10px]">
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {totals.validatedCount} validées ({fmt(totals.validatedAmount)} $)
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}