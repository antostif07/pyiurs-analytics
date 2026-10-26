// app/inventory/stock-beauty/_components/stock-beauty-columns.tsx
"use client";

import type { Column, ColumnDef, Row } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ColumnRangeFilter } from "@/app/inventory/stock-femme/_components/column-range-filter";

import type { StockBeautyModel } from "../_lib/types";
import ProductImage from "@/app/marketing/components/ProductImage";

const getStockColor = (qty: number): string => {
    if (qty <= 0) return "bg-black text-white";
    if (qty <= 5) return "bg-red-500 text-white";
    if (qty <= 11) return "bg-yellow-500 text-black";
    return "bg-green-500 text-white";
};

const getDaysColor = (days: number): string => {
    if (days <= 7) return "text-rose-600 font-bold";
    if (days <= 14) return "text-orange-500";
    if (days <= 30) return "text-yellow-500";
    return "text-emerald-500";
};

function SortableHeader({
    column,
    title,
    align = "center",
    filterable = false,
}: {
    column: Column<StockBeautyModel, unknown>;
    title: string;
    align?: "left" | "center" | "right";
    filterable?: boolean;
}) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1",
                align === "left" && "justify-start",
                align === "center" && "justify-center",
                align === "right" && "justify-end",
            )}
        >
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
            {filterable && <ColumnRangeFilter column={column} label={title} />}
        </div>
    );
}

function StockBadgeCell({ value }: { value: number }) {
    return (
        <span
            className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-bold text-center min-w-[2.5rem] inline-block font-mono tabular-nums",
                getStockColor(value),
            )}
        >
            {value}
        </span>
    );
}

