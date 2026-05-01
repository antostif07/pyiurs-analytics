'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, getCoreRowModel, getSortedRowModel, 
  getPaginationRowModel, flexRender, createColumnHelper, SortingState 
} from '@tanstack/react-table';
import { ArrowUpDown, Building2, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const columnHelper = createColumnHelper<any>();

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

export function SupplierTrendTable({ data, months }: { data: any[], months: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    columnHelper.accessor('supplier_name', {
      header: 'FOURNISSEUR',
      cell: info => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
            <Building2 size={18} />
          </div>
          <div>
            <p className="font-black text-slate-900 text-[12px] uppercase tracking-tight">
              {info.getValue()}
            </p>
            <p className="text-[9px] text-slate-400 font-medium">Partenaire Commercial</p>
          </div>
        </div>
      )
    }),

    ...months.map((m, idx) =>
      columnHelper.accessor((row) => row.monthlySales?.[m.key] || { revenue: 0, qty: 0 }, {
        id: m.key,
        header: ({ column }) => (
          <Button 
            variant="ghost" 
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
            className="w-full text-right font-bold text-[10px] hover:text-emerald-600"
          >
            {m.label} <ArrowUpDown size={10} className="ml-1 opacity-30" />
          </Button>
        ),
        cell: info => {
          const val = info.getValue();
          const isLast = idx === months.length - 1;
          return (
            <div className={`text-right ${isLast ? 'bg-emerald-50/50 rounded-lg p-1' : ''}`}>
              <div className={`font-bold ${isLast ? 'text-emerald-700' : 'text-slate-600'}`}>
                {val.revenue > 0 ? formatCurrency(val.revenue) : <span className="text-slate-200">—</span>}
              </div>
              <div className="text-[9px] text-slate-400">{Math.round(val.qty)} unités</div>
            </div>
          );
        }
      })
    ),

    columnHelper.accessor('totalRevenue', {
      header: 'TOTAL 6M',
      cell: info => (
        <div className="text-right font-black text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100">
          {formatCurrency(info.getValue())}
        </div>
      )
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
    initialState: { pagination: { pageSize: 20 } }
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-4 font-bold text-slate-500 uppercase tracking-widest">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-50">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination (reprendre le code existant du BeautyTrendTable) */}
    </div>
  );
}