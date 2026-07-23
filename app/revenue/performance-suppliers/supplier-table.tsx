"use client";

import { useState, useMemo } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    SortingState,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table";
import { SupplierMonthlyPerformance } from "./supplier-helpers";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Package,
    Building2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    ChevronLeft,
    ChevronRight,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        { id: "totalSales", desc: true },
    ]);

    // ✅ Configuration de la pagination TanStack Table
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const tableColumns = useMemo<ColumnDef<SupplierMonthlyPerformance>[]>(() => {
        // 1. Fournisseur
        const supplierCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "supplierName",
            accessorKey: "supplierName",
            header: "Fournisseur / Marque",
            cell: ({ row }) => (
                <div className="flex items-center gap-2.5 font-medium">
                    <span className="text-[10px] text-muted-foreground/50 font-mono w-4 shrink-0 text-right">
                        {row.index + 1}.
                    </span>
                    <span className="truncate max-w-[180px] font-semibold text-xs text-foreground" title={row.original.supplierName}>
                        {row.original.supplierName}
                    </span>
                </div>
            ),
        };

        // 2. Stock
        const stockCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "currentStockQty",
            accessorKey: "currentStockQty",
            header: "Stock",
            cell: ({ getValue }) => (
                <div className="inline-flex items-center justify-end gap-1 font-mono text-xs text-muted-foreground">
                    <Package className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    <span>{(getValue<number>() || 0).toLocaleString("fr-FR")}</span>
                </div>
            ),
        };

        // 3. Colonnes mensuelles (Achat, Vente, Coût, Marge %)
        const monthCols: ColumnDef<SupplierMonthlyPerformance>[] = columns.map((col) => ({
            id: col.key,
            accessorFn: (row) => row.monthlySales[col.key] || 0,
            header: col.label,
            cell: ({ row }) => {
                const sales = row.original.monthlySales[col.key] || 0;
                const purchases = row.original.monthlyPurchases[col.key] || 0;
                const cost = row.original.monthlyCost[col.key] || 0;

                const margin = sales > 0 ? Math.round(((sales - cost) / sales) * 100) : 0;

                if (sales === 0 && purchases === 0) {
                    return <span className="text-muted-foreground/30 font-mono text-xs">—</span>;
                }

                return (
                    <div className="flex flex-col items-end gap-0.5 text-right font-mono">
                        {/* Ligne Vente POS + Marge % */}
                        <div className="flex items-center gap-1">
                            <span className="text-foreground font-bold text-xs">{formatUSD(sales)}</span>
                            {sales > 0 && (
                                <span className={cn(
                                    "text-[9px] font-bold px-1 rounded",
                                    margin >= 30 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                                )}>
                                    {margin}%
                                </span>
                            )}
                        </div>
                        {/* Subline Achats & Coût des Ventes */}
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 font-light">
                            <span>Ach: <strong className="text-foreground/80">{formatUSD(purchases)}</strong></span>
                            <span>•</span>
                            <span>Coût: {formatUSD(cost)}</span>
                        </div>
                    </div>
                );
            },
        }));

        // 4. Total 3 mois
        const total3MCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "sales3M",
            accessorKey: "sales3M",
            header: "Total 3M ($)",
            cell: ({ row }) => {
                const sales = row.original.sales3M;
                const purchases = row.original.purchases3M;
                const cost = row.original.cost3M;
                const margin = row.original.marginPercent3M;

                return (
                    <div className="flex flex-col items-end gap-0.5 font-mono text-right">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-foreground text-xs">{formatUSD(sales)}</span>
                            {sales > 0 && (
                                <span className="text-[9px] font-bold px-1 rounded bg-primary/10 text-primary">
                                    {margin}%
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-light">
                            <span>Ach: {formatUSD(purchases)}</span>
                            <span>•</span>
                            <span>Coût: {formatUSD(cost)}</span>
                        </div>
                    </div>
                );
            },
        };

        // 5. CA Total 6M (Extrême droite)
        const total6MCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "totalSales",
            accessorKey: "totalSales",
            header: "CA Total 6M ($)",
            cell: ({ row }) => {
                const sales = row.original.totalSales;
                const purchases = row.original.totalPurchases;
                const cost = row.original.totalCost;
                const margin = row.original.totalMarginPercent;

                return (
                    <div className="flex flex-col items-end gap-0.5 font-mono text-right">
                        <div className="flex items-center gap-1">
                            <span className="font-extrabold text-primary text-xs">{formatUSD(sales)}</span>
                            <Badge className="text-[8px] bg-primary text-primary-foreground font-bold h-3.5 px-1 border-none">
                                {margin}%
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-primary/80 font-medium">
                            <span>Ach: {formatUSD(purchases)}</span>
                            <span>•</span>
                            <span>Coût: {formatUSD(cost)}</span>
                        </div>
                    </div>
                );
            },
        };

        return [supplierCol, stockCol, ...monthCols, total3MCol, total6MCol];
    }, [columns]);

    const table = useReactTable({
        data: suppliers,
        columns: tableColumns,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    if (!suppliers || suppliers.length === 0) {
        return (
            <div className="text-center py-16 px-4 bg-card rounded-2xl border border-border border-dashed">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                <h3 className="text-sm font-semibold text-foreground">Aucun fournisseur trouvé</h3>
            </div>
        );
    }

    // Totaux Généraux Consolidés
    const totalSalesAll = suppliers.reduce((sum, s) => sum + s.totalSales, 0);
    const totalPurchasesAll = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
    const totalCostAll = suppliers.reduce((sum, s) => sum + s.totalCost, 0);
    const totalStockAll = suppliers.reduce((sum, s) => sum + s.currentStockQty, 0);
    const globalMarginPercent = totalSalesAll > 0
        ? Math.round(((totalSalesAll - totalCostAll) / totalSalesAll) * 100)
        : 0;

    return (
        <div className="w-full bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden transition-colors duration-150 space-y-0">

            {/* 1. Mini Bandeau Légende & Informations */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-muted/20 border-b border-border/80 text-xs">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        Performance Fournisseurs Externes
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                        {suppliers.length} Fournisseurs
                    </Badge>
                </div>

                {/* Légende explicative */}
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-light">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-foreground" /> Ventes POS ($)
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary" /> Achats Bons de Commande ($)
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Marge Brute %
                    </span>
                </div>
            </div>

            {/* 2. Composant de Tableau Shadcn UI */}
            <div className="overflow-x-auto scrollbar-thin">
                <Table className="w-full text-left text-xs border-collapse">
                    <TableHeader className="bg-muted/40 border-b border-border">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    const isSorted = header.column.getIsSorted();
                                    const canSort = header.column.getCanSort();
                                    const isTotal6MCol = header.id === "totalSales";
                                    const isTotal3MCol = header.id === "sales3M";

                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={`py-3 px-4 uppercase text-[9px] tracking-widest font-bold select-none ${header.id === "supplierName" ? "text-left min-w-[200px]" : "text-right min-w-[130px]"
                                                } ${isTotal3MCol ? "bg-muted/30 border-l border-border/40" : ""} ${isTotal6MCol ? "bg-primary/5 text-primary border-l border-border/40 font-black" : ""
                                                }`}
                                        >
                                            {canSort ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group outline-none",
                                                        header.id !== "supplierName" && "justify-end w-full"
                                                    )}
                                                >
                                                    <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                                    {isSorted === "asc" ? (
                                                        <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                                                    ) : isSorted === "desc" ? (
                                                        <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 text-muted-foreground/30 group-hover:text-foreground shrink-0" />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(header.column.columnDef.header, header.getContext())
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody className="divide-y divide-border/40">
                        {table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                                {row.getVisibleCells().map((cell) => {
                                    const isTotal6MCol = cell.column.id === "totalSales";
                                    const isTotal3MCol = cell.column.id === "sales3M";

                                    return (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                "py-2.5 px-4",
                                                cell.column.id === "supplierName" ? "text-left" : "text-right",
                                                isTotal3MCol && "bg-muted/20 border-l border-border/40",
                                                isTotal6MCol && "bg-primary/5 border-l border-border/40"
                                            )}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableBody>

                    {/* Pied de tableau (Total Général) */}
                    <TableFooter className="bg-muted/50 font-bold border-t-2 border-border">
                        <TableRow className="hover:bg-transparent">
                            <TableCell className="py-3.5 px-4 uppercase text-[10px] font-bold text-foreground">
                                Total Consolidation ({suppliers.length})
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                                {totalStockAll.toLocaleString("fr-FR")}
                            </TableCell>

                            {/* Totaux mensuels */}
                            {columns.map((col) => {
                                const sales = suppliers.reduce((sum, s) => sum + (s.monthlySales[col.key] || 0), 0);
                                const purchases = suppliers.reduce((sum, s) => sum + (s.monthlyPurchases[col.key] || 0), 0);
                                const cost = suppliers.reduce((sum, s) => sum + (s.monthlyCost[col.key] || 0), 0);
                                const margin = sales > 0 ? Math.round(((sales - cost) / sales) * 100) : 0;

                                return (
                                    <TableCell key={col.key} className="py-3.5 px-4 text-right font-mono">
                                        <div className="flex flex-col items-end gap-0.5 leading-tight">
                                            <div className="flex items-center gap-1">
                                                <span className="text-foreground font-semibold text-xs">{formatUSD(sales)}</span>
                                                {sales > 0 && <span className="text-[9px] text-emerald-600 font-bold">{margin}%</span>}
                                            </div>
                                            <span className="text-[9px] text-muted-foreground font-light">Ach: {formatUSD(purchases)}</span>
                                        </div>
                                    </TableCell>
                                );
                            })}

                            {/* Total 3M */}
                            <TableCell className="py-3.5 px-4 text-right font-mono bg-muted/40 border-l border-border/60">
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-foreground font-bold text-xs">
                                        {formatUSD(suppliers.reduce((s, x) => s + x.sales3M, 0))}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground font-light">
                                        Ach: {formatUSD(suppliers.reduce((s, x) => s + x.purchases3M, 0))}
                                    </span>
                                </div>
                            </TableCell>

                            {/* CA Total 6M (Extrême droite) */}
                            <TableCell className="py-3.5 px-4 text-right font-mono bg-primary/10 border-l border-border/60">
                                <div className="flex flex-col items-end gap-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className="text-primary font-black text-xs">{formatUSD(totalSalesAll)}</span>
                                        <span className="text-[9px] bg-primary text-primary-foreground font-bold px-1 rounded">{globalMarginPercent}%</span>
                                    </div>
                                    <span className="text-[9px] text-primary/80 font-medium">Ach: {formatUSD(totalPurchasesAll)}</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* 3. Bandeau de Pagination Shadcn UI */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3 bg-muted/20 border-t border-border/80">
                <div className="text-xs text-muted-foreground font-light">
                    Affichage de{" "}
                    <strong className="text-foreground font-medium">
                        {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                    </strong>{" "}
                    à{" "}
                    <strong className="text-foreground font-medium">
                        {Math.min(
                            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                            suppliers.length
                        )}
                    </strong>{" "}
                    sur <strong className="text-foreground font-medium">{suppliers.length}</strong> fournisseurs
                </div>

                <div className="flex items-center gap-2">
                    {/* Sélection du nombre de lignes par page */}
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                    >
                        {[10, 25, 50, 100].map((pageSize) => (
                            <option key={pageSize} value={pageSize}>
                                {pageSize} par page
                            </option>
                        ))}
                    </select>

                    {/* Boutons Suivant / Précédent */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="text-xs font-mono font-medium px-2">
                        Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}