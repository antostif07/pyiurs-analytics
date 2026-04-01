"use client"

import React, { useMemo, useState } from 'react'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, SortingState } from "@tanstack/react-table"
import { ArrowUpDown, ArrowRight, ArrowDownLeft, ArrowUpRight, Box } from "lucide-react"

export default function StockFlowClient({ data }: { data: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "categoryName",
      header: "Catégorie POS",
      cell: ({ row }) => <span className="font-bold text-slate-900">{row.getValue("categoryName")}</span>,
    },
    {
      accessorKey: "openingStock",
      header: "Stock Ouverture",
      cell: ({ row }) => (
        <div className="bg-slate-100 p-2 rounded text-center font-semibold">
          {row.getValue("openingStock")}
        </div>
      ),
    },
    {
      accessorKey: "inboundStock",
      header: () => <span className="text-emerald-600 flex items-center gap-1"><ArrowDownLeft className="h-3 w-3"/> Entrées</span>,
      cell: ({ row }) => <span className="text-emerald-600 font-bold">+{row.getValue("inboundStock")}</span>,
    },
    {
      accessorKey: "soldStock",
      header: () => <span className="text-rose-600 flex items-center gap-1"><ArrowUpRight className="h-3 w-3"/> Ventes</span>,
      cell: ({ row }) => <span className="text-rose-600 font-bold">-{row.getValue("soldStock")}</span>,
    },
    {
      accessorKey: "closingStock",
      header: "Stock Fermeture",
      cell: ({ row }) => (
        <div className="bg-blue-600 text-white p-2 rounded text-center font-bold">
          {row.getValue("closingStock")}
        </div>
      ),
    },
    {
        accessorKey: "delta",
        header: "Variation",
        cell: ({ row }) => {
            const diff = (row.original.closingStock - row.original.openingStock);
            return (
                <span className={diff >= 0 ? "text-emerald-500" : "text-rose-500"}>
                    {diff > 0 ? "+" : ""}{diff}
                </span>
            )
        }
    }
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 border-b border-slate-200">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th key={header.id} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}