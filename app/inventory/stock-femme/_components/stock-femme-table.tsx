// app/inventory/stock-femme/_components/stock-femme-table.tsx
"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
    type Column,
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    X,
} from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BarcodeDetail, ControlStockFemmeModel } from "../_lib/types";
import { buildControlStockFemmeColumns } from "./stock-femme-columns";

const EXPANDER_WIDTH = 32;

const STATIC_NUMERIC_KEYS = new Set([
    "product_qty",
    "qty_received",
    "not_received",
    "qty_sold",
    "qty_available",
]);

const STATIC_LABELS: Record<string, string> = {
    product_qty: "Achats",
    qty_received: "Reçu",
    not_received: "Rlq",
    qty_sold: "Vendu",
    qty_available: "Dispo",
    stock_age: "Âge",
    perf: "Perf",
    name: "Référence",
    po_name: "PO",
};

interface StockFemmeTableProps {
    tableData: ControlStockFemmeModel[];
    shops: string[];
}

function columnKey(col: Column<ControlStockFemmeModel, unknown>): string {
    const cdef = col.columnDef as { accessorKey?: string };
    return cdef.accessorKey ?? col.id;
}

function columnValueForFooter(
    col: Column<ControlStockFemmeModel, unknown>,
    totals: {
        static: Record<string, number>;
        shop: Record<string, number>;
    },
): number | undefined {
    const key = columnKey(col);
    if (STATIC_NUMERIC_KEYS.has(key)) return totals.static[key];
    if (col.id.startsWith("shop_")) {
        const shopName = col.id.substring("shop_".length);
        return totals.shop[shopName];
    }
    return undefined;
}

function renderSubCell(
    detail: BarcodeDetail,
    col: Column<ControlStockFemmeModel, unknown>,
): ReactNode {
    const key = columnKey(col);
    const dash = "–";

    if (col.id.startsWith("shop_")) {
        const shopName = col.id.substring("shop_".length);
        const v = detail.stockByShop[shopName] ?? 0;
        return v || dash;
    }

    switch (key) {
        case "expander":
            return null;
        case "name":
            return (
                <span className="font-mono text-[10px] text-muted-foreground">
                    {detail.barcode}
                </span>
            );
        case "product_qty":
            return detail.product_qty || dash;
        case "qty_received":
            return detail.qty_received || dash;
        case "not_received":
            return detail.not_received || dash;
        case "qty_sold":
            return detail.qty_sold || dash;
        case "qty_available":
            return detail.qty_available || dash;
        case "stock_age":
            return detail.age || dash;
        case "perf":
            return detail.perf ? `${detail.perf.toFixed(2)}%` : dash;
        default:
            return null;
    }
}

