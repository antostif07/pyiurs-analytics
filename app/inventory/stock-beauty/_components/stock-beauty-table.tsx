// app/inventory/stock-beauty/_components/stock-beauty-table.tsx
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
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";

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

import type {
    IndividualProductModel,
    StockBeautyModel,
} from "../_lib/types";
import { buildStockBeautyColumns } from "./stock-beauty-columns";

const EXPANDER_WIDTH = 32;

const STATIC_NUMERIC_KEYS = new Set([
    "product_qty",
    "qty_received",
    "not_received",
    "qty_sold",
    "qty_available",
    "sales_last_30_days",
]);

interface Props {
    tableData: StockBeautyModel[];
    shops: string[];
}

function columnKey(col: Column<StockBeautyModel, unknown>): string {
    const cdef = col.columnDef as { accessorKey?: string };
    return cdef.accessorKey ?? col.id;
}

function renderSubCell(
    product: IndividualProductModel,
    col: Column<StockBeautyModel, unknown>,
): ReactNode {
    const key = columnKey(col);
    const dash = "–";

    if (col.id.startsWith("shop_")) {
        const shopName = col.id.substring("shop_".length);
        const v = product.stockByShop[shopName] ?? 0;
        return v || dash;
    }

    switch (key) {
        case "expander":
            return null;
        case "name":
            return (
                <div className="pl-6 text-[10px] text-muted-foreground">
                    <div className="font-medium text-[11px]">{product.name}</div>
                    <div className="text-[9px]">Variant #{product.productVariantId}</div>
                </div>
            );
        case "qty_available":
            return product.total_stock || dash;
        case "sales_last_30_days":
            return product.sales_last_30_days || dash;
        case "product_qty":
        case "qty_received":
        case "not_received":
        case "qty_sold":
            return dash;
        case "replenishment_metrics":
            return dash;
        default:
            return null;
    }
}

export default function StockBeautyTable({ tableData, shops }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const cols = useMemo(() => buildStockBeautyColumns(shops), [shops]);

    const expanderColumn: ColumnDef<StockBeautyModel, unknown> = {
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

    const allCols = useMemo(() => [expanderColumn, ...cols], [cols]);

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
        initialState: { pagination: { pageSize: 25 } },
    });

    const totals = useMemo(() => {
        const staticTotals: Record<string, number> = {
            product_qty: 0,
            qty_received: 0,
            not_received: 0,
            qty_sold: 0,
            qty_available: 0,
            sales_last_30_days: 0,
        };
        const shopTotals: Record<string, number> = {};
        for (const s of shops) shopTotals[s] = 0;

        for (const row of tableData) {
            for (const key of Object.keys(staticTotals)) {
                staticTotals[key] += (row as any)[key] ?? 0;
            }
            for (const s of shops) {
                shopTotals[s] += row.stockByShop[s] ?? 0;
            }
        }
        return { static: staticTotals, shop: shopTotals };
    }, [tableData, shops]);

    useEffect(() => {
        table.setPageIndex(0);
    }, [columnFilters, table]);

    const visibleLeafColumns = table.getVisibleLeafColumns();

    return (
        <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
            {columnFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-muted/20">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                        Filtres
                    </span>
                    {columnFilters.map((f) => {
                        const colDef = table.getColumn(f.id)?.columnDef;
                        const label =
                            (colDef?.meta as { label?: string } | undefined)?.label ??
                            f.id;
                        const [min, max] = f.value as [
                            number | undefined,
                            number | undefined,
                        ];
                        return (
                            <Badge
                                key={f.id}
                                variant="secondary"
                                className="h-5 px-1.5 text-[10px] gap-1 font-normal"
                            >
                                <span className="text-muted-foreground/80">{label}:</span>
                                <span className="font-mono tabular-nums font-semibold">
                                    {min ?? "∞"} – {max ?? "∞"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        table.getColumn(f.id)?.setFilterValue(undefined)
                                    }
                                    className="ml-0.5 text-muted-foreground hover:text-rose-600"
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
                    <TableHeader className="bg-[#101c30] hover:bg-[#101c30]">
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow
                                key={hg.id}
                                className="border-none hover:bg-transparent"
                            >
                                {hg.headers.map((header) => {
                                    const isExpander = header.column.id === "expander";
                                    const isName = header.column.id === "name";
                                    return (
                                        <TableHead
                                            key={header.id}
                                            style={isName ? { left: EXPANDER_WIDTH } : undefined}
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
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {table.getRowModel().rows.length ? (
                            table.getRowModel().rows.map((row) => (
                                <Fragment key={row.id}>
                                    <tr className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                                        {row.getVisibleCells().map((cell) => {
                                            const isExpander = cell.column.id === "expander";
                                            const isName = cell.column.id === "name";
                                            return (
                                                <td
                                                    key={cell.id}
                                                    style={isName ? { left: EXPANDER_WIDTH } : undefined}
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
                                        row.original.individualProducts.map((p) => (
                                            <tr
                                                key={`${row.id}-${p.productVariantId}`}
                                                className="bg-muted/10 border-b border-border/40"
                                            >
                                                {row.getVisibleCells().map((cell) => {
                                                    const isExpander = cell.column.id === "expander";
                                                    const isName = cell.column.id === "name";
                                                    const isNumeric =
                                                        STATIC_NUMERIC_KEYS.has(
                                                            columnKey(cell.column),
                                                        ) || cell.column.id.startsWith("shop_");
                                                    return (
                                                        <td
                                                            key={`${cell.id}-${p.productVariantId}`}
                                                            style={isName ? { left: EXPANDER_WIDTH } : undefined}
                                                            className={cn(
                                                                "py-1 px-3 text-[10px] font-mono tabular-nums whitespace-nowrap text-muted-foreground",
                                                                isExpander &&
                                                                "sticky left-0 z-10 bg-muted/10 p-1",
                                                                isName &&
                                                                "sticky z-10 bg-muted/10 border-r border-slate-100 dark:border-slate-800 pl-6",
                                                                isNumeric && "text-right",
                                                            )}
                                                        >
                                                            {renderSubCell(p, cell.column)}
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
                    <TableFooter className="bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                        <TableRow className="hover:bg-transparent border-none">
                            {visibleLeafColumns.map((column) => {
                                const isExpander = column.id === "expander";
                                const isName = column.id === "name";
                                const key = columnKey(column);
                                let value: number | undefined;
                                if (STATIC_NUMERIC_KEYS.has(key)) value = totals.static[key];
                                else if (column.id.startsWith("shop_")) {
                                    const shopName = column.id.substring("shop_".length);
                                    value = totals.shop[shopName];
                                }
                                return (
                                    <TableCell
                                        key={column.id}
                                        style={isName ? { left: EXPANDER_WIDTH } : undefined}
                                        className={cn(
                                            "py-2 px-3 font-mono tabular-nums font-black text-slate-900 dark:text-white",
                                            isExpander &&
                                            "sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/90 p-1",
                                            isName &&
                                            "sticky z-10 bg-slate-50 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 uppercase tracking-wider text-left",
                                            !isExpander && !isName && "text-right",
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

            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-border/60">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Lignes</span>
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        className="h-7 px-2 text-[11px] bg-secondary/60 border border-border rounded-lg text-foreground/80"
                    >
                        {[10, 25, 50, 100].map((size) => (
                            <option key={size} value={size}>{size}</option>
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
                        {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
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