"use client";

import { useState, useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table";
import { SupplierMonthlyPerformance } from "./supplier-helpers";
import { Package, Building2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface SupplierTableProps {
    suppliers: SupplierMonthlyPerformance[];
    columns: { key: string; label: string }[];
}

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export function SupplierTable({ suppliers, columns }: SupplierTableProps) {
    const [sorting, setSorting] = useState<SortingState>([
        { id: "totalRevenue", desc: true },
    ]);

    const last3MonthKeys = useMemo(() => {
        return columns.slice(-3).map((c) => c.key);
    }, [columns]);

    const tableColumns = useMemo<ColumnDef<SupplierMonthlyPerformance>[]>(() => {
        // 1. Fournisseur
        const supplierCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "supplierName",
            accessorKey: "supplierName",
            header: "Fournisseur / Marque",
            cell: ({ row }) => (
                <div className="flex items-center gap-2.5 font-medium text-foreground">
                    <span className="text-[10px] text-muted-foreground/50 font-mono w-4 shrink-0 text-right">
                        {row.index + 1}.
                    </span>
                    <span className="truncate max-w-[180px] sm:max-w-[240px] font-semibold text-xs" title={row.original.supplierName}>
                        {row.original.supplierName}
                    </span>
                </div>
            ),
        };

        // 2. Stock
        const stockCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "currentStockQty",
            accessorKey: "currentStockQty",
            header: "Stock Actuel",
            cell: ({ getValue }) => {
                const val = getValue<number>() || 0;
                return (
                    <div className="inline-flex items-center justify-end gap-1.5 font-mono text-xs text-muted-foreground">
                        <Package className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                        <span>{val.toLocaleString("fr-FR")}</span>
                    </div>
                );
            },
        };

        // 3. Colonnes mensuelles (Vente $ + Achat entre parenthèses en dessous)
        const monthCols: ColumnDef<SupplierMonthlyPerformance>[] = columns.map((col) => ({
            id: col.key,
            accessorFn: (row) => row.monthlySales[col.key] || 0,
            header: col.label,
            cell: ({ row }) => {
                const salesAmount = row.original.monthlySales[col.key] || 0;
                const costAmount = row.original.monthlyPurchaseCost[col.key] || 0;

                if (salesAmount === 0) {
                    return <span className="text-muted-foreground/30 font-mono font-light text-xs">—</span>;
                }

                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-mono text-xs text-foreground font-medium">
                            {formatUSD(salesAmount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 font-mono font-light mt-0.5">
                            ({formatUSD(costAmount)})
                        </span>
                    </div>
                );
            },
        }));

        // 4. Total 3 Mois (Vente + Achat)
        const total3MCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "total3Months",
            accessorFn: (row) => last3MonthKeys.reduce((sum, key) => sum + (row.monthlySales[key] || 0), 0),
            header: "Total 3M ($)",
            cell: ({ row }) => {
                const sales3M = last3MonthKeys.reduce((sum, key) => sum + (row.original.monthlySales[key] || 0), 0);
                const cost3M = last3MonthKeys.reduce((sum, key) => sum + (row.original.monthlyPurchaseCost[key] || 0), 0);

                if (sales3M === 0) return <span className="text-muted-foreground/30 font-mono text-xs">—</span>;

                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-semibold text-foreground font-mono text-xs">
                            {formatUSD(sales3M)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 font-mono font-light mt-0.5">
                            ({formatUSD(cost3M)})
                        </span>
                    </div>
                );
            },
        };

        // 5. CA Total 6M ($) (Vente + Achat à l'extrême droite)
        const total6MCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "totalRevenue",
            accessorKey: "totalRevenue",
            header: "CA Total 6M ($)",
            cell: ({ row }) => {
                const totalSales = row.original.totalRevenue || 0;
                const totalCost = row.original.totalPurchaseCost || 0;

                return (
                    <div className="flex flex-col items-end leading-tight">
                        <span className="font-bold text-primary font-mono text-xs">
                            {formatUSD(totalSales)}
                        </span>
                        <span className="text-[10px] text-primary/70 font-mono font-medium mt-0.5">
                            ({formatUSD(totalCost)})
                        </span>
                    </div>
                );
            },
        };

        return [supplierCol, stockCol, ...monthCols, total3MCol, total6MCol];
    }, [columns, last3MonthKeys]);

    const table = useReactTable({
        data: suppliers,
        columns: tableColumns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    if (!suppliers || suppliers.length === 0) {
        return (
            <div className="text-center py-16 px-4 bg-card rounded-2xl border border-border border-dashed">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">Aucun fournisseur trouvé</h3>
            </div>
        );
    }

    // Totaux Généraux
    const totalRevenueAll = suppliers.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCostAll = suppliers.reduce((sum, s) => sum + s.totalPurchaseCost, 0);
    const totalStockAll = suppliers.reduce((sum, s) => sum + s.currentStockQty, 0);

    const totalSales3MAll = suppliers.reduce((sum, s) => {
        return sum + last3MonthKeys.reduce((mSum, key) => mSum + (s.monthlySales[key] || 0), 0);
    }, 0);

    const totalCost3MAll = suppliers.reduce((sum, s) => {
        return sum + last3MonthKeys.reduce((mSum, key) => mSum + (s.monthlyPurchaseCost[key] || 0), 0);
    }, 0);

    const monthlySalesTotals: Record<string, number> = {};
    const monthlyCostTotals: Record<string, number> = {};

    columns.forEach((col) => {
        monthlySalesTotals[col.key] = suppliers.reduce((sum, s) => sum + (s.monthlySales[col.key] || 0), 0);
        monthlyCostTotals[col.key] = suppliers.reduce((sum, s) => sum + (s.monthlyPurchaseCost[col.key] || 0), 0);
    });

    return (
        <div className="w-full bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden transition-colors duration-150">

            {/* Mini Bandeau de Synthèse Financière */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-muted/20 border-b border-border/80">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Synthèse Ventes & Coûts
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-mono font-bold px-2 py-0.5 rounded-full ml-1">
                        {suppliers.length} Actifs
                    </span>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>Stock total:</span>
                        <strong className="text-foreground font-semibold">{totalStockAll.toLocaleString("fr-FR")} unit.</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">CA 6M (Coût 6M):</span>
                        <strong className="text-primary font-bold text-xs">
                            {formatUSD(totalRevenueAll)} <span className="text-muted-foreground font-normal">({formatUSD(totalCostAll)})</span>
                        </strong>
                    </div>
                </div>
            </div>

            {/* Tableau avec Vente + Achat sous-jacent */}
            <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr
                                key={headerGroup.id}
                                className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[9px] tracking-widest font-bold"
                            >
                                {headerGroup.headers.map((header) => {
                                    const isSorted = header.column.getIsSorted();
                                    const canSort = header.column.getCanSort();
                                    const isTotal6MCol = header.id === "totalRevenue";
                                    const isTotal3MCol = header.id === "total3Months";

                                    return (
                                        <th
                                            key={header.id}
                                            className={`py-3 px-4 select-none ${header.id === "supplierName" ? "text-left min-w-[200px]" : "text-right min-w-[110px]"
                                                } ${isTotal3MCol ? "bg-muted/30 font-bold border-l border-border/40" : ""} ${isTotal6MCol ? "bg-primary/5 text-primary border-l border-border/40 font-black" : ""
                                                }`}
                                        >
                                            {canSort ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className={`inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group outline-none ${header.id !== "supplierName" ? "justify-end w-full" : ""
                                                        }`}
                                                >
                                                    <span>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </span>
                                                    {isSorted === "asc" ? (
                                                        <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                                                    ) : isSorted === "desc" ? (
                                                        <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/30 group-hover:text-foreground shrink-0 transition-colors" />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(header.column.columnDef.header, header.getContext())
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        ))}
                    </thead>

                    <tbody className="divide-y divide-border/40">
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-muted/30 transition-colors group">
                                {row.getVisibleCells().map((cell) => {
                                    const isTotal6MCol = cell.column.id === "totalRevenue";
                                    const isTotal3MCol = cell.column.id === "total3Months";

                                    return (
                                        <td
                                            key={cell.id}
                                            className={`py-2.5 px-4 ${cell.column.id === "supplierName" ? "text-left" : "text-right"
                                                } ${isTotal3MCol ? "bg-muted/20 border-l border-border/40" : ""} ${isTotal6MCol ? "bg-primary/5 border-l border-border/40" : ""
                                                }`}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr className="bg-muted/50 font-bold border-t-2 border-border text-foreground text-xs">
                            <td className="py-3.5 px-4 uppercase tracking-wider text-[10px] font-bold">
                                Total Consolidation ({suppliers.length})
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                                {totalStockAll.toLocaleString("fr-FR")}
                            </td>

                            {/* Totaux mensuels Vente (Coût) */}
                            {columns.map((col) => (
                                <td key={col.key} className="py-3.5 px-4 text-right font-mono">
                                    <div className="flex flex-col items-end leading-tight">
                                        <span className="text-foreground font-semibold text-xs">{formatUSD(monthlySalesTotals[col.key] || 0)}</span>
                                        <span className="text-[10px] text-muted-foreground font-light">({formatUSD(monthlyCostTotals[col.key] || 0)})</span>
                                    </div>
                                </td>
                            ))}

                            {/* Total 3M Vente (Coût) */}
                            <td className="py-3.5 px-4 text-right font-mono bg-muted/40 border-l border-border/60">
                                <div className="flex flex-col items-end leading-tight">
                                    <span className="text-foreground font-bold text-xs">{formatUSD(totalSales3MAll)}</span>
                                    <span className="text-[10px] text-muted-foreground font-light">({formatUSD(totalCost3MAll)})</span>
                                </div>
                            </td>

                            {/* CA Total 6M Vente (Coût) */}
                            <td className="py-3.5 px-4 text-right font-mono bg-primary/10 border-l border-border/60">
                                <div className="flex flex-col items-end leading-tight">
                                    <span className="text-primary font-black text-xs">{formatUSD(totalRevenueAll)}</span>
                                    <span className="text-[10px] text-primary/70 font-semibold">({formatUSD(totalCostAll)})</span>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}