'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, getCoreRowModel, getExpandedRowModel, 
  flexRender, createColumnHelper, ExpandedState 
} from '@tanstack/react-table';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

const columnHelper = createColumnHelper<any>();

export function WeeklyRevenueTable({ data }: { data: any[] }) {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // 1. Déterminer toutes les semaines uniques (colonnes)
  const allWeeks = useMemo(() => {
    const weeks = new Set<string>();
    data.forEach(item => {
      if (item.weeks) Object.keys(item.weeks).forEach(w => weeks.add(w));
    });
    return Array.from(weeks).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data]);

  const columns = useMemo(() => [
    columnHelper.accessor('boutique', {
      header: 'Boutique / Segment',
      cell: ({ row, getValue }) => (
        <div style={{ paddingLeft: `${row.depth * 1}rem` }} className="flex items-center gap-2">
          {row.getCanExpand() && (
            <button onClick={row.getToggleExpandedHandler()} className="cursor-pointer">
              {row.getIsExpanded() ? <ChevronDown size={12} className="text-emerald-600"/> : <ChevronRight size={12} className="text-slate-400"/>}
            </button>
          )}
          {!row.getCanExpand() && row.depth > 0 && <Plus size={8} className="text-slate-300 ml-1" />}
          <span className={row.depth === 0 ? "font-black text-slate-900 uppercase italic tracking-tighter" : "text-slate-500 font-medium text-[10px]"}>
            {getValue()}
          </span>
        </div>
      ),
    }),
    ...allWeeks.map(week => 
      columnHelper.accessor(`weeks.${week}`, {
        header: week,
        cell: i => {
          const val = i.getValue();
          return (
            <span className={i.row.depth === 0 ? "font-bold text-slate-800" : "text-slate-400 text-[10px]"}>
               {val ? `$ ${Math.round(val).toLocaleString()}` : '—'}
            </span>
          )
        }
      })
    )
  ], [allWeeks]);

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: row => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Calcul du footer total (uniquement profondeur 0)
  const totals = useMemo(() => {
    return allWeeks.reduce((acc, week) => {
      acc[week] = data.reduce((sum, row) => sum + (row.weeks?.[week] || 0), 0);
      return acc;
    }, {} as Record<string, number>);
  }, [data, allWeeks]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-left text-[11px] border-collapse">
        <thead className="bg-slate-50 border-b border-gray-200">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th key={header.id} className="px-3 py-2 font-black text-slate-500 uppercase border-r border-slate-100 last:border-none">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className={`${row.depth > 0 ? 'bg-slate-50/30 italic' : 'hover:bg-slate-50 font-bold'}`}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2 border-r border-slate-50 last:border-none whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
          <tr>
            <td className="px-3 py-2 uppercase tracking-tighter border-r border-slate-200">Total Flux</td>
            {allWeeks.map(week => (
              <td key={week} className="px-3 py-2 border-r border-slate-100 last:border-none">
                $ {Math.round(totals[week]).toLocaleString()}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}