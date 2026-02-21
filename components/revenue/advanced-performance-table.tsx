'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getExpandedRowModel,
  getSortedRowModel,
  flexRender, 
  createColumnHelper,
  SortingState,
  ExpandedState
} from '@tanstack/react-table';
import { TrendingUp, TrendingDown, ArrowUpDown, ChevronRight, ChevronDown } from 'lucide-react';

const columnHelper = createColumnHelper<any>();

export function AdvancedPerformanceTable({ data }: { data: any[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo(() => [
    columnHelper.accessor('boutique', { 
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
          Boutique / Segment <ArrowUpDown size={10} />
        </button>
      ),
      cell: ({ row, getValue }) => (
        <div 
          style={{ paddingLeft: `${row.depth * 1.5}rem` }} 
          className={`flex items-center gap-2 ${row.depth === 0 ? "font-black uppercase italic text-slate-900" : "text-slate-500 font-medium text-[10px]"}`}
        >
          {row.getCanExpand() && (
            <button 
              onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }} 
              className="cursor-pointer hover:bg-slate-200 rounded p-0.5 transition-colors"
            >
              {row.getIsExpanded() ? <ChevronDown size={14} className="text-emerald-600" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
          )}
          {!row.getCanExpand() && row.depth > 0 && <span className="w-4 h-px bg-slate-200 ml-1" />}
          <span className="truncate">{getValue()}</span>
        </div>
      )
    }),
    columnHelper.accessor('deltaWoW', { 
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
          Δ WoW <ArrowUpDown size={10} />
        </button>
      ),
      cell: i => {
        const val = i.getValue();
        if (val === undefined || val === 0) return <span className="text-slate-300">—</span>;
        return <span className={`font-bold ${val > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{val > 0 ? '+' : ''}{val}%</span> 
      }
    }),
    columnHelper.accessor('mtd', { 
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors">
          MTD <ArrowUpDown size={10} />
        </button>
      ),
      cell: i => <span className={`font-black ${i.row.depth === 0 ? 'text-slate-900' : 'text-slate-600'}`}>$ {i.getValue()?.toLocaleString()}</span> 
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
      cell: i => {
        const val = i.getValue();
        return (
          <div className={`flex items-center gap-1 font-bold p-1 rounded w-fit ${val < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {val < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {val}%
          </div>
        )
      }
    }),
    columnHelper.accessor('forecast', { 
        header: 'Forecast', 
        cell: i => (
            <span className={`font-bold ${i.row.depth === 0 ? 'text-blue-600' : 'text-blue-400/70 italic text-[10px]'}`}>
            $ {i.getValue()?.toLocaleString()}
            </span>
        )
    }),
    columnHelper.accessor('pctBudget', { 
      header: '% BU', 
      cell: i => i.row.depth === 0 ? (
        <div className="w-24 bg-slate-100 h-4 rounded-full relative overflow-hidden border border-slate-200">
          <div 
            className={`h-full transition-all duration-500 ${i.getValue() >= 100 ? 'bg-emerald-500' : 'bg-emerald-500/30'}`} 
            style={{ width: `${Math.min(i.getValue(), 100)}%` }} 
          />
          <span className="absolute inset-0 flex items-center justify-center font-black text-[8px] text-slate-700">{i.getValue()}%</span>
        </div>
      ) : null
    }),
    columnHelper.accessor('deltaYoY', { 
      header: 'Δ YoY', 
      cell: i => i.row.depth === 0 ? <span className="font-black text-emerald-600 italic">0%</span> : null 
    }),
  ], []);

  // CALCUL DES TOTAUX (Uniquement pour les lignes de profondeur 0)
  const totals = useMemo(() => {
    const sumMTD = data.reduce((acc, curr) => acc + (curr.mtd || 0), 0);
    const sumPrevMTD = data.reduce((acc, curr) => acc + (curr.mtdPrev || 0), 0);
    const sumForecast = data.reduce((acc, curr) => acc + (curr.forecast || 0), 0);
    
    return {
      mtd: sumMTD,
      mtdPrev: sumPrevMTD,
      forecast: sumForecast,
      deltaMoM: sumPrevMTD > 0 ? Math.round(((sumMTD - sumPrevMTD) / sumPrevMTD) * 100) : 0,
    };
  }, [data]);

  const table = useReactTable({ 
    data, 
    columns, 
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getSubRows: row => row.subRows, // 🚀 LIEN AVEC TES SEGMENTS
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
      <table className="w-full text-left text-[11px] border-collapse min-w-237.5">
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
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map(row => (
            <tr 
                key={row.id} 
                className={`transition-colors ${row.depth > 0 ? 'bg-slate-50/40 italic' : 'hover:bg-slate-50 font-bold'}`}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2 border-r border-slate-50 last:border-none font-medium whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

        <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
          <tr>
            <td className="px-3 py-3 border-r border-slate-200 uppercase tracking-tighter">TOTAL RÉSEAU</td>
            <td className="px-3 py-3 border-r border-slate-200">—</td>
            <td className="px-3 py-3 border-r border-slate-200 font-black text-sm">$ {totals.mtd.toLocaleString()}</td>
            <td className="px-3 py-3 border-r border-slate-200 text-slate-400 font-bold">$ {totals.mtdPrev.toLocaleString()}</td>
            <td className="px-3 py-3 border-r border-slate-200">
              <div className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] ${totals.deltaMoM < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {totals.deltaMoM}%
              </div>
            </td>
            <td className="px-3 py-3 border-r border-slate-200 text-blue-700 font-black">$ {totals.forecast.toLocaleString()}</td>
            <td className="px-3 py-3 border-r border-slate-200">—</td>
            <td className="px-3 py-3 text-emerald-600">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}