function ProductNameCell({ row }: { row: Row<StockBeautyModel> }) {
    const { name, brand, color, hs_code } = row.original;
    const imageUrl = `https://images.bybkm.fr/${hs_code}_.jpg`;
    return (
        <div className="flex space-x-2 items-center w-96">
            <div className="h-10 w-10 relative shrink-0">
                <ProductImage src={imageUrl} alt={name} />
            </div>
            <div className="py-1 flex-1 min-w-0">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="font-medium text-[12px] truncate cursor-help text-left">
                                {name}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md">
                            <p className="text-sm">{name}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className="text-[10px] text-muted-foreground flex items-center space-x-1 mt-0.5 truncate">
                    <span className="font-semibold">{brand}</span>
                    {color && color !== "Non spécifié" && (
                        <>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-sky-600 dark:text-sky-400 font-medium">
                                {color}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function ReplenishmentCell({ row }: { row: Row<StockBeautyModel> }) {
    const {
        sales_last_30_days: sales30d,
        daily_sales_rate: dailyRate,
        days_until_out_of_stock: daysLeft,
        recommended_reorder_date: reorderDate,
        last_sale_date: lastSaleDate,
    } = row.original;

    if (sales30d === 0) {
        return (
            <div className="text-[10px] space-y-1">
                <div className="text-muted-foreground/60">Pas de vente</div>
                {lastSaleDate && (
                    <div className="text-muted-foreground">
                        Dern. vente :{" "}
                        {new Date(lastSaleDate).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                        })}
                    </div>
                )}
            </div>
        );
    }

    const daysColor = getDaysColor(daysLeft);

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="text-[10px] space-y-1 cursor-help">
                        <div className="flex justify-between gap-2">
                            <span>Jours rest.</span>
                            <span className={cn("font-medium", daysColor)}>
                                {daysLeft}j
                            </span>
                        </div>
                        {reorderDate && (
                            <div className="flex justify-between gap-2">
                                <span>Commander</span>
                                <span className="text-sky-600 font-medium">
                                    {new Date(reorderDate).toLocaleDateString(
                                        "fr-FR",
                                        {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "2-digit",
                                        },
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-xs">
                    <div className="space-y-1">
                        <div>
                            <strong>Ventes 30j :</strong> {sales30d} unités
                        </div>
                        <div>
                            <strong>Ratio :</strong> {dailyRate.toFixed(2)}/jour
                        </div>
                        <div>
                            <strong>Jours avant rupture :</strong>{" "}
                            <span className={daysColor}>{daysLeft}j</span>
                        </div>
                        {reorderDate && (
                            <div>
                                <strong>Commander avant :</strong>{" "}
                                {new Date(reorderDate).toLocaleDateString(
                                    "fr-FR",
                                    {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    },
                                )}
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

const numberRangeFilter = (
    row: Row<StockBeautyModel>,
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

export function buildStockBeautyColumns(
    shops: string[],
): ColumnDef<StockBeautyModel, unknown>[] {
    const shopColumns: ColumnDef<StockBeautyModel, unknown>[] = shops.map(
        (shopName) => ({
            id: `shop_${shopName}`,
            header: ({ column }) => (
                <SortableHeader column={column} title={shopName} filterable />
            ),
            accessorFn: (row) => row.stockByShop[shopName] ?? 0,
            cell: ({ getValue }) => (
                <StockBadgeCell value={getValue<number>()} />
            ),
            size: 70,
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
            accessorKey: "name",
            header: ({ column }) => (
                <SortableHeader column={column} title="Produit" align="left" />
            ),
            cell: ({ row }) => <ProductNameCell row={row} />,
            enableResizing: false,
            size: 320,
            meta: { type: "text", label: "Produit" },
        },
        {
            accessorKey: "product_qty",
            header: ({ column }) => (
                <SortableHeader column={column} title="Ach." filterable />
            ),
            cell: ({ getValue }) => (
                <span className="font-medium text-sky-600 text-[12px] font-mono tabular-nums">
                    {getValue<number>()}
                </span>
            ),
            size: 60,
            filterFn: numberRangeFilter,
            meta: {
                type: "number",
                filterVariant: "range",
                label: "Achats",
            },
        },
        {
            accessorKey: "qty_received",
            header: ({ column }) => (
                <SortableHeader column={column} title="Reçu" filterable />
            ),
            cell: ({ getValue }) => (
                <span className="font-medium text-emerald-600 text-[12px] font-mono tabular-nums">
                    {getValue<number>()}
                </span>
            ),
            size: 70,
            filterFn: numberRangeFilter,
            meta: {
                type: "number",
                filterVariant: "range",
                label: "Reçu",
            },
        },
        {
            accessorKey: "not_received",
            header: ({ column }) => (
                <SortableHeader column={column} title="Rlq" filterable />
            ),
            cell: ({ getValue }) => {
                const v = getValue<number>();
                return (
                    <span
                        className={
                            v > 0
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded text-[11px] font-semibold font-mono tabular-nums"
                                : "text-muted-foreground/60 text-[12px] font-mono tabular-nums"
                        }
                    >
                        {v}
                    </span>
                );
            },
            size: 60,
            filterFn: numberRangeFilter,
            meta: {
                type: "number",
                filterVariant: "range",
                label: "Rlq",
            },
        },
        {
            accessorKey: "qty_sold",
            header: ({ column }) => (
                <SortableHeader column={column} title="Ven." filterable />
            ),
            cell: ({ getValue }) => (
                <span className="font-medium text-violet-600 text-[12px] font-mono tabular-nums">
                    {getValue<number>()}
                </span>
            ),
            size: 60,
            filterFn: numberRangeFilter,
            meta: {
                type: "number",
                filterVariant: "range",
                label: "Vendu",
            },
        },
        {
            accessorKey: "qty_available",
            header: ({ column }) => (
                <SortableHeader column={column} title="Disp." filterable />
            ),
            cell: ({ getValue }) => (
                <StockBadgeCell value={getValue<number>()} />
            ),
            size: 70,
            filterFn: numberRangeFilter,
            meta: {
                type: "number",
                filterVariant: "range",
                label: "Dispo",
            },
        },
        ...shopColumns,
        {
            accessorKey: "sales_last_30_days",
            header: ({ column }) => (
                <SortableHeader column={column} title="Ven. 30j" filterable />
            ),
            cell: ({ getValue }) => (
                <span className="font-mono tabular-nums text-[12px] text-muted-foreground">
                    {getValue<number>()}
                </span>
            ),
            size: 70,
            filterFn: numberRangeFilter,
            meta: {
                type: "number",
                filterVariant: "range",
                label: "Ventes 30j",
            },
        },
        {
            id: "replenishment_metrics",
            accessorFn: (row) => {
                if (!row.recommended_reorder_date) return -1;
                return new Date(row.recommended_reorder_date).getTime();
            },
            header: ({ column }) => (
                <SortableHeader column={column} title="Réappro." align="left" />
            ),
            cell: ({ row }) => <ReplenishmentCell row={row} />,
            size: 140,
            meta: { type: "text", label: "Réappro." },
        },
    ];
}