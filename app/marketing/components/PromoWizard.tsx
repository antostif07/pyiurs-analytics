'use client'

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Search, Play, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from 'lucide-react';
import { createCustomPromo } from '../actions';

interface Candidate {
  id: string;
  hs_code: string;
  name: string;
  image_url: string;
  total_stock: number;
  max_age: number;
  category: string;
  cost_price: number;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

export default function PromoWizard({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  
  // États Table
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  
  // États Filtres Spécifiques
  const [catFilter, setCatFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('0'); // '0', '3', '6'

  // États Formulaire
  const [promoName, setPromoName] = useState('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- FILTRE CUSTOM DES DONNÉES AVANT TABLE ---
  // React Table gère bien les filtres, mais pour "Age > X", c'est souvent plus simple de pré-filtrer la data array
  const filteredData = useMemo(() => {
    return candidates.filter(c => {
        const passCategory = catFilter ? c.category === catFilter : true;
        const passAge = Number(ageFilter) > 0 ? c.max_age >= Number(ageFilter) : true;
        return passCategory && passAge;
    });
  }, [candidates, catFilter, ageFilter]);


  // --- DÉFINITION COLONNES ---
  const columns = useMemo<ColumnDef<Candidate>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input type="checkbox" checked={table.getIsAllRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
      ),
      cell: ({ row }) => (
        <input type="checkbox" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
      ),
    },
    {
      accessorKey: 'image_url',
      header: 'Aperçu',
      cell: info => (
        <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
            <img src={info.getValue() as string} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Img'} />
        </div>
      )
    },
    {
      accessorKey: 'name',
      header: 'Ref / Produit',
      cell: ({ row }) => (
        <div>
            <div className="font-bold text-gray-900">{row.original.hs_code}</div>
            <div className="text-xs text-gray-400 truncate w-32 md:w-48">{row.original.name}</div>
        </div>
      )
    },
    {
      accessorKey: 'max_age',
      header: ({ column }) => <button className="flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Âge <ArrowUpDown size={12}/></button>,
      cell: info => {
        const age = info.getValue() as number;
        return <span className={`px-2 py-1 rounded text-xs font-bold ${age >= 6 ? 'bg-red-100 text-red-700' : age >= 3 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{age} mois</span>;
      }
    },
    {
      accessorKey: 'total_stock',
      header: ({ column }) => <button className="flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Stock <ArrowUpDown size={12}/></button>,
      cell: info => <span className="font-bold text-gray-800">{info.getValue() as number}</span>
    },
    // NOUVEAUX PRIX
    {
        accessorKey: 'cost_price',
        header: 'Prix',
        cell: info => <span className="text-gray-400 text-xs">{formatCurrency(info.getValue() as number)}</span>
    },
    {
        id: 'shop_price',
        header: 'Prix Boutique',
        cell: ({ row }) => {
            const cost = row.original.cost_price;
            const shopPrice = cost * 1.25; // +25%
            return (
                <div>
                    <div className="font-bold text-gray-800 text-sm">{formatCurrency(shopPrice)}</div>
                    <div className="text-[10px] text-green-600 font-medium">+25%</div>
                </div>
            )
        }
    },
    // SIMULATION PRIX PROMO (Visible si discount > 0)
    {
        id: 'promo_preview',
        header: 'Prix Promo',
        cell: ({ row }) => {
            if(!discount) return <span className="text-gray-300">-</span>;
            const shopPrice = row.original.cost_price * 1.25;
            const final = shopPrice * (1 - (Number(discount)/100));
            return <span className="font-bold text-blue-600 text-sm">{formatCurrency(final)}</span>
        }
    }

  ], [discount]); // Recalculer les colonnes si le discount change

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { rowSelection, globalFilter, sorting },
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 6 } },
  });

  // Calculs Barre du bas
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const totalStockSelected = selectedRows.reduce((sum, row) => sum + row.original.total_stock, 0);

  const handleSubmit = async () => {
    if (!promoName || !discount || selectedCount === 0) return;
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('name', promoName);
    formData.append('discount', discount.toString());
    selectedRows.forEach(row => formData.append('hs_codes', row.original.hs_code));
    await createCustomPromo(formData);
    setIsSubmitting(false);
    router.push('/marketing/promos');
  };

  return (
    <div className="pb-32">
      
      {/* 1. BARRE DE FILTRES */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4 mb-6 sticky top-4 z-10">
        <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" placeholder="Rechercher Ref ou Nom..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-100"
                value={globalFilter ?? ''} onChange={e => setGlobalFilter(e.target.value)}
            />
        </div>
        
        <select className="bg-gray-50 border border-gray-100 text-sm rounded-lg p-2 outline-none" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Toutes Catégories</option>
            <option value="Mode">Mode</option>
            <option value="Beauty">Beauty</option>
        </select>

        <select className="bg-gray-50 border border-gray-100 text-sm rounded-lg p-2 outline-none" value={ageFilter} onChange={e => setAgeFilter(e.target.value)}>
            <option value="0">Tout Âge</option>
            <option value="3">+3 Mois</option>
            <option value="6">+6 Mois</option>
        </select>
      </div>

      {/* 2. TABLEAU */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                        {hg.headers.map(h => (
                            <th key={h.id} className="p-4 border-b border-gray-100 cursor-pointer" onClick={h.column.getToggleSortingHandler()}>
                                {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
                {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map(row => (
                        <tr key={row.id} className={`hover:bg-blue-50/50 ${row.getIsSelected() ? 'bg-blue-50' : ''}`}>
                            {row.getVisibleCells().map(cell => <td key={cell.id} className="p-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan={columns.length} className="p-8 text-center text-gray-400">Aucun résultat.</td></tr>
                )}
            </tbody>
        </table>
        {/* Pagination */}
        <div className="p-4 flex justify-between items-center bg-gray-50/30">
             <div className="flex gap-2">
                <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronLeft size={16}/></button>
                <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="p-2 rounded hover:bg-gray-200 disabled:opacity-30"><ChevronRight size={16}/></button>
             </div>
             <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
                <select 
                    value={table.getState().pagination.pageSize} 
                    onChange={e => table.setPageSize(Number(e.target.value))}
                    className="bg-transparent border-none outline-none font-bold"
                >
                    {[6, 10, 20, 50].map(pz => <option key={pz} value={pz}>{pz} / page</option>)}
                </select>
             </div>
        </div>
      </div>

      {/* 3. BARRE VALIDATION (Simulateur de prix inclus) */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
            <div className="flex items-center gap-6">
                <div><div className="text-xs text-gray-400 uppercase font-bold">Sélection</div><div className="text-xl font-bold text-gray-900">{selectedCount}</div></div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div><div className="text-xs text-gray-400 uppercase font-bold">Stock Impacté</div><div className="text-xl font-bold text-blue-600">{totalStockSelected}</div></div>
            </div>

            <div className="flex items-center gap-4 flex-1 justify-end">
                <input type="text" placeholder="Nom Campagne (ex: Liquidation)" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 w-64 outline-none focus:ring-2 focus:ring-blue-500" value={promoName} onChange={e => setPromoName(e.target.value)}/>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2 py-1">
                    {[10, 20, 25, 35, 50].map(p => (
                        <button key={p} onClick={() => setDiscount(p)} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${discount === p ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-200'}`}>-{p}%</button>
                    ))}
                    <input type="number" placeholder="%" className="w-12 text-center bg-transparent outline-none text-sm font-bold" value={discount} onChange={e => setDiscount(Number(e.target.value))}/>
                </div>
                <button onClick={handleSubmit} disabled={isSubmitting || selectedCount === 0 || !promoName || !discount} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />} Lancer
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}