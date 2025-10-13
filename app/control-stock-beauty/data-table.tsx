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

  // Fonction pour obtenir les produits individuels directement depuis les données
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getIndividualProducts = (row: any): IndividualProductModel[] => {
    if (row.individualProducts && Array.isArray(row.individualProducts)) {
      return row.individualProducts;
    }
    return [];
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRowId = (row: any): string => {
    if (row.hs_code) return row.hs_code;
    if (row.id) return String(row.id);
    return String(Math.random());
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasIndividualProducts = (row: any): boolean => {
    const individualProducts = getIndividualProducts(row);
    return individualProducts && individualProducts.length > 0;
  };

  // Fonction pour formater une cellule individuelle en utilisant la même logique que les colonnes
  const renderIndividualCell = (product: IndividualProductModel, columnId: string) => {
    switch (columnId) {
      case "name":
        return (
          <div className="flex flex-col pl-6">
            <span className="font-medium text-sm">{product.name}</span>
            <span className="text-xs text-gray-500">Variant ID: {product.productVariantId}</span>
          </div>
        );

      case "brand":
        return product.brand;

      case "color":
        return product.color;

      case "qty_available":
      case "total_stock":
        const value = product.total_stock;
        let bgColor = "bg-gray-100";
        if (value === 0) bgColor = "bg-black text-white";
        else if (value <= 5) bgColor = "bg-red-100 text-red-800";
        else if (value <= 11) bgColor = "bg-yellow-100 text-yellow-800";
        else bgColor = "bg-green-100 text-green-800";
        
        return (
          <div className={`text-right font-semibold px-2 py-1 rounded ${bgColor}`}>
            {value}
          </div>
        );

      case "stock_P24":
        return <div className="text-right">{product.stock_P24}</div>;

      case "stock_ktm":
        return <div className="text-right">{product.stock_ktm}</div>;

      case "stock_mto":
        return <div className="text-right">{product.stock_mto}</div>;

      case "stock_onl":
        return <div className="text-right">{product.stock_onl}</div>;

      case "stock_dc":
        return <div className="text-right">{product.stock_dc}</div>;

      case "stock_other":
        return <div className="text-right">{product.stock_other}</div>;

      case "sales_last_30_days":
        return <div className="text-right">{product.sales_last_30_days}</div>;

      case "last_sale_date":
        return product.last_sale_date 
          ? new Date(product.last_sale_date).toLocaleDateString('fr-FR')
          : '-';

      // Pour les colonnes qui n'ont pas de données individuelles (commandé, reçu, etc.)
      case "product_qty":
      case "qty_received":
      case "not_received":
      case "qty_sold":
      case "daily_sales_rate":
      case "days_until_out_of_stock":
      case "estimated_out_of_stock_date":
      case "recommended_reorder_date":
        return <div className="text-right">-</div>;

      default:
        return '-';
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                            className="bg-muted/30 hover:bg-muted/40 border-t border-muted/20"
                          >
                            <TableCell className="w-12">
                              <div className="flex justify-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                            </TableCell>

                            {/* Utiliser les mêmes colonnes que le parent */}
                            {row.getVisibleCells().map((cell) => {
                              const columnId = cell.column.id;
                              return (
                                <TableCell key={`${rowId}-${product.id}-${columnId}`} className="text-sm">
                                  {renderIndividualCell(product, columnId)}
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