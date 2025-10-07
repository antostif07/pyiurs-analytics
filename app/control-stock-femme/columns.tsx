'use client'

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { ControlStockFemmeModel } from "./page";

// Fonction pour déterminer la couleur en fonction du stock
function getStockColor(qty: number): string {
  if (qty <= 0) return 'bg-black text-white';
  if (qty <= 5) return 'bg-red-500 text-white';
  if (qty <= 11) return 'bg-yellow-500 text-black';
  return 'bg-green-500 text-white';
}

export const controlStockBeautyColumns: ColumnDef<ControlStockFemmeModel>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Reference
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const brand = row.original.brand;
      const color = row.original.color;
      return (
        <div className="py-2">
          <div className="font-medium text-sm">{row.getValue("name")}</div>
          <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
            <span>{brand}</span>
            {color && color !== 'Non spécifié' && (
              <>
                <span>•</span>
                <span className="text-blue-600">{color}</span>
              </>
            )}
          </div>
        </div>
      );
    },
    size: 250,
  },
  {
    accessorKey: "product_qty",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Commandé
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className="font-medium text-blue-600 text-sm">
          {value}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "qty_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Reçu
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className="font-medium text-green-600 text-sm">
          {value}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "not_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          En attente
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className={value > 0 ? "bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium" : "text-gray-400 text-sm"}>
          {value}
        </span>
      );
    },
    size: 90,
  },
  {
    accessorKey: "qty_sold",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Vendu
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className="font-medium text-purple-600 text-sm">
          {value}
        </span>
      );
    },
    size: 80,
  },
  {
    accessorKey: "qty_available",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-2 h-auto text-xs font-semibold"
        >
          Stock
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      const colorClass = getStockColor(value);
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold text-center min-w-10 inline-block ${colorClass}`}>
          {value}
        </span>
      );
    },
    size: 80,
  }
]