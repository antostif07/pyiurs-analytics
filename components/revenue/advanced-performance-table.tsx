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
  ExpandedState,
} from '@tanstack/react-table';
import { TrendingUp, TrendingDown, ArrowUpDown, ChevronRight, ChevronDown } from 'lucide-react';

// --- 1. DÉFINITION DES TYPES ---

export interface PerformanceData {
  boutique: string;
  deltaWoW?: number;
  mtd: number;
  mtdPrev: number;
  deltaMoM?: number;
  forecast?: number;
  pctBudget?: number;
  deltaYoY?: number;
  subRows?: PerformanceData[]; // Structure récursive
}

// Typage strict du helper
const columnHelper = createColumnHelper<PerformanceData>();

// --- 2. UTILITAIRES ---

const formatCurrency = (val: number | undefined) => {
  if (val === undefined || val === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

const formatPercentage = (val: number | undefined) => {
  if (val === undefined || val === null) return '—';
  return `${val > 0 ? '+' : ''}${val}%`;
};

// --- 3. COMPOSANT ---

interface AdvancedPerformanceTableProps {
  data: PerformanceData[];
}

export function AdvancedPerformanceTable({ data }: AdvancedPerformanceTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns = useMemo(() => [
    // --- BOUTIQUE (Hierarchie) ---
    columnHelper.accessor('boutique', { 
      header: ({ column }) => (
        <button 
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
          className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors font-bold text-[10px]"
        >
          Boutique / Segment <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"}/>
        </button>
      ),
      cell: ({ row, getValue }) => (
        <div 
          style={{ paddingLeft: `${row.depth * 1.5}rem` }} 
          className={`flex items-center gap-2 ${row.depth === 0 ? "font-black uppercase italic text-slate-900" : "text-slate-500 font-medium text-[10px]"}`}
        >
          {row.getCanExpand() ? (
            <button 
              onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }} 
              className="cursor-pointer hover:bg-slate-200 rounded p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500"
              aria-label={row.getIsExpanded() ? "Réduire" : "Développer"}
            >
              {row.getIsExpanded() 
                ? <ChevronDown size={14} className="text-emerald-600" /> 
                : <ChevronRight size={14} className="text-slate-400" />
              }
            </button>
          ) : (
             // Spacer pour alignement si pas d'enfant mais profondeur > 0
             row.depth > 0 && <span className="w-4.5" />
          )}
          
          {/* Ligne visuelle pour la hiérarchie */}
          {!row.getCanExpand() && row.depth > 0 && <span className="w-4 h-px bg-slate-200 mr-1" />}
          
          <span className="truncate" title={getValue()}>{getValue()}</span>
        </div>
      )
    }),

    // --- DELTA WoW ---
    columnHelper.accessor('deltaWoW', { 
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors font-bold text-[10px]">
          Δ WoW <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"}/>
        </button>
      ),
      cell: info => {
        const val = info.getValue();
        if (val === undefined || val === 0) return <span className="text-slate-300 text-[10px]">—</span>;
        return <span className={`font-bold text-[10px] ${val > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatPercentage(val)}</span> 
      }
    }),

    // --- MTD (Month to Date) ---
    columnHelper.accessor('mtd', { 
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors font-bold text-[10px]">
          MTD <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"}/>
        </button>
      ),
      cell: info => <span className={`font-black tabular-nums ${info.row.depth === 0 ? 'text-slate-900 text-xs' : 'text-slate-600 text-[10px]'}`}>{formatCurrency(info.getValue())}</span> 
    }),

    // --- MTD PREV ---
    columnHelper.accessor('mtdPrev', { 
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors font-bold text-[10px]">
            MTD-1 <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"}/>
          </button>
        ),
        cell: info => <span className="text-slate-400 tabular-nums text-[10px] font-medium">{formatCurrency(info.getValue())}</span> 
    }),

    // --- DELTA MoM ---
    columnHelper.accessor('deltaMoM', { 
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-1 uppercase hover:text-emerald-400 transition-colors font-bold text-[10px]">
          Δ MoM <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"}/>
        </button>
      ),
      cell: info => {
        const val = info.getValue() ?? 0;
        return (
          <div className={`flex items-center gap-1 font-bold px-1.5 py-0.5 rounded w-fit text-[10px] ${val < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {val < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
            {Math.abs(val)}%
          </div>
        )
      }
    }),

    // --- FORECAST ---
    columnHelper.accessor('forecast', { 
        header: 'Forecast', 
        cell: info => (
            <span className={`font-bold tabular-nums ${info.row.depth === 0 ? 'text-blue-600 text-[11px]' : 'text-blue-400/70 italic text-[10px]'}`}>
            {formatCurrency(info.getValue())}
            </span>
        )
    }),

    // --- % BUDGET ---
    columnHelper.accessor('pctBudget', { 
      header: '% BU', 
      cell: info => {
        const val = info.getValue() ?? 0;
        // Affichage uniquement pour les parents ou si pertinent
        if (info.row.depth > 0 && val === 0) return <span className="text-slate-300 text-[9px]">—</span>;

        return (
          <div className="w-20 bg-slate-100 h-3.5 rounded-full relative overflow-hidden border border-slate-200">
            <div 
              className={`h-full transition-all duration-500 ${val >= 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`} 
              style={{ width: `${Math.min(Math.max(val, 0), 100)}%` }} 
            />
            <span className="absolute inset-0 flex items-center justify-center font-black text-[8px] text-slate-700 z-10 mix-blend-multiply">
                {val}%
            </span>
          </div>
        )
      }
    }),

    // --- DELTA YoY ---
    columnHelper.accessor('deltaYoY', { 
      header: 'Δ YoY', 
      cell: info => info.row.depth === 0 
        ? <span className="font-black text-emerald-600 italic text-[10px]">{(info.getValue() ?? 0) > 0 ? '+' : ''}{info.getValue() ?? 0}%</span> 
        : null 
    }),
  ], []);

  // CALCUL DES TOTAUX SÉCURISÉ
  const totals = useMemo(() => {
    // Initialisation
    let mtd = 0, mtdPrev = 0, forecast = 0;

    // Calcul uniquement sur les données racines pour éviter les doubles comptages (si les enfants sont inclus dans data flat, ajuster la logique)
    data.forEach(curr => {
        mtd += curr.mtd || 0;
        mtdPrev += curr.mtdPrev || 0;
        forecast += curr.forecast || 0;
    });
    
    // Calcul sécurisé du pourcentage (évite division par zéro)
    const deltaMoM = mtdPrev > 0 
        ? Math.round(((mtd - mtdPrev) / mtdPrev) * 100) 
        : 0;
    
    return { mtd, mtdPrev, forecast, deltaMoM };
  }, [data]);

  const table = useReactTable({ 
    data, 
    columns, 
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // --- RENDER ---
  
  if (!data || data.length === 0) {
      return <div className="p-6 text-center text-slate-400 bg-white border border-slate-200 rounded-xl text-sm italic">Aucune donnée de performance disponible.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-200">
          <thead className="bg-slate-900 text-slate-200">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-3 py-3 font-bold uppercase tracking-widest border-r border-slate-700 last:border-none whitespace-nowrap">
                    {header.isPlaceholder 
                        ? null 
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
                  <td key={cell.id} className="px-3 py-2 border-r border-slate-50 last:border-none font-medium whitespace-nowrap align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* FOOTER TOTAL */}
          <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900 shadow-inner">
            <tr>
              <td className="px-3 py-3 border-r border-slate-200 uppercase tracking-tighter text-[10px]">TOTAL RÉSEAU</td>
              
              {/* Delta WoW (placeholder) */}
              <td className="px-3 py-3 border-r border-slate-200 text-center text-slate-300">—</td>
              
              {/* MTD */}
              <td className="px-3 py-3 border-r border-slate-200 font-black text-sm text-slate-800">
                {formatCurrency(totals.mtd)}
              </td>
              
              {/* MTD Prev */}
              <td className="px-3 py-3 border-r border-slate-200 text-slate-400 font-bold text-[11px]">
                {formatCurrency(totals.mtdPrev)}
              </td>
              
              {/* Delta MoM */}
              <td className="px-3 py-3 border-r border-slate-200">
                <div className={`flex items-center justify-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] ${totals.deltaMoM < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {totals.deltaMoM > 0 ? '+' : ''}{totals.deltaMoM}%
                </div>
              </td>
              
              {/* Forecast */}
              <td className="px-3 py-3 border-r border-slate-200 text-blue-700 font-black text-[11px]">
                {formatCurrency(totals.forecast)}
              </td>
              
              {/* % Budget & YoY (placeholders) */}
              <td className="px-3 py-3 border-r border-slate-200 text-center text-slate-300">—</td>
              <td className="px-3 py-3 text-center text-slate-300">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}