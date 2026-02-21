'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  flexRender, 
  createColumnHelper,
  SortingState 
} from '@tanstack/react-table';
import { TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.accessor('boutique', { 
    header: ({ column }) => (
      <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
        Boutique <ArrowUpDown size={10} />
      </button>
    )
  }),
  columnHelper.accessor('deltaWoW', {
    header: ({ column }) => (
      <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
        Δ WoW <ArrowUpDown size={10} />
      </button>
    ),
    cell: i => <span className={`font-bold ${i.getValue() > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{i.getValue()}%</span> 
  }),
  columnHelper.accessor('mtd', { 
    header: ({ column }) => (
      <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
        MTD <ArrowUpDown size={10} />
      </button>
    ),
    cell: i => `$ ${i.getValue()?.toLocaleString()}` 
  }),
  columnHelper.accessor('mtdPrev', { 
    header: ({ column }) => (
      <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
        MTD-1 <ArrowUpDown size={10} />
      </button>
    ),
    cell: i => <span className="text-slate-400">$ {i.getValue()?.toLocaleString()}</span> 
  }),
  columnHelper.accessor('deltaMoM', { 
    header: ({ column }) => (
      <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
        Δ MoM <ArrowUpDown size={10} />
      </button>
    ),
    cell: i => (
      <div className={`flex items-center gap-1 font-bold p-1 rounded w-fit ${i.getValue() < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
        {i.getValue() < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
        {i.getValue()}%
      </div>
    )
  }),
  columnHelper.accessor('forecast', { 
    header: 'Forecast', 
    cell: i => <span className="text-blue-600 font-bold">$ {i.getValue()?.toLocaleString()}</span> 
  }),
  columnHelper.accessor('pctBudget', { 
    header: '% BU', 
    cell: i => (
      <div className="w-full bg-slate-100 h-5 rounded-md relative overflow-hidden border border-slate-200">
        <div 
          className={`h-full transition-all duration-500 ${i.getValue() >= 100 ? 'bg-emerald-500' : 'bg-emerald-500/30'}`} 
          style={{ width: `${Math.min(i.getValue(), 100)}%` }} 
        />
        <span className="absolute inset-0 flex items-center justify-center font-black text-[9px] text-slate-700">{i.getValue()}%</span>
      </div>
    )
  }),
  columnHelper.accessor('deltaYoY', { 
    header: 'Δ YoY', 
    cell: i => <span className="font-black text-emerald-600">{i.getValue()}%</span> 
  }),
];

export function AdvancedPerformanceTable({ data }: { data: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // 1. Calcul des totaux pour le Footer
  const totals = useMemo(() => {
    const sumMTD = data.reduce((acc, curr) => acc + (curr.mtd || 0), 0);
    const sumPrevMTD = data.reduce((acc, curr) => acc + (curr.mtdPrev || 0), 0);
    const sumForecast = data.reduce((acc, curr) => acc + (curr.forecast || 0), 0);
    const sumBudget = data.reduce((acc, curr) => acc + (curr.budgetMensuel || 0), 0);
    
    return {
      mtd: sumMTD,
      forecast: sumForecast,
      // Calcul du Delta MoM Global
      deltaMoM: sumPrevMTD > 0 ? Math.round(((sumMTD - sumPrevMTD) / sumPrevMTD) * 100) : 0,
      // Calcul du % Budget Global
      pctBudget: sumBudget > 0 ? Math.round((sumMTD / sumBudget) * 100) : 0
    };
  }, [data]);

  const table = useReactTable({ 
    data, 
    columns, 
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Indispensable pour le tri
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full text-left text-[11px] border-collapse min-w-200">
        <thead className="bg-slate-800 text-white">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th key={header.id} className="px-3 py-3 font-bold uppercase tracking-widest border-r border-slate-700 last:border-none">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100 italic">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2 border-r border-slate-50 last:border-none font-medium whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        {/* PIED DE TABLEAU (TOTAL) */}
        <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
          <tr>
            <td className="px-3 py-3 border-r border-slate-200 uppercase tracking-tighter">Total Réseau</td>
            <td className="px-3 py-3 border-r border-slate-200">—</td>
            <td className="px-3 py-3 border-r border-slate-200 font-black text-sm">
              $ {totals.mtd.toLocaleString()}
            </td>
            <td className="px-3 py-3 border-r border-slate-200">
              <div className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] ${totals.deltaMoM < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {totals.deltaMoM}%
              </div>
            </td>
            <td className="px-3 py-3 border-r border-slate-200 text-blue-700">
              $ {totals.forecast.toLocaleString()}
            </td>
            <td className="px-3 py-3 border-r border-slate-200">
              <div className="w-full bg-white h-5 rounded-md relative overflow-hidden border border-slate-300">
                <div 
                  className="bg-slate-900 h-full opacity-20" 
                  style={{ width: `${totals.pctBudget}%` }} 
                />
                <span className="absolute inset-0 flex items-center justify-center font-black text-[9px]">{totals.pctBudget}%</span>
              </div>
            </td>
            <td className="px-3 py-3 text-emerald-600">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}