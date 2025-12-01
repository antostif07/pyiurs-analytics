'use client'

import { useState, useMemo } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';
import ProductImage from './ProductImage';

// Helper monétaire (identique à ta page)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export default function CampaignTable({ data }: { data: any[] }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  // --- DÉFINITION DES COLONNES ---
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'image_url',
      header: 'Image',
      cell: info => (
        <div className="w-12 h-12 rounded border border-gray-200 overflow-hidden">
           {/* On passe l'URL et le HS Code pour l'alt */}
           <ProductImage src={info.getValue() as string} alt={info.row.original.hs_code} />
        </div>
      )
    },
    {
      accessorKey: 'hs_code',
      header: 'Référence',
      cell: info => <span className="font-mono text-gray-500">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'name',
      header: 'Désignation',
      cell: info => <span className="font-bold text-gray-900">{info.getValue() as string}</span>
    },
    {
      accessorKey: 'qty_available',
      header: ({ column }) => (
        <button className="flex items-center gap-1 mx-auto" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
           Stock <ArrowUpDown size={12}/>
        </button>
      ),
      cell: info => <div className="text-center font-bold bg-gray-50 rounded py-1">{info.getValue() as number}</div>
    },
    {
      accessorKey: 'standard_price', // Ou list_price selon ton Odoo
      header: ({ column }) => (
        <button className="flex items-center gap-1 ml-auto" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
           Coût Achat <ArrowUpDown size={12}/>
        </button>
      ),
      cell: info => <div className="text-right text-gray-400">{info.getValue() ? formatCurrency(info.getValue() as number) : '-'}</div>
    },
    {
      accessorKey: 'shop_price',
      header: ({ column }) => (
        <button className="flex items-center gap-1 ml-auto" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
           Prix Boutique <ArrowUpDown size={12}/>
        </button>
      ),
      cell: info => (
        <div className="text-right font-medium text-gray-500 line-through decoration-red-400">
            {formatCurrency(info.getValue() as number)}
        </div>
      )
    },
    {
      accessorKey: 'promo_price',
      header: ({ column }) => (
        <button className="flex items-center gap-1 ml-auto" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
           Nouveau Prix <ArrowUpDown size={12}/>
        </button>
      ),
      cell: info => (
        <div className="text-right font-bold text-blue-600 bg-blue-50/30 py-1 px-2 rounded">
            {formatCurrency(info.getValue() as number)}
        </div>
      )
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } }, // 10 par page par défaut
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* BARRE DE RECHERCHE DANS LE TABLEAU */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
         <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100"
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
            />
         </div>
         <div className="text-xs text-gray-500">
            {data.length} articles listés
         </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                            <th key={header.id} className="p-4 border-b border-gray-100 whitespace-nowrap">
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody className="divide-y divide-gray-50">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="p-4">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={columns.length} className="p-8 text-center text-gray-400">
                            Aucun produit trouvé.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
         <div className="flex items-center gap-2">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft size={16}/></button>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight size={16}/></button>
         </div>
         <span className="text-xs text-gray-500">
            Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}
         </span>
      </div>
    </div>
  );
}