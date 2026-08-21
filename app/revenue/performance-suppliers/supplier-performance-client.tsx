"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { getSupplierPerformanceData } from "./supplier-actions";
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
    Download,
    Loader2,
    RotateCw,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Loader from "@/components/loader";

interface SupplierPerformanceClientProps {
    month: string;
    year: string;
}

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export function SupplierPerformanceClient({ month, year }: SupplierPerformanceClientProps) {
    const [isExporting, setIsExporting] = useState(false);

    // TanStack Query conserve toute sa puissance technique en coulisses sans rien afficher à l'utilisateur
    const {
        data,
        isPending,
        isFetching,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["supplier-performance", month, year],
        queryFn: () => getSupplierPerformanceData(month, year),
        staleTime: 1000 * 60 * 30, // 30 minutes de cache
        gcTime: 1000 * 60 * 60 * 2,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const suppliers = data?.suppliers || [];
    const columns = data?.columns || [];

    const [sorting, setSorting] = useState<SortingState>([
        { id: "totalSales", desc: true },
    ]);

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // Exportation Excel
    const handleExportExcel = async () => {
        if (!suppliers.length) return;

        try {
            setIsExporting(true);
            const XLSX = await import("xlsx");

            const exportData = suppliers.map((s, index) => {
                const row: Record<string, string | number> = {
                    "#": index + 1,
                    "Fournisseur / Marque": s.supplierName,
                    "Stock En Magasin (Unités)": s.currentStockQty,
                    "Ventes 3 Derniers Mois ($)": Math.round(s.sales3M),
                    "Achats 3 Derniers Mois ($)": Math.round(s.purchases3M),
                    "Marge Brute 3M (%)": `${s.marginPercent3M}%`,
                    "Chiffre d'Affaires 6M ($)": Math.round(s.totalSales),
                    "Achats Totaux 6M ($)": Math.round(s.totalPurchases),
                    "Marge Brute 6M (%)": `${s.totalMarginPercent}%`,
                };

                columns.forEach((col) => {
                    const sales = s.monthlySales[col.key] || 0;
                    const purchases = s.monthlyPurchases[col.key] || 0;
                    row[`Ventes ${col.label}`] = Math.round(sales);
                    row[`Achats ${col.label}`] = Math.round(purchases);
                });

                return row;
            });

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            worksheet["!cols"] = [
                { wch: 4 }, { wch: 30 }, { wch: 22 },
                { wch: 22 }, { wch: 22 }, { wch: 18 },
                { wch: 22 }, { wch: 20 }, { wch: 18 },
                ...columns.flatMap(() => [{ wch: 16 }, { wch: 16 }])
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport Performance Marques");

            const fileName = `Performance_Fournisseurs_${year}_${month}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        } catch (err) {
            console.error("[EXCEL_EXPORT_ERROR] Échec lors de la génération du fichier Excel:", err);
        } finally {
            setIsExporting(false);
        }
    };

    // Définition des colonnes orientées Métier
    const tableColumns = useMemo<ColumnDef<SupplierMonthlyPerformance>[]>(() => {
        const supplierCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "supplierName",
            accessorKey: "supplierName",
            header: "Fournisseur / Marque",
            cell: ({ row }) => (
                <div className="flex items-center gap-2 font-medium">
                    <span className="text-[10px] text-muted-foreground/50 font-mono w-4 shrink-0 text-right">
                        {row.index + 1}.
                    </span>
                    <span className="truncate max-w-[170px] sm:max-w-[220px] font-semibold text-xs text-foreground" title={row.original.supplierName}>
                        {row.original.supplierName}
                    </span>
                </div>
            ),
        };

        const stockCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "currentStockQty",
            accessorKey: "currentStockQty",
            header: "Stock Disponible",
            cell: ({ getValue }) => (
                <div className="inline-flex items-center justify-end gap-1 font-mono text-xs text-muted-foreground">
                    <Package className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    <span>{(getValue<number>() || 0).toLocaleString("fr-FR")} <span className="text-[10px] text-muted-foreground/60">unités</span></span>
                </div>
            ),
        };

        const total3MCol: ColumnDef<SupplierMonthlyPerformance> = {
            id: "sales3M",
            accessorKey: "sales3M",
            header: "Cumul 3 Mois ($)",
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
                                <span className="text-[9px] font-bold px-1 rounded bg-muted text-foreground" title="Marge brute globale sur 3 mois">
                                    {margin}%
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-light">
                            <span>Achats: {formatUSD(purchases)}</span>
                            <span>•</span>
                            <span>Coût: {formatUSD(cost)}</span>
                        </div>
                    </div>
                );
            },
        };

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
                            <Badge className="text-[8px] bg-primary text-primary-foreground font-bold h-3.5 px-1 border-none" title="Taux de marge brute globale 6 mois">
                                {margin}%
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] text-primary/80 font-medium">
                            <span>Achats: {formatUSD(purchases)}</span>
                            <span>•</span>
                            <span>Coût: {formatUSD(cost)}</span>
                        </div>
                    </div>
                );
            },
        };

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
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 font-light">
                            <span>Achats: <strong className="text-foreground/80">{formatUSD(purchases)}</strong></span>
                            <span>•</span>
                            <span>Coût: {formatUSD(cost)}</span>
                        </div>
                    </div>
                );
            },
        }));

        return [supplierCol, stockCol, total3MCol, total6MCol, ...monthCols];
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

    // ------------------------------------------------------------------
    // ÉTATS UX DE CHARGEMENT ET D'ERREUR (SANS JARGON TECHNIQUE)
    // ------------------------------------------------------------------
    if (isPending) {
        return <Loader placeholder="Chargement des indicateurs de vente et de stock..." />;
    }

    if (isError) {
        return (
            <div className="p-8 text-center bg-card border border-border rounded-2xl shadow-sm space-y-4">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Données temporairement indisponibles</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                        Nous n'avons pas pu charger les données de performance pour cette période. Veuillez réessayer ou contacter le support.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="cursor-pointer">
                    Actualiser la page
                </Button>
            </div>
        );
    }

    // Totaux Consolidés
    const totalSalesAll = suppliers.reduce((sum, s) => sum + s.totalSales, 0);
    const totalPurchasesAll = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);
    const totalCostAll = suppliers.reduce((sum, s) => sum + s.totalCost, 0);
    const totalStockAll = suppliers.reduce((sum, s) => sum + s.currentStockQty, 0);
    const totalSales3MAll = suppliers.reduce((s, x) => s + x.sales3M, 0);
    const totalPurchases3MAll = suppliers.reduce((s, x) => s + x.purchases3M, 0);

    const globalMarginPercent = totalSalesAll > 0
        ? Math.round(((totalSalesAll - totalCostAll) / totalSalesAll) * 100)
        : 0;

    return (
        <div className="w-full bg-card text-card-foreground border border-border rounded-2xl shadow-sm overflow-hidden transition-colors duration-150">
            {/* Header / Bandeau de synthèse */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-muted/20 border-b border-border/80 text-xs">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                        Synthèse des Marques Partenaires
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary">
                        {suppliers.length} Marques
                    </Badge>
                </div>

                <div className="flex items-center gap-2">
                    {/* Bouton d'actualisation orienté métier */}
                    <Button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        size="sm"
                        variant="ghost"
                        title="Actualiser les ventes et stocks récents"
                        className="h-8 gap-1.5 text-xs font-normal text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <RotateCw className={cn("w-3.5 h-3.5", isFetching && "animate-spin text-primary")} />
                        <span className="hidden sm:inline">{isFetching ? "Mise à jour..." : "Actualiser"}</span>
                    </Button>

                    {/* Bouton Export Excel */}
                    <Button
                        onClick={handleExportExcel}
                        disabled={isExporting || suppliers.length === 0}
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 text-xs font-medium cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                    >
                        {isExporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Download className="w-3.5 h-3.5" />
                        )}
                        <span>{isExporting ? "Génération..." : "Exporter en Excel"}</span>
                    </Button>
                </div>
            </div>

            {/* Zone de Tableau */}
            <div className="max-h-[65vh] overflow-auto scrollbar-thin relative">
                <Table className="w-full text-left text-xs border-collapse">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                                {headerGroup.headers.map((header) => {
                                    const isSorted = header.column.getIsSorted();
                                    const canSort = header.column.getCanSort();
                                    const isFirstCol = header.id === "supplierName";
                                    const isTotal6MCol = header.id === "totalSales";
                                    const isTotal3MCol = header.id === "sales3M";

                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                "sticky top-0 h-11 py-3 px-4 uppercase text-[9px] tracking-widest font-bold select-none bg-muted/95 backdrop-blur-md border-b border-border",
                                                isFirstCol
                                                    ? "left-0 z-30 text-left min-w-[200px] border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                                                    : "z-20 text-right min-w-[130px]",
                                                isTotal3MCol && "bg-muted border-l border-border/40",
                                                isTotal6MCol && "bg-primary/15 text-primary border-l border-border/40 font-black"
                                            )}
                                        >
                                            {canSort ? (
                                                <button
                                                    type="button"
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer group outline-none",
                                                        !isFirstCol && "justify-end w-full"
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
                                    const isFirstCol = cell.column.id === "supplierName";
                                    const isTotal6MCol = cell.column.id === "totalSales";
                                    const isTotal3MCol = cell.column.id === "sales3M";

                                    return (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                "py-2.5 px-4",
                                                isFirstCol
                                                    ? "sticky left-0 z-10 bg-card group-hover:bg-muted/40 transition-colors text-left border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
                                                    : "text-right",
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

                    {/* Pied de tableau / Totaux Généraux */}
                    <TableFooter className="sticky bottom-0 z-20 bg-muted/95 backdrop-blur-md font-bold border-t-2 border-border">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell className="sticky left-0 z-30 bg-muted/95 py-3.5 px-4 uppercase text-[10px] font-bold text-foreground border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                Consolidation Globale ({suppliers.length})
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                                {totalStockAll.toLocaleString("fr-FR")}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-mono bg-muted/40 border-l border-border/60">
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-foreground font-bold text-xs">{formatUSD(totalSales3MAll)}</span>
                                    <span className="text-[9px] text-muted-foreground font-light">Achats: {formatUSD(totalPurchases3MAll)}</span>
                                </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-right font-mono bg-primary/10 border-l border-border/60">
                                <div className="flex flex-col items-end gap-0.5">
                                    <div className="flex items-center gap-1">
                                        <span className="text-primary font-black text-xs">{formatUSD(totalSalesAll)}</span>
                                        <span className="text-[9px] bg-primary text-primary-foreground font-bold px-1 rounded">{globalMarginPercent}%</span>
                                    </div>
                                    <span className="text-[9px] text-primary/80 font-medium">Achats: {formatUSD(totalPurchasesAll)}</span>
                                </div>
                            </TableCell>

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
                                            <span className="text-[9px] text-muted-foreground font-light">Achats: {formatUSD(purchases)}</span>
                                        </div>
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>

            {/* Navigation / Pagination */}
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
                    sur <strong className="text-foreground font-medium">{suppliers.length}</strong> marques
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                        {[10, 25, 50, 100].map((pageSize) => (
                            <option key={pageSize} value={pageSize}>
                                {pageSize} par page
                            </option>
                        ))}
                    </select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 w-8 p-0 cursor-pointer"
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
                        className="h-8 w-8 p-0 cursor-pointer"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}