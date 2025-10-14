/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { ControlStockBeautyModel, IndividualProductModel } from "../types/ControlStockBeautyModel"

interface ExpandableDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function ExpandableDataTable<TData, TValue>({
  columns,
  data,
}: ExpandableDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const getIndividualProducts = (row: any): IndividualProductModel[] => {
    if (row.individualProducts && Array.isArray(row.individualProducts)) {
      return row.individualProducts;
    }
    return [];
  };

  const getRowId = (row: any): string => {
    if (row.hs_code) return row.hs_code;
    if (row.id) return String(row.id);
    return String(Math.random());
  };

  const hasIndividualProducts = (row: any): boolean => {
    const individualProducts = getIndividualProducts(row);
    return individualProducts && individualProducts.length > 0;
  };

  // Fonction utilitaire pour rendre le contenu d'une cellule individuelle
  const renderIndividualCellContent = (product: IndividualProductModel, columnId: string) => {
    switch (columnId) {
      case "name":
        return (
          <div className="pl-6 text-sm text-muted-foreground">
            <div className="font-medium">{product.name}</div>
            <div className="text-xs text-gray-500">Variant ID: {product.productVariantId}</div>
          </div>
        );
      
      case "brand":
        return <div className="text-sm text-muted-foreground">{product.brand}</div>;
      
      case "color":
        return <div className="text-sm text-muted-foreground">{product.color}</div>;
      
      case "qty_available":
      case "total_stock":
        const value = product.total_stock;
        let bgColor = "bg-gray-100";
        if (value === 0) bgColor = "bg-black text-white";
        else if (value <= 5) bgColor = "bg-red-500 text-white";
        else if (value <= 11) bgColor = "bg-yellow-500 text-black";
        else bgColor = "bg-green-500 text-white";
        
        return (
          <div className={`px-2 py-1 rounded-full text-xs font-bold text-center min-w-10 inline-block ${bgColor}`}>
            {value}
          </div>
        );
      
      case "stock_P24":
        return <div className="text-center text-sm">{product.stock_P24 || 0}</div>;
      
      case "stock_ktm":
        return <div className="text-center text-sm">{product.stock_ktm || 0}</div>;
      
      case "stock_mto":
        return <div className="text-center text-sm">{product.stock_mto || 0}</div>;
      
      case "stock_onl":
        return <div className="text-center text-sm">{product.stock_onl || 0}</div>;
      
      case "stock_dc":
        return <div className="text-center text-sm">{product.stock_dc || 0}</div>;
      
      case "stock_other":
        return <div className="text-center text-sm">{product.stock_other || 0}</div>;
      
      case "sales_last_30_days":
        return <div className="text-right text-sm">{product.sales_last_30_days || 0}</div>;
      
      case "last_sale_date":
        return product.last_sale_date 
          ? <div className="text-sm">{new Date(product.last_sale_date).toLocaleDateString('fr-FR')}</div>
          : <div className="text-sm text-gray-400">-</div>;
      
      // Pour les colonnes qui n'ont pas de données individuelles
      default:
        return <div className="text-sm text-gray-400">-</div>;
    }
  };

  return (
    <div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <TableHead className="w-12 bg-background"></TableHead>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="bg-background">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowData = row.original as any;
                const rowId = getRowId(rowData);
                const isExpanded = expandedRows.has(rowId);
                const hasChildren = hasIndividualProducts(rowData);
                const individualProducts = getIndividualProducts(rowData);

                return (
                  <React.Fragment key={row.id}>
                    {/* Ligne principale */}
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className={hasChildren ? "cursor-pointer hover:bg-muted/50" : ""}
                    >
                      <TableCell className="w-12">
                        {hasChildren ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(rowId)}
                            className="h-8 w-8 p-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <div className="w-8 h-8"></div>
                        )}
                      </TableCell>
                      
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Lignes des produits individuels */}
                    {isExpanded && hasChildren && (
                      <>
                        {individualProducts.map((product, index) => (
                          <TableRow 
                            key={`${rowId}-${product.id}`}
                            className="bg-blue-50/30 hover:bg-blue-50/50 border-t border-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 dark:border-blue-800/30"
                          >
                            <TableCell className="w-12">
                              <div className="flex justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                            </TableCell>

                            {row.getVisibleCells().map((cell) => {
                              const columnId = cell.column.id;
                              return (
                                <TableCell 
                                  key={`${rowId}-${product.id}-${columnId}`} 
                                  className="text-sm text-muted-foreground"
                                >
                                  {renderIndividualCellContent(product, columnId)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + 1} 
                  className="h-24 text-center"
                >
                  Aucun résultat trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}