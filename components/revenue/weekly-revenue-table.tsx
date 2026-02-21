'use client'

import React, { useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

const columnHelper = createColumnHelper<any>();

export function WeeklyRevenueTable({ data }: { data: any[] }) {
  // 1. Extraire dynamiquement toutes les clés de semaines présentes dans les données
  // On trie par ordre numérique (W9 avant W10)
  const allWeeks = useMemo(() => {
    const weeks = new Set<string>();
    data.forEach(item => {
      if (item.weeks) {
        Object.keys(item.weeks).forEach(w => weeks.add(w));
      }
    });
    return Array.from(weeks).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [data]);

  // 2. Calculer les totaux par colonne pour la ligne de pied de page
  const totals = useMemo(() => {
    return allWeeks.reduce((acc, week) => {
      acc[week] = data.reduce((sum, row) => sum + (row.weeks?.[week] || 0), 0);
      return acc;
    }, {} as Record<string, number>);
  }, [data, allWeeks]);

  // 3. Définir les colonnes dynamiquement
  const columns = useMemo(() => [
    columnHelper.accessor('boutique', {
      header: 'Boutique',
      cell: info => (
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <Plus size={10} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
          {info.getValue()}
        </div>
      ),
    }),
    // On mappe chaque semaine trouvée en une colonne
    ...allWeeks.map(week => 
      columnHelper.accessor(`weeks.${week}`, {
        header: week,
        cell: info => {
          const val = info.getValue();
          return val ? `$ ${Math.round(val).toLocaleString()}` : '—';
        }
      })
    )
  ], [allWeeks]);

  const table = useReactTable({ 
    data, 
    columns, 
    getCoreRowModel: getCoreRowModel() 
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-left text-[11px] border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th key={header.id} className="px-3 py-2 font-black text-slate-500 uppercase tracking-tighter border-r border-slate-100 last:border-r-0">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100 italic">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2 border-r border-slate-50 last:border-r-0 font-medium text-slate-600">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {/* LIGNE DE TOTAL DYNAMIQUE */}
        <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
          <tr>
            <td className="px-3 py-2 uppercase tracking-tighter">Total Global</td>
            {allWeeks.map((week, idx) => (
              <td 
                key={week} 
                className={`px-3 py-2 border-r border-slate-100 last:border-r-0 ${
                  idx === allWeeks.length - 1 ? 'text-emerald-600 font-black' : ''
                }`}
              >
                $ {Math.round(totals[week]).toLocaleString()}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}