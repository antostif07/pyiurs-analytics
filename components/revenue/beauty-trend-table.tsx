'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, getCoreRowModel, getSortedRowModel, 
  flexRender, createColumnHelper, SortingState, getPaginationRowModel 
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import ProductImage from "@/app/marketing/components/ProductImage";
import { Button } from '@/components/ui/button';

const columnHelper = createColumnHelper<any>();

export function BeautyTrendTable({ data, months }: { data: any[], months: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    columnHelper.accessor('hs_code', {
      header: '',
      cell: i => (
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
          <ProductImage 
            src={`https://images.pyiurs.com/images/${i.getValue()}_.jpg`} 
            alt={i.row.original.name} 
          />
        </div>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'PRODUIT',
      cell: i => (
        <div className="min-w-37.5">
          <p className="font-bold text-slate-900 text-[11px] uppercase leading-tight">{i.getValue()}</p>
          <p className="text-[9px] text-slate-400 font-mono italic">{i.row.original.hs_code}</p>
        </div>
      )
    }),
    // COLONNES DYNAMIQUES POUR LES 6 MOIS
    ...months.map((m, idx) => 
      columnHelper.accessor((row) => row.monthlySales?.[m.key] ?? 0, { // Fonction accessor pour garantir un nombre
        id: m.key, // ID unique pour le tri
        header: ({ column }) => (
            <button 
                onClick={() => column.toggleSorting()} 
                className="flex items-center justify-end gap-1 uppercase hover:text-emerald-400 transition-colors w-full"
            >
                {m.label} <ArrowUpDown size={10} />
            </button>
        ),
        cell: i => {
          const val = i.getValue();
          const isLastMonth = idx === months.length - 1;
          return (
            <div className={`text-right font-bold ${isLastMonth ? 'text-emerald-600 font-black' : 'text-slate-500'}`}>
              {val > 0 ? `$ ${Math.round(val).toLocaleString()}` : '—'}
            </div>
          );
        },
        sortingFn: "alphanumeric", // Force le tri numérique/alphanumérique
      })
    ),
    // TOTAL CUMULÉ 6 MOIS
    columnHelper.accessor((row) => 
        Object.values(row.monthlySales || {}).reduce((a: any, b: any) => a + (Number(b) || 0), 0), 
    {
      id: 'total',
      header: ({ column }) => (
        <button 
            onClick={() => column.toggleSorting()} 
            className="flex items-center justify-end gap-1 uppercase hover:text-emerald-400 transition-colors w-full"
        >
            TOTAL 6M <ArrowUpDown size={10} />
        </button>
      ),
      cell: i => (
        <div className="text-right font-black text-slate-900 bg-slate-50 py-1 rounded-lg px-2">
            $ {Math.round(i.getValue() as number).toLocaleString()}
        </div>
      ),
      sortingFn: "alphanumeric",
    })
  ], [months]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  });

  return (
    <div className="bg-white rounded-4xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px] border-collapse">
          <thead className="bg-slate-800 text-white">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700 last:border-none">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-rose-50/5 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 border-r border-slate-50 last:border-none">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination ultra-compacte */}
      <div className="p-3 bg-slate-50 flex items-center justify-between border-t">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-7 w-7 p-0"><ChevronLeft size={14}/></Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-7 w-7 p-0"><ChevronRight size={14}/></Button>
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase">Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
      </div>
    </div>
  );
}