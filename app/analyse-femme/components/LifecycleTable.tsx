"use client";

import React from "react";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel,
  flexRender, 
  createColumnHelper 
} from "@tanstack/react-table";
import { Calendar, Package, Clock } from "lucide-react";
import { HSCycleStats } from "../actions/supply-chain";

export default function LifecycleTable({ data }: { data: HSCycleStats[] }) {
  const columnHelper = createColumnHelper<HSCycleStats>();

  const columns = [
    columnHelper.accessor("hs_code", {
      header: "Code Douanier (HS)",
      cell: (info) => (
        <div>
           <div className="font-mono font-bold text-slate-700">{info.getValue()}</div>
           <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate">
             {info.row.original.product_names.join(", ")}
             {info.row.original.product_names.length >= 3 && "..."}
           </div>
        </div>
      ),
    }),
    columnHelper.accessor("first_reception", {
      header: "Première Réception",
      cell: (info) => (
        <div className="flex flex-col">
            <span className="font-medium text-slate-900">{info.getValue()}</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3"/> Il y a {info.row.original.duration_days} jours
            </span>
        </div>
      ),
    }),
    columnHelper.accessor("last_reception", {
      header: "Dernier Réassort",
      cell: (info) => <span className="text-slate-600 text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor("total_received", {
      header: "Total Reçu (Qté)",
      cell: (info) => (
        <div className="flex items-center gap-2 font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit">
            <Package className="w-4 h-4"/>
            {info.getValue()}
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-4">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                    ))}
                    </tr>
                ))}
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50">
                    {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
        {/* Pagination simple */}
        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-3 py-1 border rounded text-xs disabled:opacity-50">Précédent</button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-3 py-1 border rounded text-xs disabled:opacity-50">Suivant</button>
        </div>
    </div>
  );
}