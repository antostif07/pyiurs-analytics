// app/finance/loyalty/_components/loyalty-table.tsx
"use client";

import { useMemo, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
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
    AlertCircle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    Loader2,
    Phone,
    Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import type { LoyaltyOrderRow } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

interface LoyaltyTableProps {
    data: LoyaltyOrderRow[];
    onSendOne: (order: LoyaltyOrderRow) => void;
    isSendingOne: boolean;
    sendingOrderId: number | null;
}

export default function LoyaltyTable({
    data,
    onSendOne,
    isSendingOne,
    sendingOrderId,
}: LoyaltyTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const totals = useMemo(() => {
        const totalAmount = data.reduce((s, o) => s + o.amount, 0);
        const totalPoints = data.reduce((s, o) => s + o.pointsEarned, 0);
        const sent = data.filter((o) => o.isSent).length;
        return { totalAmount, totalPoints, sent };
    }, [data]);

    const columns = useMemo<ColumnDef<LoyaltyOrderRow>[]>(
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
                    <span className="truncate" title={String(info.getValue() ?? "")}>
                        {(info.getValue() as string | null) ?? "—"}
                    </span>
                ),
            },
            {
                id: "phone",
                header: () => "Téléphone",
                cell: (info) => {
                    const row = info.row.original;
                    if (!row.rawPhone) {
                        return (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 italic">
                                <AlertCircle className="w-3 h-3" />
                                Absent
                            </span>
                        );
                    }
                    if (!row.isPhoneValid) {
                        return (
                            <span
                                className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium"
                                title={`Format invalide : ${row.rawPhone}`}
                            >
                                <AlertCircle className="w-3 h-3" />
                                Invalide
                            </span>
                        );
                    }
                    return (
                        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-muted-foreground tabular-nums">
                            <Phone className="w-2.5 h-2.5" />
                            {row.normalizedPhone}
                        </span>
                    );
                },
            },
            {
                accessorKey: "posName",
                header: () => "POS",
                cell: (info) => (
                    <span className="text-muted-foreground truncate">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "amount",
                header: () => "Montant",
                cell: (info) => (
                    <span className="font-mono tabular-nums font-semibold">
                        {fmt(info.getValue() as number)} $
                    </span>
                ),
            },
            {
                accessorKey: "pointsEarned",
                header: () => "Points",
                cell: (info) => {
                    const v = info.getValue() as number;
                    if (v === 0) {
                        return (
                            <span className="text-muted-foreground/40">—</span>
                        );
                    }
                    return (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200/60 dark:border-sky-800/60 tabular-nums"
                        >
                            +{v}
                        </Badge>
                    );
                },
            },
            {
                id: "status",
                header: () => "Statut",
                cell: (info) => {
                    const row = info.row.original;
                    if (row.isSent) {
                        return (
                            <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                            >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Envoyé
                            </Badge>
                        );
                    }
                    if (!row.isPhoneValid) {
                        return (
                            <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60"
                            >
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Tél. invalide
                            </Badge>
                        );
                    }
                    if (row.pointsEarned === 0) {
                        return (
                            <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/40 border-border/60"
                            >
                                Aucun point
                            </Badge>
                        );
                    }
                    return (
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
                id: "actions",
                header: () => "Action",
                cell: (info) => {
                    const row = info.row.original;
                    const isRowLoading =
                        isSendingOne && sendingOrderId === row.odooOrderId;

                    if (row.isSent) {
                        return (
                            <span className="text-[10px] text-muted-foreground/50 italic">
                                {row.sentBy ? `par ${row.sentBy}` : "—"}
                            </span>
                        );
                    }

                    const disabled =
                        !row.isPhoneValid ||
                        row.pointsEarned === 0 ||
                        isSendingOne;

                    return (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => onSendOne(row)}
                            disabled={disabled}
                            className={cn(
                                "h-6 px-2 text-[10px] gap-1 bg-sky-600 hover:bg-sky-700 text-white",
                                disabled &&
                                "opacity-40 cursor-not-allowed",
                            )}
                        >
                            {isRowLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Send className="w-3 h-3" />
                            )}
                            Envoyer
                        </Button>
                    );
                },
            },
        ],
        [onSendOne, isSendingOne, sendingOrderId],
    );

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        initialState: {
            pagination: { pageSize: 25 },
        },
    });

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <Clock className="w-6 h-6 mx-auto text-muted-foreground/40" />
                <p className="text-[12px] font-semibold text-foreground mt-2">
                    Aucune facture
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Aucune facture POS payée sur cette date.
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
                                {hg.headers.map((header) => {
                                    const sortDir = header.column.getIsSorted();
                                    const canSort =
                                        header.column.getCanSort();
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto",
                                                HEADER_BG,
                                                header.column.id === "date" &&
                                                "text-left min-w-[100px]",
                                                header.column.id === "orderName" &&
                                                "text-left min-w-[150px]",
                                                header.column.id === "partnerName" &&
                                                "text-left min-w-[150px]",
                                                header.column.id === "phone" &&
                                                "text-left min-w-[150px]",
                                                header.column.id === "posName" &&
                                                "text-left min-w-[120px]",
                                                header.column.id === "amount" &&
                                                "text-right min-w-[110px]",
                                                header.column.id === "pointsEarned" &&
                                                "text-center min-w-[80px]",
                                                header.column.id === "status" &&
                                                "text-center min-w-[120px]",
                                                header.column.id === "actions" &&
                                                "text-right min-w-[100px]",
                                            )}
                                        >
                                            {canSort ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className="inline-flex items-center gap-1 hover:text-white/80 transition-colors"
                                                >
                                                    {flexRender(
                                                        header.column.columnDef
                                                            .header,
                                                        header.getContext(),
                                                    )}
                                                    {sortDir === "asc" ? (
                                                        <ArrowUp className="w-2.5 h-2.5" />
                                                    ) : sortDir === "desc" ? (
                                                        <ArrowDown className="w-2.5 h-2.5" />
                                                    ) : (
                                                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(
                                                    header.column.columnDef
                                                        .header,
                                                    header.getContext(),
                                                )
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody className="divide-y divide-border/40">
                        {table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className="hover:bg-accent/30 transition-colors border-b border-border/40"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            "py-1.5 px-3",
                                            cell.column.id === "date" &&
                                            "text-left text-muted-foreground",
                                            cell.column.id === "orderName" &&
                                            "text-left",
                                            cell.column.id === "partnerName" &&
                                            "text-left",
                                            cell.column.id === "phone" &&
                                            "text-left",
                                            cell.column.id === "posName" &&
                                            "text-left",
                                            cell.column.id === "amount" &&
                                            "text-right font-mono tabular-nums",
                                            cell.column.id === "pointsEarned" &&
                                            "text-center",
                                            cell.column.id === "status" &&
                                            "text-center",
                                            cell.column.id === "actions" &&
                                            "text-right",
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
                            <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                {fmt(totals.totalAmount)} $
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono tabular-nums font-bold text-sky-700 dark:text-sky-300">
                                +{totals.totalPoints}
                            </TableCell>
                            <TableCell
                                colSpan={2}
                                className="py-2 px-3 text-[10px]"
                            >
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {totals.sent} envoyé
                                    {totals.sent > 1 ? "s" : ""}
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