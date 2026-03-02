'use client'

import React, { useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Filter, Palette, Layers, RefreshCcw, Tag } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"    
import MultipleSelector, { Option } from '../ui/multiselect'

// --- DEFINITION DES TYPES ---

interface RevenueSmartFilterProps {
  categories: Option[];
  colors: Option[];
  brands?: Option[];
  suppliers?: Option[];
}

type UpdateValue = string | Option[] | null | undefined;

// --- COMPOSANT PRINCIPAL ---

export function RevenueSmartFilter({ 
  categories, 
  colors, 
  brands = [], 
  suppliers = [] 
}: RevenueSmartFilterProps) {

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // --- LOGIQUE DE RECUPERATION ---

  /**
   * Récupère les options sélectionnées basées sur les paramètres URL actuels.
   * Memoization via useCallback pour éviter les recréations inutiles.
   */
  const getOptionsFromParams = useCallback((key: string, allOptions: Option[]): Option[] => {
    const paramValue = searchParams.get(key);
    if (!paramValue) return [];
    
    const selectedValues = paramValue.split(',');
    return allOptions.filter(opt => selectedValues.includes(opt.value));
  }, [searchParams]);

  // Calcul des valeurs actuelles (Memoizé pour la performance si les listes sont longues)
  const selectedCategories = useMemo(() => getOptionsFromParams('category', categories), [getOptionsFromParams, categories]);
  const selectedColors = useMemo(() => getOptionsFromParams('color', colors), [getOptionsFromParams, colors]);
  const selectedBrands = useMemo(() => getOptionsFromParams('brand', brands), [getOptionsFromParams, brands]);
  const selectedSuppliers = useMemo(() => getOptionsFromParams('supplier', suppliers), [getOptionsFromParams, suppliers]);

  // --- LOGIQUE DE MISE A JOUR ---

  /**
   * Met à jour l'URL sans recharger la page.
   * Gère les tableaux (MultipleSelector) et les chaînes simples (Search).
   */
  const updateUrl = useCallback((updates: Record<string, UpdateValue>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      // Cas 1 : Tableau d'options (Multiselect)
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.map(v => v.value).join(','));
        } else {
          params.delete(key);
        }
      } 
      // Cas 2 : Chaîne de caractères (Search input)
      else if (typeof value === 'string' && value.trim() !== '') {
        params.set(key, value);
      } 
      // Cas 3 : Null/Undefined ou chaîne vide -> Suppression
      else {
        params.delete(key);
      }
    });

    // Reset de la pagination à chaque changement de filtre (bonne pratique UX)
    if (params.has('page')) params.set('page', '1');

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateUrl({ q: e.currentTarget.value });
    }
  };

  const handleClearAll = () => {
    router.push(pathname, { scroll: false });
  };

  const activeFiltersCount = Array.from(searchParams.keys())
    .filter(k => !['month', 'year', 'q', 'page'].includes(k)).length;

  return (
    <div className="flex items-center gap-2 w-full">

      {/* SEARCH INPUT */}
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="HS Code ou Modèle..."
          defaultValue={searchParams.get('q') || ''}
          onKeyDown={handleSearchKeyDown}
          className="w-full pl-9 pr-3 h-9 bg-slate-100 rounded-xl text-[11px] font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition placeholder:text-slate-400"
        />
      </div>

      {/* FILTER POPOVER */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline"
            className="h-9 rounded-xl text-[11px] font-semibold relative px-4 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
          >
            <Filter size={14} className="mr-2 text-indigo-600" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] shadow-sm ring-2 ring-white">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          align="end"
          className="w-105 p-5 rounded-3xl shadow-xl border border-slate-100 space-y-4 bg-white/95 backdrop-blur-sm"
        >

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Configuration des filtres
            </h4>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 text-[10px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-md px-2"
            >
              Tout effacer
            </Button>
          </div>

          {/* GRID FILTERS */}
          <div className="grid grid-cols-2 gap-4">

            <FilterField
              label="Catégories"
              icon={<Layers size={12} />}
              options={categories}
              value={selectedCategories}
              onChange={(vals) => updateUrl({ category: vals })}
            />

            <FilterField
              label="Couleurs"
              icon={<Palette size={12} />}
              options={colors}
              value={selectedColors}
              onChange={(vals) => updateUrl({ color: vals })}
            />

            <FilterField
              label="Marques"
              icon={<Tag size={12} />}
              options={brands}
              value={selectedBrands}
              onChange={(vals) => updateUrl({ brand: vals })}
            />

            <FilterField
              label="Fournisseurs"
              icon={<Tag size={12} />}
              options={suppliers}
              value={selectedSuppliers}
              onChange={(vals) => updateUrl({ supplier: vals })}
            />

          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-2">
            <Button 
              onClick={() => router.refresh()}
              className="w-full h-9 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-semibold gap-2 shadow-lg shadow-slate-200"
            >
              <RefreshCcw size={13} /> Appliquer les filtres
            </Button>
          </div>

        </PopoverContent>
      </Popover>
    </div>
  )
}

// --- SOUS-COMPOSANT DE CHAMP ---

interface FilterFieldProps {
  label: string;
  icon: React.ReactNode;
  options: Option[];
  value: Option[];
  onChange: (options: Option[]) => void;
}

function FilterField({ label, icon, options, value, onChange }: FilterFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] uppercase text-slate-500 flex items-center gap-1.5 font-bold tracking-wide pl-1">
        <span className="text-indigo-500">{icon}</span> {label}
      </label>

      <MultipleSelector
        value={value}
        options={options}
        onChange={onChange}
        placeholder="Sélectionner..."
        className="bg-slate-50 border border-slate-200 rounded-xl text-[11px] min-h-9 py-1"
        badgeClassName="bg-indigo-600 text-white text-[9px] font-medium px-2 py-0.5 rounded-md"
        commandProps={{
          className: "overflow-visible bg-transparent p-1",
          shouldFilter: true
        }}
        // emptyIndicator peut être ajouté ici si le composant le supporte
        emptyIndicator={<p className="text-center text-[10px] text-gray-400 py-2">Aucune option</p>}
      />
    </div>
  )
}