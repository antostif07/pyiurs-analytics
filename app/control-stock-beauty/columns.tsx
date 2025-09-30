'use client'

import { ColumnDef } from "@tanstack/react-table";
import { ControlStockBeautyModel } from "../types/ControlStockBeautyModel";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

export const controlStockBeautyColumns: ColumnDef<ControlStockBeautyModel>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nom
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "product_qty",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Achts
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "qty_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Recu
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    // cell: info => info.getValue(),
  },
  {
    accessorKey: "not_received",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rlq
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ getValue }) => {
      const value = getValue<number>();
      return (
        <span className={value > 0 ? "bg-red-500 text-white px-2 py-1 rounded" : ""}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "qty_sold",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Vendu
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    // cell: info => info.getValue(),
  },
  {
    accessorKey: "qty_available",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Dispo
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    // cell: info => info.getValue(),
  }
]
//   {
//     accessorKey: "default_code",
//     header: "Code Produit",
//     cell: info => info.getValue(),
//   },
//   {