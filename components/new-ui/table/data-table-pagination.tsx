// components/new-ui/table/data-table-pagination.tsx
"use client";

import type { Table } from "@tanstack/react-table";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
    /** Nombre total de lignes (pour affichage info) */
    totalRows?: number;
    /** Label du type de ligne (ex: "utilisateur", "dépense") */
    rowLabel?: string;
    className?: string;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

export function DataTablePagination<TData>({
    table,
    totalRows,
    rowLabel = "ligne",
    className,
}: DataTablePaginationProps<TData>) {
    const { pageIndex, pageSize } = table.getState().pagination;
    const pageCount = table.getPageCount();
    const total = totalRows ?? table.getFilteredRowModel().rows.length;

    const fromRow = total === 0 ? 0 : pageIndex * pageSize + 1;
    const toRow = Math.min((pageIndex + 1) * pageSize, total);

    return (
        <div
            className={cn(
                "flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-border/60",
                className,
            )}
        >
            {/* Info compteur */}
            <div className="text-[10px] text-muted-foreground/70 tabular-nums">
                {total === 0 ? (
                    <>Aucun résultat</>
                ) : (
                    <>
                        <span className="font-semibold text-foreground">
                            {fromRow}–{toRow}
                        </span>{" "}
                        sur{" "}
                        <span className="font-semibold text-foreground">
                            {total}
                        </span>{" "}
                        {rowLabel}
                        {total > 1 ? "s" : ""}
                    </>
                )}
            </div>

            {/* Contrôles */}
            <div className="flex items-center gap-2">
                {/* Page size */}
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                        Lignes
                    </span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(v) => table.setPageSize(Number(v))}
                    >
                        <SelectTrigger className="h-6 w-14 text-[10.5px] bg-secondary/60 rounded-md px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAGE_SIZES.map((s) => (
                                <SelectItem key={s} value={String(s)} className="text-xs">
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Page X / Y */}
                <span className="text-[10px] text-muted-foreground/70 tabular-nums whitespace-nowrap hidden sm:inline">
                    Page{" "}
                    <span className="font-semibold text-foreground">
                        {pageCount === 0 ? 0 : pageIndex + 1}
                    </span>{" "}
                    / {pageCount}
                </span>

                {/* Boutons nav */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Première page"
                    >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Page précédente"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Page suivante"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => table.setPageIndex(pageCount - 1)}
                        disabled={!table.getCanNextPage()}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                        aria-label="Dernière page"
                    >
                        <ChevronsRight className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}