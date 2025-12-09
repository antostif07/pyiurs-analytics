"use client";

import React, { useState } from "react";
import { 
  useReactTable, 
  getCoreRowModel, 
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender, 
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  Column
} from "@tanstack/react-table";
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Filter, X, EyeOff, 
  Check, Search, SlidersHorizontal, 
  Star,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp
} from "lucide-react";
import { AnalysisRow } from "../actions/stocks";
import ProductImage from "@/app/marketing/components/ProductImage";

// --- TYPES & UTILS ---

// Badge de Décision (Reste inchangé)
const DecisionBadge = ({ type }: { type: AnalysisRow['decision'] }) => {
  const config = {
    BEST_SELLER: { color: "bg-purple-100 text-purple-700 border-purple-200", label: "★ Best Seller", icon: Star },
    GOOD: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Performant", icon: TrendingUp },
    SLOW: { color: "bg-orange-100 text-orange-700 border-orange-200", label: "Lent", icon: Clock },
    DEAD: { color: "bg-red-100 text-red-700 border-red-200", label: "À Solder", icon: AlertTriangle },
    NEW: { color: "bg-blue-100 text-blue-700 border-blue-200", label: "Nouveauté", icon: Package },
  };
  const C = config[type];
  const Icon = C.icon;
  
  return (
    <div className={`flex items-center w-fit px-2.5 py-1 rounded-full border text-xs font-bold ${C.color}`}>
      <Icon className="w-3 h-3 mr-1.5" />
      {C.label}
    </div>
  );
};

// --- COMPOSANT: HEADER MENU (Le coeur du "Supabase-like") ---
// C'est un mini dropdown maison pour éviter d'installer 10 libs externes
function ColumnHeader<TData, TValue>({ column, title, isFacet = false }: { column: Column<TData, TValue>, title: string, isFacet?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterValue, setFilterValue] = useState((column.getFilterValue() as string) ?? "");

  // Pour fermer le menu si on clique ailleurs (basic simulation)
  React.useEffect(() => {
    const close = () => setIsOpen(false);
    if(isOpen) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [isOpen]);

  const handleSort = (direction: 'asc' | 'desc') => {
    column.toggleSorting(direction === 'desc');
  };

  return (
    <div className="flex items-center space-x-2 relative" onClick={(e) => e.stopPropagation()}>
      <div className="flex-1 text-xs font-semibold uppercase text-slate-500">{title}</div>
      
      {/* Bouton Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded hover:bg-slate-200 transition-colors ${column.getIsSorted() || column.getFilterValue() ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}
      >
        {column.getIsSorted() === 'desc' ? <ArrowDown className="w-3 h-3"/> : column.getIsSorted() === 'asc' ? <ArrowUp className="w-3 h-3"/> : <SlidersHorizontal className="w-3 h-3"/>}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-8 left-0 z-50 w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-2 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
          
          {/* Section Tri */}
          <div className="mb-2 space-y-1">
            <button onClick={() => handleSort('asc')} className="flex items-center w-full px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded">
              <ArrowUp className="w-3 h-3 mr-2 text-slate-400"/> Trier croissant
            </button>
            <button onClick={() => handleSort('desc')} className="flex items-center w-full px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded">
              <ArrowDown className="w-3 h-3 mr-2 text-slate-400"/> Trier décroissant
            </button>
          </div>

          <div className="h-px bg-slate-100 my-1" />

          {/* Section Filtre */}
          <div className="p-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Filtrer</div>
            {isFacet ? (
               // Filtre Spécial pour "Decision" (Select)
               <div className="space-y-1">
                 {['BEST_SELLER', 'NEW', 'DEAD', 'SLOW', 'GOOD'].map(status => (
                   <label key={status} className="flex items-center px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                     <input 
                       type="checkbox" 
                       checked={(column.getFilterValue() as string[])?.includes(status)}
                       onChange={(e) => {
                         const current = (column.getFilterValue() as string[]) || [];
                         const newVal = e.target.checked 
                           ? [...current, status] 
                           : current.filter(s => s !== status);
                         column.setFilterValue(newVal.length ? newVal : undefined);
                       }}
                       className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3 mr-2"
                     />
                     <span className="text-xs text-slate-700 capitalize">{status.replace('_', ' ').toLowerCase()}</span>
                   </label>
                 ))}
               </div>
            ) : (
               // Filtre Standard (Texte)
               <input
                autoFocus
                type="text"
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  column.setFilterValue(e.target.value);
                }}
                placeholder="Rechercher..."
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
          
          {/* Section Masquer */}
           <div className="h-px bg-slate-100 my-1" />
           <button onClick={() => column.toggleVisibility(false)} className="flex items-center w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded">
              <EyeOff className="w-3 h-3 mr-2"/> Masquer la colonne
           </button>
        </div>
      )}
    </div>
  );
}

