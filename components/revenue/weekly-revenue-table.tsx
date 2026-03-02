'use client'

import React, { useMemo, useState } from 'react';
import { 
  useReactTable, 
  getCoreRowModel, 
  getExpandedRowModel, 
  flexRender, 
  createColumnHelper, 
  ExpandedState,
  Row 
} from '@tanstack/react-table';
import { ChevronRight, ChevronDown, Plus } from 'lucide-react';

// --- 1. DÉFINITION DES TYPES ---

export interface WeeklyData {
  boutique: string; // Nom du segment ou de la boutique
  weeks: Record<string, number>; // Dictionnaire : "Semaine 1": 1200
  subRows?: WeeklyData[]; // Structure récursive pour les sous-catégories
}

// Typage strict du helper de colonne
const columnHelper = createColumnHelper<WeeklyData>();

// --- 2. UTILITAIRES ---

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '—';
  // Utilisation de Intl pour un formatage robuste et performant
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

// --- 3. COMPOSANT PRINCIPAL ---

interface WeeklyRevenueTableProps {
  data: WeeklyData[];
}

export function WeeklyRevenueTable({ data }: WeeklyRevenueTableProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Extraction unique et triée des clés de semaines (Semaine 1, Semaine 2...)
  const allWeeks = useMemo(() => {
    const weeksSet = new Set<string>();
    
    // Fonction récursive pour trouver toutes les semaines même dans les sous-niveaux
    const traverse = (items: WeeklyData[]) => {
      items.forEach(item => {
        if (item.weeks) Object.keys(item.weeks).forEach(w => weeksSet.add(w));
        if (item.subRows) traverse(item.subRows);
      });
    };
    
    traverse(data);

    // Tri naturel (Semaine 2 après Semaine 1, et non Semaine 10 avant Semaine 2)
    return Array.from(weeksSet).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data]);

  // Définition des colonnes
  const columns = useMemo(() => [
    // Colonne "Maitre" (Hiérarchie)
    columnHelper.accessor('boutique', {
      header: 'Boutique / Segment',
      cell: ({ row, getValue }) => <HierarchyCell row={row} value={getValue()} />,
    }),
    
    // Colonnes Dynamiques (Semaines)
    ...allWeeks.map(week => 
      columnHelper.accessor(row => row.weeks?.[week], { // Accesseur sécurisé
        id: week, // ID explicite requis pour les accesseurs fonctionnels
        header: week,
        cell: info => {
          const val = info.getValue();
          const isParent = info.row.depth === 0;
          return (
            <span className={isParent ? "font-bold text-slate-800" : "text-slate-400 text-[10px]"}>
               {formatCurrency(val)}
            </span>
          );
        }
      })
    )
  ], [allWeeks]);

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // Calcul des totaux (Optimisé pour ne calculer que sur les lignes racines visible)
  const totals = useMemo(() => {
    // On initialise l'objet totals avec 0 pour chaque semaine connue
    const acc: Record<string, number> = {};
    allWeeks.forEach(w => acc[w] = 0);

    // On additionne uniquement les données de premier niveau (pour éviter les doublons si subRows)
    data.forEach(row => {
      allWeeks.forEach(week => {
        const val = row.weeks?.[week] || 0;
        acc[week] = (acc[week] || 0) + val;
      });
    });
    
    return acc;
  }, [data, allWeeks]);

  // Rendu défensif si pas de données
  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-slate-400 text-sm italic">Aucune donnée disponible pour cette période.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-150">
          
          {/* HEADERS */}
          <thead className="bg-slate-50 border-b border-gray-200">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th key={header.id} className="px-3 py-2 font-black text-slate-500 uppercase border-r border-slate-100 last:border-none whitespace-nowrap">
                    {header.isPlaceholder 
                      ? null 
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className={`transition-colors ${row.depth > 0 ? 'bg-slate-50/30 italic' : 'hover:bg-slate-50 font-bold'}`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-2 border-r border-slate-50 last:border-none whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* FOOTER (TOTAUX) */}
          <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
            <tr>
              <td className="px-3 py-2 uppercase tracking-tighter border-r border-slate-200">
                Total Flux
              </td>
              {allWeeks.map(week => (
                <td key={week} className="px-3 py-2 border-r border-slate-100 last:border-none whitespace-nowrap">
                  {formatCurrency(totals[week])}
                </td>
              ))}
            </tr>
          </tfoot>

        </table>
      </div>
    </div>
  );
}

// --- 4. SOUS-COMPOSANTS (Pour la lisibilité) ---

const HierarchyCell = ({ row, value }: { row: Row<WeeklyData>; value: string }) => {
  return (
    <div 
      style={{ paddingLeft: `${row.depth * 1.5}rem` }} 
      className="flex items-center gap-2"
    >
      {row.getCanExpand() ? (
        <button 
          onClick={row.getToggleExpandedHandler()} 
          className="cursor-pointer focus:outline-none p-0.5 rounded hover:bg-slate-200 transition"
        >
          {row.getIsExpanded() 
            ? <ChevronDown size={14} className="text-emerald-600"/> 
            : <ChevronRight size={14} className="text-slate-400"/>
          }
        </button>
      ) : (
        // Espace réservé pour alignement si pas d'expansion
        row.depth > 0 && <span className="w-3.5 flex justify-center"><Plus size={8} className="text-slate-300" /></span>
      )}
      
      <span className={row.depth === 0 ? "font-black text-slate-900 uppercase italic tracking-tighter" : "text-slate-500 font-medium text-[10px]"}>
        {value}
      </span>
    </div>
  );
};