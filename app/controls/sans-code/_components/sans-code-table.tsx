"use client";

import { useMemo, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
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
import { Badge } from "@/components/ui/badge";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    FileText,
    RotateCcw,
    Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import type { SansCodeOrderRow } from "../_lib/types";

const fmt = (n: number) =>
    n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const HEADER_BG =
    "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

export default function SansCodeTable({ data }: { data: SansCodeOrderRow[] }) {
    const [search, setSearch] = useState("");
    const [hideRefunded, setHideRefunded] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return data.filter((d) => {
            if (hideRefunded && d.isRefunded) return false;
            if (!q) return true;
            return (
                d.posConfig.toLowerCase().includes(q) ||
                d.invoiceRef.toLowerCase().includes(q) ||
                d.clientName.toLowerCase().includes(q) ||
                d.note.toLowerCase().includes(q) ||
                d.date.includes(q)
            );
        });
    }, [data, search, hideRefunded]);

    const totals = useMemo(() => {
        const validItems = filtered.filter((i) => !i.isRefunded);
        const totalAmount = validItems.reduce((s, i) => s + i.amountSansCode, 0);
        const totalQty = validItems.reduce((s, i) => s + i.qtySansCode, 0);
        const refundedCount = filtered.filter((i) => i.isRefunded).length;
        return { totalAmount, totalQty, refundedCount };
    }, [filtered]);

    const columns = useMemo<ColumnDef<SansCodeOrderRow>[]>(
        () => [
            {
                accessorKey: "posConfig",
                header: "POS",
                cell: (info) => (
                    <span className="font-bold uppercase text-foreground">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "date",
                header: "Date",
                cell: (info) => (
                    <span className="tabular-nums text-muted-foreground whitespace-nowrap">
                        {info.getValue() as string}
                    </span>
                ),
            },
            {
                id: "ticketClient",
                accessorFn: (row) => `${row.invoiceRef} ${row.clientName}`,
                header: "Commande — Client",
                cell: (info) => {
                    const row = info.row.original;
                    return (
                        <div className="flex flex-wrap items-center gap-1.5">
                            <FileText className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                            <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                                {row.invoiceRef}
                            </span>
                            <span className="text-muted-foreground">— {row.clientName}</span>
                            {row.note && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80">
                                    {row.note}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "qtySansCode",
                header: "Qté Sans Code",
                cell: (info) => (
                    <span className="font-mono tabular-nums font-semibold">
                        {info.getValue() as number}
                    </span>
                ),
            },
            {
                accessorKey: "amountSansCode",
                header: "Montant Net",
                cell: (info) => {
                    const row = info.row.original;
                    return (
                        <span
                            className={cn(
                                "font-mono tabular-nums font-semibold whitespace-nowrap",
                                row.isRefunded && "line-through text-muted-foreground",
                            )}
                        >
                            {fmt(info.getValue() as number)} $
                        </span>
                    );
                },
            },
            {
                id: "status",
                accessorFn: (row) => (row.isRefunded ? 1 : 0),
                header: "Statut Retour",
                cell: (info) => {
                    const row = info.row.original;
                    return row.isRefunded ? (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] gap-1 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/60"
                        >
                            <RotateCcw className="w-2.5 h-2.5" />
                            Remboursée
                        </Badge>
                    ) : (
                        <Badge
                            variant="outline"
                            className="h-5 px-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/60"
                        >
                            Validée POS
                        </Badge>
                    );
                },
            },
        ],
        [],
    );

    const table = useReactTable({
        data: filtered,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 50 } },
    });

    if (data.length === 0) {
        return (
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs p-8 text-center">
                <p className="text-[11px] text-muted-foreground/60 italic">
                    Aucune vente sans code sur la période sélectionnée.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2.5">
            {/* Barre outils */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            table.setPageIndex(0);
                        }}
                        placeholder="Rechercher POS, ticket, client, note..."
                        className="w-full h-7 pl-8 pr-3 rounded-lg border border-border bg-card text-[11px] placeholder:text-muted-foreground/65 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setHideRefunded((v) => !v);
                        table.setPageIndex(0);
                    }}
                    className={cn(
                        "h-7 px-3 rounded-lg border text-[11px] font-medium transition-colors",
                        hideRefunded
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:text-foreground",
                    )}
                >
                    {hideRefunded ? "Remboursées masquées" : "Masquer remboursées"}
                </button>
            </div>

            {/* Tableau plat unifié */}
            <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="w-full text-[11px]">
                        <TableHeader className={HEADER_BG}>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id} className={cn("border-none", HEADER_BG)}>
                                    {hg.headers.map((header, idx) => {
                                        const canSort = header.column.getCanSort();
                                        const sorted = header.column.getIsSorted();
                                        return (
                                            <TableHead
                                                key={header.id}
                                                onClick={
                                                    canSort
                                                        ? header.column.getToggleSortingHandler()
                                                        : undefined
                                                }
                                                className={cn(
                                                    "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto select-none min-w-[90px]",
                                                    idx === 3 || idx === 4 ? "text-right" : idx === 5 ? "text-center" : "text-left",
                                                    canSort && "cursor-pointer hover:text-sky-300",
                                                    HEADER_BG,
                                                )}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext(),
                                                    )}
                                                    {canSort &&
                                                        (sorted === "asc" ? (
                                                            <ArrowUp className="w-2.5 h-2.5" />
                                                        ) : sorted === "desc" ? (
                                                            <ArrowDown className="w-2.5 h-2.5" />
                                                        ) : (
                                                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                                                        ))}
                                                </span>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody className="divide-y divide-border/40">
                            {table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="py-8 text-center text-[11px] text-muted-foreground/70 italic"
                                    >
                                        Aucun ticket ne correspond à votre filtre.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="hover:bg-accent/30 transition-colors border-b border-border/40"
                                    >
                                        {row.getVisibleCells().map((cell, idx) => (
                                            <TableCell
                                                key={cell.id}
                                                className={cn(
                                                    "py-1.5 px-3",
                                                    idx === 3 || idx === 4 ? "text-right" : idx === 5 ? "text-center" : "text-left",
                                                )}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>

                        <TableFooter className="bg-muted/50 border-t border-border/80">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableCell
                                    colSpan={3}
                                    className="py-2 px-3 text-right text-[10px] font-bold uppercase tracking-wider"
                                >
                                    Total ({filtered.length} ticket{filtered.length > 1 ? "s" : ""})
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                    {totals.totalQty}
                                </TableCell>
                                <TableCell className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                                    {fmt(totals.totalAmount)} $
                                </TableCell>
                                <TableCell className="py-2 px-3 text-center text-[10px]">
                                    {totals.refundedCount > 0 && (
                                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                            {totals.refundedCount} remb.
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                <DataTablePagination
                    table={table}
                    totalRows={filtered.length}
                    rowLabel="ticket"
                />
            </div>
        </div>
    );
}