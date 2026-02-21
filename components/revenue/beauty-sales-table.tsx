'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, getCoreRowModel, getSortedRowModel, 
  flexRender, createColumnHelper, SortingState, getPaginationRowModel 
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImage from "@/app/marketing/components/ProductImage";
import { Button } from '@/components/ui/button';

const columnHelper = createColumnHelper<any>();

export function BeautySalesTable({ data }: { data: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalRevenue', desc: true }]);

  const columns = useMemo(() => [
    columnHelper.accessor('hs_code', {
      header: '',
      cell: i => (
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
          <ProductImage 
            src={`https://images.pyiurs.com/images/${i.getValue()}_.jpg`} 
            alt={i.row.original.name} 
          />
        </div>
      ),
    }),
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase font-black">
          Produit <ArrowUpDown size={10} />
        </button>
      ),
      cell: i => (
        <div>
          <p className="font-bold text-slate-900 text-sm italic uppercase leading-tight">{i.getValue()}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase">HS: {i.row.original.hs_code}</p>
        </div>
      )
    }),
    columnHelper.accessor('totalQty', {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="w-full text-center uppercase font-black">
          Quantité
        </button>
      ),
      cell: i => <div className="text-center font-black text-slate-700 bg-slate-50 py-1 rounded-lg">{i.getValue()}</div>
    }),
    columnHelper.accessor('totalRevenue', {
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="w-full text-right uppercase font-black">
          Revenu Total <ArrowUpDown size={10} className="inline ml-1" />
        </button>
      ),
      cell: i => <div className="text-right font-black text-rose-600 text-base">$ {Math.round(i.getValue()).toLocaleString()}</div>
    })
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-4xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-white">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-[10px] tracking-widest border-r border-slate-700 last:border-none">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-rose-50/5 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="rounded-xl h-8 w-8 p-0"><ChevronLeft size={16}/></Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="rounded-xl h-8 w-8 p-0"><ChevronRight size={16}/></Button>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
        </div>
      </div>
    </div>
  );
}