export default function StockFemmeTable({
    tableData,
    shops,
}: StockFemmeTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const cols = useMemo(
        () => buildControlStockFemmeColumns(shops),
        [shops],
    );

    const expanderColumn: ColumnDef<ControlStockFemmeModel, unknown> = {
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    row.toggleExpanded();
                }}
                className="p-0.5 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={row.getIsExpanded() ? "Réduire" : "Développer"}
            >
                {row.getIsExpanded() ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                )}
            </button>
        ),
        size: EXPANDER_WIDTH,
        enableSorting: false,
        enableColumnFilter: false,
    };

    const allCols = useMemo(
        () => [expanderColumn, ...cols],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cols],
    );

    const table = useReactTable({
        data: tableData,
        columns: allCols,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        state: { sorting, columnFilters },
        initialState: {
            pagination: { pageSize: 25 },
            columnVisibility: { po_name: false },
        },
    });

    const totals = useMemo(() => {
        const staticTotals: Record<string, number> = {
            product_qty: 0,
            qty_received: 0,
            not_received: 0,
            qty_sold: 0,
            qty_available: 0,
        };
        const shopTotals: Record<string, number> = {};
        for (const s of shops) shopTotals[s] = 0;

        for (const row of tableData) {
            staticTotals.product_qty += row.product_qty;
            staticTotals.qty_received += row.qty_received;
            staticTotals.not_received += row.not_received;
            staticTotals.qty_sold += row.qty_sold;
            staticTotals.qty_available += row.qty_available;
            for (const s of shops) {
                shopTotals[s] += row.stockByShop[s] ?? 0;
            }
        }
        return { static: staticTotals, shop: shopTotals };
    }, [tableData, shops]);

    const visibleLeafColumns = table.getVisibleLeafColumns();

    useEffect(() => {
        table.setPageIndex(0);
    }, [columnFilters, table]);

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            {/* ── Barre de filtres actifs ── */}
            {columnFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-muted/20">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                        Filtres
                    </span>
                    {columnFilters.map((f) => {
                        const colDef = table.getColumn(f.id)?.columnDef;
                        const label =
                            (colDef?.meta as { label?: string } | undefined)
                                ?.label ??
                            STATIC_LABELS[f.id] ??
                            (f.id.startsWith("shop_")
                                ? f.id.substring("shop_".length)
                                : f.id);
                        const [min, max] = f.value as [
                            number | undefined,
                            number | undefined,
                        ];
                        const rangeText = `${min ?? "∞"} – ${max ?? "∞"}`;
                        return (
                            <Badge
                                key={f.id}
                                variant="secondary"
                                className="h-5 px-1.5 text-[10px] gap-1 font-normal"
                            >
                                <span className="text-muted-foreground/80">
                                    {label}:
                                </span>
                                <span className="font-mono tabular-nums font-semibold">
                                    {rangeText}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        table.getColumn(f.id)?.setFilterValue(undefined)
                                    }
                                    className="ml-0.5 text-muted-foreground hover:text-rose-600"
                                    aria-label={`Retirer filtre ${label}`}
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </Badge>
                        );
                    })}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setColumnFilters([])}
                        className="h-5 px-1.5 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                        Tout effacer
                    </Button>
                </div>
            )}

            <div className="overflow-x-auto">
                <Table className="w-full text-[11px]">
                    {/* ── HEADER ── */}
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="border-none hover:bg-transparent"
                            >
                                {headerGroup.headers.map((header) => {
                                    const isExpander =
                                        header.column.id === "expander";
                                    const isName = header.column.id === "name";
                                    return (
                                        <TableHead
                                            key={header.id}
                                            style={
                                                isName
                                                    ? { left: EXPANDER_WIDTH }
                                                    : undefined
                                            }
                                            className={cn(
                                                "py-2 px-3 text-left text-white align-middle",
                                                isExpander &&
                                                "sticky left-0 z-20 bg-[#101c30] border-r border-slate-700 p-1",
                                                isName &&
                                                "sticky z-20 bg-[#101c30] border-r border-slate-700 min-w-[200px]",
                                            )}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext(),
                                                )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>

                    {/* ── BODY + sous-lignes barcode ── */}
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <Fragment key={row.id}>
                                    <tr className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                                        {row.getVisibleCells().map((cell) => {
                                            const isExpander =
                                                cell.column.id === "expander";
                                            const isName =
                                                cell.column.id === "name";
                                            return (
                                                <td
                                                    key={cell.id}
                                                    style={
                                                        isName
                                                            ? { left: EXPANDER_WIDTH }
                                                            : undefined
                                                    }
                                                    className={cn(
                                                        "py-1.5 px-3 align-middle whitespace-nowrap",
                                                        isExpander &&
                                                        "sticky left-0 z-10 bg-white dark:bg-slate-900 p-1",
                                                        isName &&
                                                        "sticky z-10 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800",
                                                    )}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>

                                    {row.getIsExpanded() &&
                                        row.original.barcodeDetails.map((detail, i) => (
                                            <tr
                                                key={`${row.id}-${i}`}
                                                className="bg-muted/10 border-b border-border/40"
                                            >
                                                {row.getVisibleCells().map((cell) => {
                                                    const isExpander =
                                                        cell.column.id === "expander";
                                                    const isName =
                                                        cell.column.id === "name";
                                                    const isNumeric =
                                                        STATIC_NUMERIC_KEYS.has(
                                                            columnKey(cell.column),
                                                        ) ||
                                                        cell.column.id.startsWith("shop_");
                                                    return (
                                                        <td
                                                            key={`${cell.id}-${i}`}
                                                            style={
                                                                isName
                                                                    ? { left: EXPANDER_WIDTH }
                                                                    : undefined
                                                            }
                                                            className={cn(
                                                                "py-1 px-3 text-[10px] font-mono tabular-nums whitespace-nowrap text-muted-foreground",
                                                                isExpander &&
                                                                "sticky left-0 z-10 bg-muted/10 p-1",
                                                                isName &&
                                                                "sticky z-10 bg-muted/10 border-r border-slate-100 dark:border-slate-800 pl-6",
                                                                isNumeric &&
                                                                "text-right",
                                                            )}
                                                        >
                                                            {renderSubCell(
                                                                detail,
                                                                cell.column,
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                </Fragment>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={visibleLeafColumns.length}
                                    className="h-24 text-center text-muted-foreground text-xs"
                                >
                                    Aucun résultat.
                                </td>
                            </tr>
                        )}
                    </TableBody>

                    {/* ── FOOTER ── */}
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            {visibleLeafColumns.map((column) => {
                                const isExpander = column.id === "expander";
                                const isName = column.id === "name";
                                const value = columnValueForFooter(column, totals);
                                return (
                                    <TableCell
                                        key={column.id}
                                        style={
                                            isName
                                                ? { left: EXPANDER_WIDTH }
                                                : undefined
                                        }
                                        className={cn(
                                            "py-2 px-3 font-mono tabular-nums font-black text-slate-900 dark:text-white",
                                            isExpander &&
                                            "sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 p-1",
                                            isName &&
                                            "sticky z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 uppercase tracking-wider text-left",
                                            !isExpander &&
                                            !isName &&
                                            "text-right",
                                        )}
                                    >
                                        {isExpander
                                            ? ""
                                            : isName
                                                ? "TOTAL"
                                                : value !== undefined
                                                    ? value.toLocaleString("fr-FR")
                                                    : ""}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* ── PAGINATION ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border/60">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                        Lignes
                    </span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) =>
                            table.setPageSize(Number(e.target.value))
                        }
                        className="h-7 px-2 text-[11px] bg-secondary/60 border border-border rounded-lg text-foreground/80"
                    >
                        {[10, 25, 50, 100].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                    <span className="text-[11px] text-muted-foreground">
                        · {table.getFilteredRowModel().rows.length} résultat
                        {table.getFilteredRowModel().rows.length > 1 ? "s" : ""}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-7 px-2 text-[11px] gap-1"
                    >
                        <ChevronLeft className="w-3 h-3" />
                        Précédent
                    </Button>
                    <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {table.getState().pagination.pageIndex + 1} /{" "}
                        {table.getPageCount() || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-7 px-2 text-[11px] gap-1"
                    >
                        Suivant
                        <ChevronRight className="w-3 h-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}