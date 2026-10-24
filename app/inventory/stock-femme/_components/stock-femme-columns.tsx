// app/inventory/stock-femme/_components/stock-femme-columns.tsx
"use client";

import type { Column, ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { ColumnRangeFilter } from "./column-range-filter";

import type { ControlStockFemmeModel } from "../_lib/types";
import ProductImage from "@/app/marketing/components/ProductImage";

const getStockColor = (qty: number): string => {
    if (qty <= 0) return "bg-black text-white";
    if (qty <= 5) return "bg-red-500 text-white";
    if (qty <= 11) return "bg-yellow-500 text-black";
    return "bg-green-500 text-white";
};

function SortableHeader({
    column,
    title,
    filterable = false,
}: {
    column: Column<ControlStockFemmeModel, unknown>;
    title: string;
    filterable?: boolean;
}) {
    return (
        <div className="inline-flex items-center gap-1">
            <button
                type="button"
                onClick={() =>
                    column.toggleSorting(column.getIsSorted() === "asc")
                }
                className="inline-flex items-center gap-1 text-[10px] font-bold text-white uppercase tracking-wider hover:text-white/80 transition-colors"
            >
                {title}
                <ArrowUpDown className="h-3 w-3 opacity-60" />
            </button>
            {filterable && (
                <ColumnRangeFilter column={column} label={title} />
            )}
        </div>
    );
}

function StockBadgeCell({
    value,
    barcodes,
}: {
    value: number;
    barcodes?: string[];
}) {
    const tooltip = barcodes?.length
        ? `Codes-barres : ${barcodes.join(", ")}`
        : undefined;

    return (
        <span
            className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-bold text-center min-w-[2.5rem] inline-block font-mono tabular-nums",
                getStockColor(value),
            )}
            title={tooltip}
        >
            {value}
        </span>
    );
}

const numberRangeFilter = (
    row: Row<ControlStockFemmeModel>,
    id: string,
    filterValue: [number | undefined, number | undefined] | undefined,
) => {
    if (!filterValue) return true;
    const value = Number(row.getValue(id));
    const [min, max] = filterValue;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
};

const multiSelectFilter = (
    row: Row<ControlStockFemmeModel>,
    id: string,
    filterValues: string[],
) => {
    const value = row.getValue(id) as string;
    if (!filterValues?.length) return true;
    return filterValues.includes(value);
};

