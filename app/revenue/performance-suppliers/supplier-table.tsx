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

/**
 * Formate un nombre en devise USD ($)
 */
const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export function SupplierTable({ suppliers, columns }: SupplierTableProps) {
    // ✅ État de tri TanStack Table (Par défaut : CA Total décroissant)
    const [sorting, setSorting] = useState<SortingState>([
        { id: "totalRevenue", desc: true },
    ]);

    // ✅ Définition des colonnes pour TanStack Table
    const tableColumns = useMemo<ColumnDef<SupplierMonthlyPerformance>[]>(() => {
        const baseColumns: ColumnDef<SupplierMonthlyPerformance>[] = [
            {
                id: "supplierName",
                accessorKey: "supplierName",
                header: "Fournisseur / Marque",
                cell: ({ row }) => (
                    <div className="flex items-center gap-2 font-medium text-foreground">
                        <span className="text-[10px] text-muted-foreground/60 font-mono w-4">
                            {row.index + 1}.
                        </span>
                        <span className="truncate max-w-[220px]" title={row.original.supplierName}>
                            {row.original.supplierName}
                        </span>
                    </div>
                ),
            },
            {
                id: "currentStockQty",
                accessorKey: "currentStockQty",
                header: "Stock Actuel",
                cell: ({ getValue }) => (
                    <div className="inline-flex items-center justify-end gap-1 font-mono text-muted-foreground">
                        <Package className="w-3 h-3 text-muted-foreground/40" />
                        <span>{(getValue<number>() || 0).toLocaleString("fr-FR")}</span>
                    </div>
                ),
            },
            {
                id: "totalRevenue",
                accessorKey: "totalRevenue",
                header: "CA Total ($)",
                cell: ({ getValue }) => (
                    <span className="font-bold text-foreground font-mono">
                        {formatUSD(getValue<number>() || 0)}
                    </span>
                ),
            },
        ];

        // ✅ Colonnes dynamiques triables pour les 6 mois roulants
        const monthColumns: ColumnDef<SupplierMonthlyPerformance>[] = columns.map((col) => ({
            id: col.key,
            accessorFn: (row) => row.monthlySales[col.key] || 0,
            header: col.label,
            cell: ({ getValue }) => {
                const amount = getValue<number>() || 0;
                return (
                    <span
                        className={`font-mono ${amount > 0 ? "text-foreground" : "text-muted-foreground/30"
                            }`}
                    >
                        {amount > 0 ? formatUSD(amount) : "—"}
                    </span>
                );
            },
        }));

        return [...baseColumns, ...monthColumns];
    }, [columns]);

    // Instanciation de la table TanStack
    const table = useReactTable({
        data: suppliers,
        columns: tableColumns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(), // Activation du moteur de tri
    });

    if (!suppliers || suppliers.length === 0) {
        return (
            <div className="text-center py-12 px-4 bg-card rounded-2xl border border-border border-dashed">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">Aucune donnée fournisseur</h3>
                <p className="text-xs text-muted-foreground mt-1 font-light">
                    Aucune vente enregistrée pour des fournisseurs externes sur la période sélectionnée.
                </p>
            </div>
        );
    }

    // Totaux généraux pour le bas de tableau (Footer)
    const totalRevenueAll = suppliers.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalStockAll = suppliers.reduce((sum, s) => sum + s.currentStockQty, 0);
    const monthlyTotals: Record<string, number> = {};
    columns.forEach((col) => {
        monthlyTotals[col.key] = suppliers.reduce(
            (sum, s) => sum + (s.monthlySales[col.key] || 0),
            0
        );
    });

    return (
        <div className="w-full bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden transition-colors duration-150">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                    {/* En-tête avec boutons de tri interactifs */}
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr
                                key={headerGroup.id}
                                className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold"
                            >
                                {headerGroup.headers.map((header) => {
                                    const isSorted = header.column.getIsSorted();
                                    const canSort = header.column.getCanSort();

                                    return (
                                        <th
                                            key={header.id}
                                            className={`py-3 px-4 select-none ${header.id === "supplierName" ? "text-left min-w-[200px]" : "text-right min-w-[110px]"
                                                } ${header.id === "totalRevenue" ? "text-primary" : ""}`}
                                        >
                                            {canSort ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer group outline-none"
                                                >
                                                    <span>
                                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                                    </span>
                                                    {isSorted === "asc" ? (
                                                        <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                                                    ) : isSorted === "desc" ? (
                                                        <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-foreground shrink-0 transition-colors" />
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

                    {/* Corps du tableau triable */}
                    <tbody className="divide-y divide-border/60">
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="hover:bg-muted/30 transition-colors group">
                                {row.getVisibleCells().map((cell) => (
                                    <td
                                        key={cell.id}
                                        className={`py-3 px-4 ${cell.column.id === "supplierName" ? "text-left" : "text-right"
                                            }`}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>

                    {/* Totaux généraux */}
                    <tfoot>
                        <tr className="bg-muted/60 font-bold border-t-2 border-border text-foreground text-xs">
                            <td className="py-3.5 px-4 uppercase tracking-wider text-[10px]">
                                Total Général ({suppliers.length} Fournisseurs)
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                                {totalStockAll.toLocaleString("fr-FR")}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-primary">
                                {formatUSD(totalRevenueAll)}
                            </td>
                            {columns.map((col) => (
                                <td key={col.key} className="py-3.5 px-4 text-right font-mono">
                                    {formatUSD(monthlyTotals[col.key] || 0)}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}