// --- MAIN TABLE COMPONENT ---
export default function PerformanceTable({ data }: { data: AnalysisRow[] }) {
    console.log(data);
    
  // --- States TanStack ---
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columnHelper = createColumnHelper<AnalysisRow>();

  // --- Définition des Colonnes ---
  const columns = [
    columnHelper.accessor("image_url", {
      id: "image",
      header: () => <span className="text-xs font-semibold text-slate-500 uppercase">Aperçu</span>,
      cell: (info) => (
        <div className="w-12 h-16 bg-white rounded border border-slate-100 overflow-hidden shrink-0">
          <ProductImage 
            src={info.getValue()} 
            alt={info.row.original.name} 
          />
        </div>
      ),
      enableSorting: false, // Pas de tri sur l'image
      enableColumnFilter: false, // Pas de filtre sur l'image
    }),
    columnHelper.accessor("name", {
      id: "name",
      header: ({ column }) => <ColumnHeader column={column} title="Modèle" />,
      cell: (info) => (
        <div>
          <div className="font-semibold text-slate-900">{info.getValue()}</div>
          <div className="text-[10px] text-slate-400 font-mono">{info.row.original.hs_code}</div>
        </div>
      ),
    }),
    columnHelper.accessor("create_date", {
      id: "date",
      header: ({ column }) => <ColumnHeader column={column} title="Date Sortie" />,
      cell: (info) => <span className="text-slate-500 text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor("total_sold", {
      id: "sold",
      header: ({ column }) => <ColumnHeader column={column} title="Ventes" />,
      cell: (info) => <span className="font-bold text-slate-800">{info.getValue()}</span>,
    }),
    columnHelper.accessor("total_revenue", {
      id: "revenue",
      header: ({ column }) => <ColumnHeader column={column} title="CA ($)" />,
      cell: (info) => <span className="text-slate-600 font-medium">{info.getValue().toLocaleString()} $</span>,
    }),
    columnHelper.accessor("velocity", {
      id: "velocity",
      header: ({ column }) => <ColumnHeader column={column} title="Vitesse/Sem" />,
      cell: (info) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{info.getValue()} /sem</span>
          <span className="text-[10px] text-slate-400">
             sur {info.row.original.days_on_market} jours
          </span>
        </div>
      ),
    }),
    columnHelper.accessor("current_stock", {
      id: "stock",
      header: ({ column }) => <ColumnHeader column={column} title="Stock" />,
      cell: (info) => {
        const stock = info.getValue();
        return <span className={`${stock === 0 ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{stock}</span>;
      }
    }),
    columnHelper.accessor("decision", {
      id: "decision",
      header: ({ column }) => <ColumnHeader column={column} title="Rapport" isFacet={true} />,
      cell: (info) => <DecisionBadge type={info.getValue()} />,
      filterFn: (row, id, value: string[]) => {
         // Logique personnalisée pour le filtre Facette (est-ce que la valeur est dans le tableau selectionné ?)
         if (!value || value.length === 0) return true;
         return value.includes(row.getValue(id));
      }
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(), // Important pour que les filtres marchent
    getSortedRowModel: getSortedRowModel(),     // Important pour que le tri marche
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } }
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
      
      {/* 1. Zone de Filtres Actifs (Barre d'outils dynamique) */}
      {(columnFilters.length > 0 || Object.keys(columnVisibility).length > 0) && (
         <div className="px-4 py-2 border-b border-slate-50 bg-slate-50/50 flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-2 flex items-center">
               <Filter className="w-3 h-3 mr-1"/> Filtres actifs:
            </span>
            
            {columnFilters.map((filter) => (
               <div key={filter.id} className="flex items-center bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 shadow-sm">
                  <span className="font-semibold mr-1 capitalize">{filter.id}:</span> 
                  {Array.isArray(filter.value) ? filter.value.join(", ").toLowerCase() : filter.value as string}
                  <button 
                    onClick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
                    className="ml-2 text-slate-400 hover:text-red-500"
                  >
                     <X className="w-3 h-3" />
                  </button>
               </div>
            ))}

            {columnFilters.length > 0 && (
              <button 
                onClick={() => setColumnFilters([])}
                className="text-xs text-indigo-600 hover:underline ml-auto font-medium"
              >
                Tout effacer
              </button>
            )}
         </div>
      )}

      {/* 2. Le Tableau */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-3 border-b border-slate-100 group relative hover:bg-slate-50 transition-colors">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="text-sm divide-y divide-slate-50">
            {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                    ))}
                </tr>
                ))
            ) : (
                <tr>
                    <td colSpan={columns.length} className="px-6 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center">
                            <Search className="w-8 h-8 mb-2 opacity-20"/>
                            <p>Aucun résultat ne correspond à vos filtres.</p>
                        </div>
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* 3. Pagination Footer */}
      <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white text-xs text-slate-500">
          <div>
            {table.getFilteredRowModel().rows.length} résultat(s)
          </div>
          <div className="flex gap-2">
            <button 
                onClick={() => table.previousPage()} 
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Précédent
            </button>
            <button 
                onClick={() => table.nextPage()} 
                disabled={!table.getCanNextPage()}
                className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Suivant
            </button>
          </div>
      </div>
    </div>
  );
}