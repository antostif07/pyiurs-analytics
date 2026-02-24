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

export function FemmeTrendTable({ data, months }: { data: any[], months: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    columnHelper.accessor('hs_code', {
      header: 'IMAGE',
      cell: i => {
        const hs = i.getValue();
        const color = i.row.original.color;
        
        const imgUrl = `https://images.pyiurs.com/images/${hs}_${color}.jpg`;
        
        return (
          <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
            <ProductImage src={imgUrl} alt={i.row.original.name} />
          </div>
        );
      },
    }),
    columnHelper.accessor('name', {
      header: 'MODÈLE FEMME',
      cell: i => (
        <div className="min-w-45">
          <p className="font-black text-slate-900 text-[11px] uppercase italic leading-tight">{i.getValue()}</p>
          <p className="text-[9px] text-gray-400 mt-1">
            REF: <span className="font-mono text-indigo-500">{i.row.original.hs_code}</span> 
            {i.row.original.color && <span> • {i.row.original.color}</span>}
          </p>
        </div>
      )
    }),

    ...months.map((m, idx) => 
      columnHelper.accessor((row) => row.monthlySales?.[m.key] ?? 0, {
        id: m.key,
        header: ({ column }) => (
            <button onClick={() => column.toggleSorting()} className="flex items-center justify-end gap-1 uppercase hover:text-indigo-500 transition-colors w-full text-[9px] font-black">
                {m.label} <ArrowUpDown size={10} />
            </button>
        ),
        cell: i => {
          const val = i.getValue();
          const isLastMonth = idx === months.length - 1;
          return (
            <div className={`text-right font-bold ${isLastMonth ? 'text-indigo-600 font-black scale-110' : 'text-slate-400'}`}>
              {val > 0 ? `$ ${Math.round(val).toLocaleString()}` : '—'}
            </div>
          );
        },
        sortingFn: "alphanumeric",
      })
    ),

    columnHelper.accessor((row) => 
        Object.values(row.monthlySales || {}).reduce((a: any, b: any) => a + (Number(b) || 0), 0), 
    {
      id: 'total',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center justify-end gap-1 uppercase hover:text-indigo-500 transition-colors w-full text-[9px] font-black">
            TOTAL 6M <ArrowUpDown size={10} />
        </button>
      ),
      cell: i => (
        <div className="text-right font-black text-white bg-slate-900 py-1 rounded-md px-2 text-xs">
            $ {Math.round(i.getValue() as number).toLocaleString()}
        </div>
      ),
      sortingFn: "alphanumeric",
    }),
    columnHelper.accessor('currentStock', {
        header: ({ column }) => (
            <button onClick={() => column.toggleSorting()} className="flex items-center justify-center gap-1 uppercase w-full text-[9px] font-black">
            STOCK <ArrowUpDown size={10} />
            </button>
        ),
        cell: i => {
            const stock = i.getValue();
            return (
            <div className="flex justify-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                stock <= 0 
                ? 'bg-rose-100 text-rose-600 border border-rose-200' 
                : 'bg-slate-100 text-slate-600'
                }`}>
                {stock}
                </span>
            </div>
            );
        },
        sortingFn: "alphanumeric",
    }),
  ], [months]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 12 } }
  });

  return (
    <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest border-r border-slate-100 last:border-none">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-indigo-50/5 transition-colors group">
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
      
      {/* Pagination */}
      <div className="p-4 bg-slate-50/50 flex items-center justify-between border-t">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 w-8 p-0 rounded-xl"><ChevronLeft size={14}/></Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 w-8 p-0 rounded-xl"><ChevronRight size={14}/></Button>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </span>
      </div>
    </div>
  );
}