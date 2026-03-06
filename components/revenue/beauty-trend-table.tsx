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
  Row,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, TrendingUp, Package } from 'lucide-react';
import ProductImage from "@/app/marketing/components/ProductImage"; // Assurez-vous que ce chemin est correct
import { Button } from '@/components/ui/button';

// --- 1. DÉFINITION DES TYPES ---
export interface MonthlySalesMetrics {
  revenue: number;
  qty: number;
}

export interface MonthlyData {
  [key: string]: MonthlySalesMetrics; // Changement ici
}

export interface ProductTrendData {
  hs_code: string;
  name: string;
  color?: string;
  monthlySales: MonthlyData;
  monthlyStockOpening: Record<string, number>;
  currentStock: number;
}

export interface MonthDefinition {
  key: string;   // "2023-10"
  label: string; // "OCT"
}

// Structure retournée par l'accesseur des colonnes dynamiques
interface MonthlyMetric {
  sales: number;
  stock: number;
}

// Typage strict du helper
const columnHelper = createColumnHelper<ProductTrendData>();

// --- 2. UTILITAIRES ---

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

// --- 3. COMPOSANT ---

interface BeautyTrendTableProps {
  data: ProductTrendData[];
  months: MonthDefinition[];
}

export function BeautyTrendTable({ data, months }: BeautyTrendTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(() => [
    // --- COLONNE IMAGE ---
    columnHelper.accessor('hs_code', {
      id: 'image', // ID stable requis
      header: '',
      enableSorting: false,
      cell: info => {
        const hsCode = info.getValue();
        const color = info.row.original.color;
        
        const suffix = color ? color : ''; 
        const imageUrl = `https://images.pyiurs.com/images/${hsCode}_${suffix}.jpg`;
        return (
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 relative group">
          <ProductImage 
            src={imageUrl} 
            alt={info.row.original.name} 
          />
        </div>
      )
      },
    }),

    // --- COLONNE NOM ---
    columnHelper.accessor('name', {
      header: 'PRODUIT',
      cell: info => (
        <div className="min-w-37.5">
          <p className="font-bold text-slate-900 text-[11px] uppercase leading-tight line-clamp-2">
            {info.getValue()}
          </p>
          <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono italic mt-0.5">
            <span className="bg-slate-100 px-1 rounded">{info.row.original.hs_code}</span>
          </div>
        </div>
      )
    }),

    // --- COLONNES DYNAMIQUES (MOIS) ---
    ...months.map((m, idx) =>
      columnHelper.accessor((row) => ({
          sales: row.monthlySales?.[m.key] ?? { revenue: 0, qty: 0 },
          stock: row.monthlyStockOpening?.[m.key] ?? 0
      }), {
        id: m.key,
        header: ({ column }) => (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
            className="flex items-center justify-end gap-1 uppercase hover:bg-slate-100 hover:text-emerald-600 transition-colors w-full px-0 h-8 font-bold text-[10px]"
          >
            {m.label} 
            <ArrowUpDown size={10} className={column.getIsSorted() ? "text-emerald-600 opacity-100" : "opacity-30"} />
          </Button>
        ),
        cell: info => {
          const { sales, stock } = info.getValue();
          const isLastMonth = idx === months.length - 1;
          
          return (
            <div className={`text-right flex flex-col justify-center h-full ${isLastMonth ? 'bg-emerald-50/50 -mx-2 px-2 py-1 rounded-lg' : ''}`}>
              <div className={`font-medium flex items-center justify-end gap-1 ${isLastMonth ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}>
                {sales.revenue > 0 ? (
                    <>
                        <span>{formatCurrency(sales.revenue)}</span>
                        {/* Affichage de la quantité entre parenthèses, style plus léger */}
                        <span className="text-[9px] font-normal text-slate-400 tabular-nums">
                            ({Math.round(sales.qty)})
                        </span>
                    </>
                ) : <span className="text-slate-300 text-[9px]">—</span>}
              </div>
              <div className="text-[9px] text-slate-400 font-mono flex justify-end items-center gap-1">
                 <span className="scale-75 opacity-50"><Package size={10}/></span> {stock}
              </div>
            </div>
          )
        },
        // Logique de tri personnalisée et typée
        sortingFn: (rowA, rowB: Row<ProductTrendData>, columnId: string) => {
          const valA = rowA.getValue<MonthlyData>(columnId).sales.revenue;
          const valB = rowB.getValue<MonthlyData>(columnId).sales.revenue;
          return valA - valB;
        },
      })
    ),

    // --- TOTAL CUMULÉ ---
    columnHelper.accessor((row) => {
      // Calcul sécurisé du total
      const salesValues = Object.values(row.monthlySales || {});
      return salesValues.reduce((sum, val) => sum + (Number(val.revenue) || 0), 0);
    }, 
    {
      id: 'total',
      header: ({ column }) => (
        <Button 
            variant="ghost"
            size="sm" 
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
            className="flex items-center justify-end gap-1 uppercase hover:bg-slate-100 hover:text-indigo-600 transition-colors w-full px-0 h-8 font-black text-[10px]"
        >
            TOTAL 6M <TrendingUp size={10} className={column.getIsSorted() ? "text-indigo-600" : "opacity-30"}/>
        </Button>
      ),
      cell: info => (
        <div className="text-right font-black text-slate-900 bg-slate-100 py-1.5 rounded-lg px-2 border border-slate-200">
            {formatCurrency(info.getValue())}
        </div>
      ),
    }),

    // --- STOCK ACTUEL ---
    columnHelper.accessor('currentStock', {
        // 1. Le header devient une fonction recevant { column }
        header: ({ column }) => (
            <Button 
                variant="ghost" 
                size="sm"
                // 2. Déclenchement du tri au clic
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} 
                className="flex items-center justify-end w-full gap-1 uppercase hover:bg-transparent hover:text-indigo-600 transition-colors text-[9px] font-black h-8 px-0 pr-1"
            >
                STOCK 
                {/* 3. Indicateur visuel (flèche) */}
                <ArrowUpDown size={10} className={column.getIsSorted() ? "opacity-100 text-indigo-600" : "opacity-30"}/>
            </Button>
        ),
        cell: info => {
            const val = info.getValue();
            const isLow = val < 10;
            return (
                <div className={`text-right font-black pr-1 ${isLow ? 'text-rose-500' : 'text-indigo-600'}`}>
                    {val != null ? val : '—'}
                </div>
            )
        },
        // 4. Force le tri numérique standard (évite le tri alphabétique "10" < "2")
        sortingFn: "basic" 
    })
  ], [months]); // Dépendance correcte pour useMemo

  const table = useReactTable({
    data,
    columns, // Types de colonnes inférés correctement grâce à columnHelper typé
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { 
      pagination: { pageSize: 15 } // Taille de page ajustée
    }
  });

  // --- RENDER DÉFENSIF ---
  if (!data || data.length === 0) {
      return <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl bg-slate-50">Aucune donnée disponible pour cette période.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px] border-collapse min-w-200">
          <thead className="bg-slate-900 text-slate-200">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-3 py-2 font-bold uppercase tracking-widest border-r border-slate-700 last:border-none whitespace-nowrap">
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
                  <td key={cell.id} className="px-3 py-2 border-r border-slate-50 last:border-none align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination ultra-compacte et fonctionnelle */}
      <div className="p-2 bg-slate-50 flex items-center justify-between border-t border-slate-200">
        <div className="text-[9px] font-medium text-slate-400 pl-2">
            Affichage de {table.getRowModel().rows.length} sur {data.length} produits
        </div>
        
        <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-500 uppercase mr-2">
                Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <div className="flex gap-1">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.previousPage()} 
                    disabled={!table.getCanPreviousPage()} 
                    className="h-6 w-6 p-0 rounded-md border-slate-300 hover:bg-white disabled:opacity-30"
                >
                    <ChevronLeft size={12}/>
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => table.nextPage()} 
                    disabled={!table.getCanNextPage()} 
                    className="h-6 w-6 p-0 rounded-md border-slate-300 hover:bg-white disabled:opacity-30"
                >
                    <ChevronRight size={12}/>
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}