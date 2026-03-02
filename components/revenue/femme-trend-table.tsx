'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getSortedRowModel, 
  getPaginationRowModel,
  flexRender, 
  createColumnHelper, 
  SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImage from "@/app/marketing/components/ProductImage";
import { Button } from '@/components/ui/button';

// --- 1. DÉFINITION DES TYPES ---

export interface MonthlySalesData {
  [key: string]: number; // ex: "2023-10": 450
}

export interface FemmeProductData {
  hs_code: string;
  name: string;
  color?: string; // Optionnel car certains produits n'en ont peut-être pas
  monthlySales: MonthlySalesData;
  currentStock: number;
}

export interface MonthDefinition {
  key: string;   // "2023-10"
  label: string; // "OCT"
}

// Typage strict du helper
const columnHelper = createColumnHelper<FemmeProductData>();

// --- 2. UTILITAIRES ---

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

// --- 3. COMPOSANT ---

interface FemmeTrendTableProps {
  data: FemmeProductData[];
  months: MonthDefinition[];
}

export function FemmeTrendTable({ data, months }: FemmeTrendTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    // --- IMAGE ---
    columnHelper.accessor('hs_code', {
      header: 'IMAGE',
      enableSorting: false,
      cell: info => {
        const hs = info.getValue();
        const color = info.row.original.color || ''; // Fallback string vide
        
        // Construction sécurisée de l'URL
        const imgUrl = `https://images.pyiurs.com/images/${hs}${color ? `_${color}` : ''}.jpg`;
        
        return (
          <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shadow-inner relative group">
            <ProductImage src={imgUrl} alt={info.row.original.name} />
          </div>
        );
      },
    }),

    // --- MODELE ---
    columnHelper.accessor('name', {
      header: 'MODÈLE FEMME',
      cell: info => (
        <div className="min-w-45">
          <p className="font-black text-slate-900 text-[11px] uppercase italic leading-tight truncate">
            {info.getValue()}
          </p>
          <div className="text-[9px] text-gray-400 mt-1 flex items-center gap-1">
            REF: <span className="font-mono text-indigo-500 font-bold">{info.row.original.hs_code}</span> 
            {info.row.original.color && (
                <>
                    <span className="text-slate-300">•</span>
                    <span className="uppercase">{info.row.original.color}</span>
                </>
            )}
          </div>
        </div>
      )
    }),

    // --- COLONNES DYNAMIQUES (MOIS) ---
    ...months.map((m, idx) => 
      columnHelper.accessor((row) => row.monthlySales?.[m.key] ?? 0, {
        id: m.key,
        header: ({ column }) => (
            <Button 
                variant="ghost" 
                size="sm"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
                className="flex items-center justify-end gap-1 uppercase hover:bg-transparent hover:text-indigo-500 transition-colors w-full text-[9px] font-black h-8 px-0"
            >
                {m.label} <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"} />
            </Button>
        ),
        cell: info => {
          const val = info.getValue();
          const isLastMonth = idx === months.length - 1;
          
          return (
            <div className={`text-right font-bold tabular-nums ${isLastMonth ? 'text-indigo-600 font-black scale-105 origin-right' : 'text-slate-400'}`}>
              {val > 0 ? formatCurrency(val) : <span className="text-slate-200 font-normal">—</span>}
            </div>
          );
        },
        // Tri numérique explicite (plus sûr que alphanumeric)
        sortingFn: (rowA, rowB, columnId) => {
            return (rowA.getValue(columnId) as number) - (rowB.getValue(columnId) as number);
        }
      })
    ),

    // --- TOTAL ---
    columnHelper.accessor((row) => 
        Object.values(row.monthlySales || {}).reduce((sum, val) => sum + (Number(val) || 0), 0), 
    {
      id: 'total',
      header: ({ column }) => (
        <Button 
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
            className="flex items-center justify-end gap-1 uppercase hover:bg-transparent hover:text-indigo-500 transition-colors w-full text-[9px] font-black h-8 px-0"
        >
            TOTAL 6M <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"}/>
        </Button>
      ),
      cell: info => (
        <div className="flex justify-end">
            <div className="text-right font-black text-white bg-slate-900 py-1 rounded-md px-2 text-xs shadow-md shadow-slate-200">
                {formatCurrency(info.getValue())}
            </div>
        </div>
      ),
      sortingFn: "basic", // Utilise la valeur brute de l'accessor (number)
    }),

    // --- STOCK ---
    columnHelper.accessor('currentStock', {
        header: ({ column }) => (
            <Button 
                variant="ghost" 
                size="sm"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
                className="flex items-center justify-center gap-1 uppercase w-full text-[9px] font-black h-8 px-0"
            >
            STOCK <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-30"}/>
            </Button>
        ),
        cell: info => {
            const stock = info.getValue();
            // Logique de couleur conditionnelle
            let badgeClass = 'bg-slate-100 text-slate-600';
            if (stock <= 0) badgeClass = 'bg-rose-100 text-rose-600 border border-rose-200';
            else if (stock < 5) badgeClass = 'bg-amber-100 text-amber-700 border border-amber-200';

            return (
            <div className="flex justify-center">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black min-w-7.5 text-center ${badgeClass}`}>
                {stock}
                </span>
            </div>
            );
        },
        sortingFn: "basic",
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
    initialState: { 
        pagination: { pageSize: 12 } 
    }
  });

  // --- RENDER DÉFENSIF ---
  if (!data || data.length === 0) {
      return <div className="p-10 text-center text-slate-400 text-sm italic border border-dashed rounded-[40px] bg-slate-50">Aucune donnée disponible.</div>;
  }

  return (
    <div className="bg-white rounded-[40px] border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-200">
          <thead className="bg-slate-50 border-b border-slate-200">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest border-r border-slate-100 last:border-none whitespace-nowrap">
                    {header.isPlaceholder 
                      ? null 
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-indigo-50/10 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-1 py-1.5 border-r border-slate-50 last:border-none align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-100">
        <div className="text-[10px] text-slate-400 font-medium">
            Total: {data.length} références
        </div>
        <div className="flex items-center gap-4">
            <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 w-8 p-0 rounded-xl hover:bg-white hover:shadow-sm transition-all"><ChevronLeft size={14}/></Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 w-8 p-0 rounded-xl hover:bg-white hover:shadow-sm transition-all"><ChevronRight size={14}/></Button>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
        </div>
      </div>
    </div>
  );
}