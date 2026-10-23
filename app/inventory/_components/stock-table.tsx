// app/inventory/_components/stock-table.tsx
"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  AlertCircle,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "@/components/new-ui/table/data-table-pagination";
import { useInventoryItems } from "../_lib/hooks/use-inventory-items";
import type { InventoryItemRow } from "../_lib/types";

const HEADER_BG =
  "bg-slate-900 dark:bg-slate-950 hover:bg-slate-900 dark:hover:bg-slate-950";

const fmtMoney = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " $";

const fmtInt = (n: number) => n.toLocaleString("fr-FR");

type SortId =
  | "saleValue"
  | "quantity"
  | "marginValue"
  | "productName";

export default function StockTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data, isLoading, isError } = useInventoryItems();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 25;

  const sortParam = searchParams.get("sort") ?? "saleValue_desc";

  const sorting: SortingState = useMemo(() => {
    const [id, dir] = sortParam.split("_");
    if (!id) return [];
    return [{ id, desc: dir === "desc" }];
  }, [sortParam]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, {
      scroll: false,
    });
  };

  const handleSortingChange = (updater: any) => {
    const next: SortingState =
      typeof updater === "function" ? updater(sorting) : updater;
    if (next.length === 0) {
      updateUrl({ sort: null });
    } else {
      const { id, desc } = next[0];
      updateUrl({ sort: `${id}_${desc ? "desc" : "asc"}` });
    }
  };

  const columns = useMemo<ColumnDef<InventoryItemRow>[]>(
    () => [
      {
        accessorKey: "barcode",
        header: () => "Code-barres",
        enableSorting: false,
        cell: (info) => (
          <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
            {(info.getValue() as string | null) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "productName",
        header: () => "Produit",
        enableSorting: true,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex flex-col min-w-0">
              <span
                className="text-[11px] font-medium text-foreground truncate max-w-[280px]"
                title={row.productName}
              >
                {row.productName}
              </span>
              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                {row.brand && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] font-normal text-muted-foreground bg-muted/20 border-border/60"
                  >
                    {row.brand}
                  </Badge>
                )}
                {row.color && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] font-normal text-muted-foreground bg-muted/20 border-border/60"
                  >
                    {row.color}
                  </Badge>
                )}
                {row.segment && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 text-[9px] font-normal border-primary/30 bg-primary/5 text-primary/90"
                  >
                    {row.segment}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: () => "Qté",
        enableSorting: true,
        cell: (info) => {
          const qty = info.getValue() as number;
          return (
            <span
              className={cn(
                "font-mono tabular-nums font-semibold",
                qty < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : qty === 0
                    ? "text-muted-foreground/50"
                    : "text-foreground",
              )}
            >
              {fmtInt(qty)}
            </span>
          );
        },
      },
      {
        accessorKey: "costValue",
        header: () => "Valeur coût",
        enableSorting: false,
        cell: (info) => (
          <span className="font-mono tabular-nums text-[10.5px] text-amber-700 dark:text-amber-400">
            {fmtMoney(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: "saleValue",
        header: () => "Valeur vente",
        enableSorting: true,
        cell: (info) => (
          <span className="font-mono tabular-nums font-semibold text-[10.5px] text-sky-700 dark:text-sky-400">
            {fmtMoney(info.getValue() as number)}
          </span>
        ),
      },
      {
        accessorKey: "marginValue",
        header: () => "Marge",
        enableSorting: true,
        cell: (info) => {
          const v = info.getValue() as number;
          return (
            <span
              className={cn(
                "font-mono tabular-nums font-semibold text-[10.5px]",
                v >= 0
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-rose-700 dark:text-rose-400",
              )}
            >
              {fmtMoney(v)}
            </span>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize };
      const next =
        typeof updater === "function" ? updater(current) : updater;
      updateUrl({
        page: String(next.pageIndex + 1),
        pageSize: String(next.pageSize),
      });
    },
  });

  if (isError) {
    return (
      <div className="rounded-lg border border-rose-200/60 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-4 flex items-center gap-2 text-[11px] text-rose-700 dark:text-rose-400">
        <AlertCircle className="w-4 h-4 shrink-0" />
        Erreur de chargement de la table.
      </div>
    );
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card p-6 text-center">
        <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
          Chargement des articles…
        </p>
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 border-dashed bg-card p-8 text-center">
        <Package className="mx-auto w-6 h-6 text-muted-foreground/40" />
        <h3 className="text-[12px] font-semibold text-foreground mt-2">
          Aucun article
        </h3>
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          Aucun produit en stock sur ce périmètre.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="w-full text-[11px]">
          <TableHeader className={HEADER_BG}>
            {table.getHeaderGroups().map((hg) => (
              <TableRow
                key={hg.id}
                className={cn("border-none", HEADER_BG)}
              >
                {hg.headers.map((header, idx) => {
                  const canSort =
                    header.column.getCanSort();
                  const sortDir =
                    header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "py-2 px-3 text-[10px] font-semibold text-white uppercase tracking-wider h-auto",
                        idx === 0 && "text-left min-w-[130px]",
                        idx === 1 && "text-left min-w-[280px]",
                        idx > 1 && "text-right min-w-[100px]",
                      )}
                    >
                      {canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-white/80 transition-colors"
                        >
                          {flexRender(
                            header.column
                              .columnDef.header,
                            header.getContext(),
                          )}
                          {sortDir === "asc" ? (
                            <ArrowUp className="w-2.5 h-2.5" />
                          ) : sortDir === "desc" ? (
                            <ArrowDown className="w-2.5 h-2.5" />
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef
                            .header,
                          header.getContext(),
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody className="divide-y divide-border/40">
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="hover:bg-accent/30 transition-colors border-b border-border/40"
              >
                {row.getVisibleCells().map((cell, idx) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "py-1.5 px-3",
                      idx === 0 && "text-left",
                      idx === 1 && "text-left",
                      idx > 1 && "text-right",
                    )}
                  >
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext(),
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination
        table={table}
        totalRows={total}
        rowLabel="article"
      />
    </div>
  );
}