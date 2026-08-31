"use client";

import React, { useMemo, useState } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    ColumnDef,
    Column,
    SortingState,
    flexRender,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Calendar,
    Tag,
    Layers,
    CheckCircle2,
    AlertTriangle,
    PlusCircle,
    Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StockAuditItem, hasSoldElsewhere, getSoldLocations } from "../_lib/types";
import { AuditTableFilters, ExtendedAuditFilters } from "./AuditTableFilters";
import { SoldLocationsBadges } from "./SoldLocationsBadges";

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

function ColumnHeader({
    column,
    title,
    align = "left",
}: {
    column: Column<StockAuditItem, unknown>;
    title: string;
    align?: "left" | "center" | "right";
}) {
    const isSorted = column.getIsSorted();

    return (
        <div className={cn("flex items-center gap-1", align === "center" && "justify-center", align === "right" && "justify-end")}>
            <button
                type="button"
                onClick={() => column.toggleSorting(isSorted === "asc")}
                className="flex items-center gap-1.5 cursor-pointer font-bold uppercase hover:text-foreground transition-colors group"
            >
                <span>{title}</span>
                {isSorted === "asc" ? (
                    <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : isSorted === "desc" ? (
                    <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 text-muted-foreground/50 group-hover:text-foreground shrink-0" />
                )}
            </button>
        </div>
    );
}

interface Props {
    items: StockAuditItem[];
    isReadOnly: boolean;
    actionProcessingId: string | null;
    onForceMarkFound: (item: StockAuditItem) => void;
    counts: {
        all: number;
        scanned: number;
        remaining: number;
        sold_elsewhere: number;
    };
}

export function AuditDataTable({
    items,
    isReadOnly,
    actionProcessingId,
    onForceMarkFound,
    counts,
}: Props) {
    const [filters, setFilters] = useState<ExtendedAuditFilters>({
        searchQuery: "",
        statusFilter: "all",
        brandFilter: "all",
        colorFilter: "all",
        theoreticalStockFilter: "all",
        soldElsewhereFilter: "all",
        specificSoldLocationFilter: "all",
    });

    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

    const handleResetFilters = () => {
        setFilters({
            searchQuery: "",
            statusFilter: "all",
            brandFilter: "all",
            colorFilter: "all",
            theoreticalStockFilter: "all",
            soldElsewhereFilter: "all",
            specificSoldLocationFilter: "all",
        });
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    // Filtrage combiné multi-critères
    const filteredData = useMemo(() => {
        const query = filters.searchQuery.trim().toLowerCase();

        return items.filter((item) => {
            // 1. Recherche globale
            const brandStr = ((item as any).brand || "").toLowerCase();
            const colorStr = ((item as any).color || "").toLowerCase();
            const hsCodeStr = ((item as any).hs_code || "").toLowerCase();

            const matchText =
                query === "" ||
                item.internal_barcode.toLowerCase().includes(query) ||
                (item.product_name || "").toLowerCase().includes(query) ||
                brandStr.includes(query) ||
                colorStr.includes(query) ||
                hsCodeStr.includes(query);

            if (!matchText) return false;

            // 2. Statut Scan
            const isScanned = (item.counted_qty || 0) === 1;
            if (filters.statusFilter === "scanned" && !isScanned) return false;
            if (filters.statusFilter === "remaining" && isScanned) return false;
            if (filters.statusFilter === "sold_elsewhere" && !hasSoldElsewhere(item)) return false;

            // 3. Marque
            if (filters.brandFilter !== "all" && (item as any).brand !== filters.brandFilter) {
                return false;
            }

            // 4. Couleur
            if (filters.colorFilter !== "all" && (item as any).color !== filters.colorFilter) {
                return false;
            }

            // 5. Stock Théorique
            const theo = item.theoretical_qty ?? 0;
            if (filters.theoreticalStockFilter === "one" && theo !== 1) return false;
            if (filters.theoreticalStockFilter === "zero" && theo !== 0) return false;
            if (filters.theoreticalStockFilter === "greater_than_one" && theo <= 1) return false;
            if (filters.theoreticalStockFilter === "negative" && theo >= 0) return false;

            // 6. Vendus Ailleurs (-1)
            const soldLocs = getSoldLocations(item);
            if (filters.soldElsewhereFilter === "yes" && soldLocs.length === 0) return false;
            if (filters.soldElsewhereFilter === "no" && soldLocs.length > 0) return false;

            // 7. Filtre par Emplacement de Vente Spécifique (-1)
            if (filters.specificSoldLocationFilter !== "all") {
                const hasSpecificLoc = soldLocs.some(
                    (l) => String(l.id) === filters.specificSoldLocationFilter
                );
                if (!hasSpecificLoc) return false;
            }

            return true;
        });
    }, [items, filters]);

    // Définition des colonnes TanStack Table avec TRI SUR CHAQUE COLONNE
    const columns = useMemo<ColumnDef<StockAuditItem>[]>(
        () => [
            {
                accessorKey: "internal_barcode",
                header: ({ column }) => <ColumnHeader column={column} title="Code-barres / Date" />,
                cell: ({ row }) => {
                    const item = row.original;
                    const odooDate = (item as any).odoo_create_date;
                    return (
                        <div className="flex flex-col">
                            <span className="font-mono font-bold text-primary text-xs">
                                {item.internal_barcode}
                            </span>
                            {odooDate && (
                                <span className="text-[10px] text-muted-foreground font-light font-sans flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-2.5 h-2.5" />
                                    {format(new Date(odooDate), "dd MMM yyyy", { locale: fr })}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "product_name",
                header: ({ column }) => <ColumnHeader column={column} title="Produit / Marque / Couleur" />,
                cell: ({ row }) => {
                    const item = row.original;
                    const brand = (item as any).brand;
                    const color = (item as any).color;
                    const hsCode = (item as any).hs_code;

                    return (
                        <div className="flex flex-col gap-1">
                            <span className="font-sans font-semibold text-foreground">{item.product_name}</span>
                            <div className="flex flex-wrap items-center gap-1">
                                {brand && brand !== "N/A" && (
                                    <Badge variant="outline" className="text-[9px] font-normal border-border/80 bg-muted/20">
                                        <Tag className="w-2.5 h-2.5 mr-1 text-primary" /> {brand}
                                    </Badge>
                                )}
                                {color && color !== "N/A" && (
                                    <Badge variant="outline" className="text-[9px] font-normal border-border/80 bg-muted/20">
                                        <Layers className="w-2.5 h-2.5 mr-1 text-amber-500" /> {color}
                                    </Badge>
                                )}
                                {hsCode && hsCode !== "N/A" && (
                                    <span className="text-[9px] text-muted-foreground font-mono">HS: {hsCode}</span>
                                )}
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: "supplier_ref",
                header: ({ column }) => <ColumnHeader column={column} title="Emplacement Origine" />,
                cell: ({ row }) => (
                    <span className="font-sans text-muted-foreground font-medium text-[11px]">
                        {row.original.supplier_ref || "Stock Principal"}
                    </span>
                ),
            },
            {
                id: "sold_locations",
                accessorFn: (row) => {
                    const locs = getSoldLocations(row);
                    if (locs.length === 0) return "";
                    return locs.map((l) => `[${l.id}] ${l.name}`).join(", ");
                },
                header: ({ column }) => <ColumnHeader column={column} title="Vendu Dans Emplacement (-1)" />,
                cell: ({ row }) => <SoldLocationsBadges locations={(row.original as any).sold_locations} />,
            },
            {
                accessorKey: "theoretical_qty",
                header: ({ column }) => <ColumnHeader column={column} title="Théo." align="center" />,
                cell: ({ row }) => (
                    <div className="text-center font-mono font-bold text-muted-foreground">
                        {row.original.theoretical_qty}
                    </div>
                ),
            },
            {
                accessorKey: "counted_qty",
                header: ({ column }) => <ColumnHeader column={column} title="Statut" align="center" />,
                cell: ({ row }) => {
                    const item = row.original;
                    const isScanned = (item.counted_qty || 0) === 1;
                    const isUnexpected = item.theoretical_qty === 0 && isScanned;

                    return (
                        <div className="text-center font-sans">
                            {isUnexpected ? (
                                <Badge className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[9px] font-bold">
                                    <AlertTriangle className="w-2.5 h-2.5 mr-1 text-purple-600" /> Hors Périmètre (+1)
                                </Badge>
                            ) : isScanned ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold">
                                    <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Scanné (1/1)
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 font-medium">
                                    En Attente (0/1)
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                id: "impact",
                accessorFn: (row) => {
                    const diff = (row.counted_qty || 0) - (row.theoretical_qty || 0);
                    return diff * (Number(row.unit_cost) || 0);
                },
                header: ({ column }) => <ColumnHeader column={column} title="Impact ($)" align="right" />,
                cell: ({ row }) => {
                    const item = row.original;
                    const diff = (item.counted_qty || 0) - (item.theoretical_qty || 0);
                    const impact = diff * (Number(item.unit_cost) || 0);

                    return (
                        <div className="text-right font-mono font-bold">
                            <span className={cn(diff < 0 ? "text-rose-600" : "text-muted-foreground/60")}>
                                {formatUSD(impact)}
                            </span>
                        </div>
                    );
                },
            },
            {
                id: "actions",
                header: () => <div className="text-right">Action</div>,
                cell: ({ row }) => {
                    if (isReadOnly) return null;
                    const item = row.original;
                    const isScanned = (item.counted_qty || 0) === 1;

                    return (
                        <div className="text-right font-sans">
                            {!isScanned ? (
                                <Button
                                    onClick={() => onForceMarkFound(item)}
                                    disabled={actionProcessingId === item.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[10px] font-semibold border-emerald-600/40 text-emerald-600 hover:bg-emerald-600 hover:text-white cursor-pointer transition-all"
                                >
                                    {actionProcessingId === item.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <PlusCircle className="w-3 h-3 mr-1" />
                                    )}
                                    <span>Retrouvé (+1)</span>
                                </Button>
                            ) : (
                                <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> OK
                                </span>
                            )}
                        </div>
                    );
                },
            },
        ],
        [isReadOnly, actionProcessingId, onForceMarkFound]
    );

    const table = useReactTable({
        data: filteredData,
        columns,
        state: {
            sorting,
            pagination,
        },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="space-y-3">
            {/* BARRE DE FILTRES EXTRAITE */}
            <AuditTableFilters
                filters={filters}
                onFilterChange={setFilters}
                onResetFilters={handleResetFilters}
                items={items}
                counts={counts}
            />

            {/* TABLEAU TANSTACK TRIBALE */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <Table className="w-full text-xs">
                    <TableHeader className="bg-muted/40">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="py-3 px-4 uppercase text-[9px] font-bold tracking-wider">
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody className="divide-y divide-border/40 font-mono">
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="text-center py-8 text-muted-foreground font-sans text-xs"
                                >
                                    Aucun article ne correspond à vos filtres.
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className={cn(
                                        "transition-colors",
                                        (row.original.counted_qty || 0) === 1
                                            ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                                            : "hover:bg-muted/30"
                                    )}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-2.5 px-4">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* CONTROLES DE PAGINATION */}
            <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground font-light">
                    Page <strong>{table.getState().pagination.pageIndex + 1}</strong> sur{" "}
                    <strong>{table.getPageCount() || 1}</strong> ({filteredData.length} résultats)
                </span>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!table.getCanPreviousPage()}
                        onClick={() => table.previousPage()}
                        className="h-8 px-2.5 text-xs rounded-xl cursor-pointer"
                    >
                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Précédent
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!table.getCanNextPage()}
                        onClick={() => table.nextPage()}
                        className="h-8 px-2.5 text-xs rounded-xl cursor-pointer"
                    >
                        Suivant <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}