export function buildControlStockFemmeColumns(
    shops: string[],
): ColumnDef<ControlStockFemmeModel, unknown>[] {
    const shopColumns: ColumnDef<ControlStockFemmeModel, unknown>[] = shops.map(
        (shopName) => ({
            id: `shop_${shopName}`,
            header: ({ column }) => (
                <SortableHeader column={column} title={shopName} filterable />
            ),
            accessorFn: (row) => row.stockByShop[shopName] ?? 0,
            cell: ({ row, getValue }) => (
                <StockBadgeCell
                    value={getValue<number>()}
                    barcodes={row.original.barcodesByShop[shopName]}
                />
            ),
            size: 90,
            meta: {
                type: "number",
                filterVariant: "range",
                label: shopName,
            },
            filterFn: numberRangeFilter,
        }),
    );

    return [
        {
            accessorKey: "po_name",
            header: "PO",
            enableHiding: true,
            enableColumnFilter: true,
            meta: {
                type: "text",
                filterVariant: "multi-select",
                label: "PO",
            },
            filterFn: multiSelectFilter,
        },
        {
            accessorKey: "name",
            header: ({ column }) => (
                <SortableHeader column={column} title="Référence" />
            ),
            cell: ({ row }) => {
                const { brand, color, imageUrl, name } = row.original;
                return (
                    <div className="flex space-x-3 items-center">
                        <div className="w-10 h-10 shrink-0">
                            <ProductImage src={imageUrl} alt={name} />
                        </div>
                        <div className="py-1">
                            <div className="font-medium text-[12px] text-foreground line-clamp-1">
                                {name}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center space-x-1 mt-0.5">
                                <span className="font-semibold">{brand}</span>
                                {color && color !== "Non spécifié" && (
                                    <>
                                        <span className="text-muted-foreground/40">
                                            •
                                        </span>
                                        <span className="text-sky-600 dark:text-sky-400 font-medium">
                                            {color}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            },
            enableColumnFilter: true,
            size: 300,
            meta: {
                type: "text",
                filterVariant: "multi-select",
                label: "Référence",
            },
            filterFn: multiSelectFilter,
        },
        {
            accessorKey: "product_qty",
            header: ({ column }) => (
                <SortableHeader column={column} title="Achts" filterable />
            ),
            cell: ({ getValue }) => (
                <span className="font-semibold text-sky-600 text-[12px] font-mono tabular-nums">
                    {getValue<number>()}
                </span>
            ),
            size: 90,
            meta: { type: "number", filterVariant: "range", label: "Achats" },
            filterFn: numberRangeFilter,
        },
        {
            accessorKey: "qty_received",
            header: ({ column }) => (
                <SortableHeader column={column} title="Reçu" filterable />
            ),
            cell: ({ getValue }) => (
                <span className="font-semibold text-emerald-600 text-[12px] font-mono tabular-nums">
                    {getValue<number>()}
                </span>
            ),
            size: 90,
            meta: { type: "number", filterVariant: "range", label: "Reçu" },
            filterFn: numberRangeFilter,
        },
        {
            accessorKey: "not_received",
            header: ({ column }) => (
                <SortableHeader column={column} title="Rlq" filterable />
            ),
            cell: ({ getValue }) => {
                const value = getValue<number>();
                return (
                    <span
                        className={
                            value > 0
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded text-[11px] font-semibold font-mono tabular-nums"
                                : "text-muted-foreground/60 text-[12px] font-mono tabular-nums"
                        }
                    >
                        {value}
                    </span>
                );
            },
            size: 90,
            meta: { type: "number", filterVariant: "range", label: "Rlq" },
            filterFn: numberRangeFilter,
        },
        {
            accessorKey: "qty_sold",
            header: ({ column }) => (
                <SortableHeader column={column} title="Vendu" filterable />
            ),
            cell: ({ getValue }) => (
                <span className="font-semibold text-violet-600 text-[12px] font-mono tabular-nums">
                    {getValue<number>()}
                </span>
            ),
            size: 90,
            meta: { type: "number", filterVariant: "range", label: "Vendu" },
            filterFn: numberRangeFilter,
        },
        {
            accessorKey: "qty_available",
            header: ({ column }) => (
                <SortableHeader column={column} title="Stock" filterable />
            ),
            cell: ({ row, getValue }) => (
                <StockBadgeCell
                    value={getValue<number>()}
                    barcodes={row.original.barcodes}
                />
            ),
            size: 90,
            meta: { type: "number", filterVariant: "range", label: "Dispo" },
            filterFn: numberRangeFilter,
        },
        ...shopColumns,
        {
            accessorKey: "age",
            id: "stock_age",
            header: ({ column }) => (
                <SortableHeader column={column} title="Âge" />
            ),
            cell: ({ getValue }) => {
                const raw = getValue<string>();
                return (
                    <span className="text-muted-foreground text-[11px] font-mono">
                        {raw || "—"}
                    </span>
                );
            },
            size: 90,
            meta: { type: "text", label: "Âge" },
        },
        {
            id: "perf",
            header: ({ column }) => (
                <SortableHeader column={column} title="Perf" filterable />
            ),
            accessorFn: (row) =>
                (row.qty_sold / (row.qty_received || 1)) * 100,
            cell: ({ getValue }) => (
                <span className="text-muted-foreground font-medium text-[12px] font-mono tabular-nums">
                    {getValue<number>().toFixed(2)}%
                </span>
            ),
            filterFn: numberRangeFilter,
            enableSorting: true,
            enableColumnFilter: true,
            size: 90,
            meta: {
                type: "number",
                filterVariant: "range",
                label: "Performance",
            },
        },
    ];
}