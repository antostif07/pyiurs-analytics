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
import { ArrowUpDown, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import ProductImage from "@/app/marketing/components/ProductImage";
import { Button } from '@/components/ui/button';

// --- 1. DÉFINITION DES TYPES ---

export interface BeautySalesData {
  hs_code: string;
  name: string;
  totalQty: number;
  totalRevenue: number;
}

// Typage strict du helper
const columnHelper = createColumnHelper<BeautySalesData>();

// --- 2. UTILITAIRES ---

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

// --- 3. COMPOSANT ---

interface BeautySalesTableProps {
  data: BeautySalesData[];
}

export function BeautySalesTable({ data }: BeautySalesTableProps) {
  // Initialisation du tri par défaut sur le revenu (descendant)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'totalRevenue', desc: true }]);

  const columns = useMemo(() => [
    // --- COLONNE IMAGE ---
    columnHelper.accessor('hs_code', {
      header: 'Aperçu',
      enableSorting: false, // Pas de tri sur l'image
      cell: info => (
        <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 relative group">
          <ProductImage 
            src={`https://images.pyiurs.com/images/${info.getValue()}_.jpg`} 
            alt={info.row.original.name} 
          />
        </div>
      ),
    }),

    // --- COLONNE PRODUIT ---
    columnHelper.accessor('name', {
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
          className="flex items-center gap-1 uppercase font-black text-[10px] hover:bg-slate-700 hover:text-white px-2 -ml-2"
        >
          Produit <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-40"}/>
        </Button>
      ),
      cell: info => (
        <div className="min-w-37.5">
          <p className="font-bold text-slate-900 text-[11px] italic uppercase leading-tight line-clamp-2">
            {info.getValue()}
          </p>
          <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase flex items-center gap-1">
            <span className="bg-slate-100 px-1 rounded text-slate-500">#{info.row.original.hs_code}</span>
          </p>
        </div>
      )
    }),

    // --- COLONNE QUANTITÉ ---
    columnHelper.accessor('totalQty', {
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
          className="w-full flex justify-center gap-1 uppercase font-black text-[10px] hover:bg-slate-700 hover:text-white"
        >
          Quantité <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-40"}/>
        </Button>
      ),
      cell: info => (
        <div className="flex justify-center">
            <div className="text-center font-bold text-slate-600 bg-slate-100 py-1 px-3 rounded-lg text-xs min-w-12">
                {info.getValue() ?? 0}
            </div>
        </div>
      )
    }),

    // --- COLONNE REVENU ---
    columnHelper.accessor('totalRevenue', {
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
          className="w-full flex justify-end gap-1 uppercase font-black text-[10px] hover:bg-slate-700 hover:text-white"
        >
          Revenu Total <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100" : "opacity-40"}/>
        </Button>
      ),
      cell: info => {
        const val = info.getValue() ?? 0;
        return (
            <div className="text-right font-black text-rose-600 text-sm">
                {formatCurrency(val)}
            </div>
        )
      }
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
    initialState: { 
        pagination: { pageSize: 10 } 
    }
  });

  // --- RENDER DÉFENSIF (Empty State) ---
  if (!data || data.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-4xl border border-slate-200 border-dashed text-slate-400">
            <Package size={32} className="mb-2 opacity-50" />
            <p className="text-sm font-medium">Aucune vente enregistrée pour cette période.</p>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-150">
            <thead className="bg-slate-900 text-slate-200">
                {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                    {hg.headers.map(header => (
                    <th key={header.id} className="px-6 py-3 text-[10px] tracking-widest border-r border-slate-700 last:border-none whitespace-nowrap">
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
                <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                    {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-2.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
            </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-[10px] text-slate-400 font-medium pl-2">
                Total: {data.length} produits
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex gap-1">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => table.previousPage()} 
                        disabled={!table.getCanPreviousPage()} 
                        className="rounded-lg h-8 w-8 p-0 bg-white hover:bg-slate-100 border-slate-200"
                    >
                        <ChevronLeft size={14}/>
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => table.nextPage()} 
                        disabled={!table.getCanNextPage()} 
                        className="rounded-lg h-8 w-8 p-0 bg-white hover:bg-slate-100 border-slate-200"
                    >
                        <ChevronRight size={14}/>
                    </Button>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                </span>
            </div>
        </div>
      </div>
    </div>
  );
}