'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, Palette, Layers, RefreshCcw, Tag } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"    
import MultipleSelector, { Option } from '../ui/multiselect'

interface RevenueSmartFilterProps {
  categories: Option[];
  colors: Option[];
  brands?: Option[];
  suppliers?: Option[];
}

export function RevenueSmartFilter({ 
  categories, 
  colors, 
  brands = [], 
  suppliers = [] 
}: RevenueSmartFilterProps) {

  const router = useRouter()
  const searchParams = useSearchParams()

  const getOptionsFromParams = (key: string, allOptions: Option[]) => {
    const params = searchParams.get(key)?.split(',') || []
    return allOptions.filter(opt => params.includes(opt.value))
  }

  const selectedCategories = useMemo(() => getOptionsFromParams('category', categories), [searchParams, categories])
  const selectedColors = useMemo(() => getOptionsFromParams('color', colors), [searchParams, colors])
  const selectedBrands = useMemo(() => getOptionsFromParams('brand', brands), [searchParams, brands])
  const selectedSuppliers = useMemo(() => getOptionsFromParams('supplier', suppliers), [searchParams, suppliers])

  const updateUrl = (updates: Record<string, Option[] | string | null>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.length > 0
          ? params.set(key, value.map(v => v.value).join(','))
          : params.delete(key)
      } else if (typeof value === 'string') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`?${params.toString()}`, { scroll: false })
  }

  const activeFiltersCount = Array.from(searchParams.keys())
    .filter(k => !['month','year','q'].includes(k)).length

  return (
    <div className="flex items-center gap-2 w-full">

      {/* SEARCH */}
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="HS Code ou Modèle..."
          defaultValue={searchParams.get('q') || ''}
          onKeyDown={(e: any) =>
            e.key === 'Enter' && updateUrl({ q: e.target.value })
          }
          className="w-full pl-9 pr-3 h-9 bg-slate-100 rounded-xl text-[11px] font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
        />
      </div>

      {/* FILTER POPOVER */}
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline"
            className="h-9 rounded-xl text-[11px] font-semibold relative px-4 border-slate-200"
          >
            <Filter size={14} className="mr-2 text-indigo-600" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px]">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          align="end"
          className="w-105 p-5 rounded-3xl shadow-xl border border-slate-100 space-y-4"
        >

          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Filtres avancés
            </h4>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(window.location.pathname)}
              className="h-7 text-[10px] text-rose-500 hover:bg-rose-50 rounded-lg"
            >
              Effacer
            </Button>
          </div>

          {/* GRID FILTERS */}
          <div className="grid grid-cols-2 gap-3">

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

          {/* ACTION */}
          <Button 
            className="w-full h-9 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-semibold gap-2"
          >
            <RefreshCcw size={13} /> Actualiser
          </Button>

        </PopoverContent>
      </Popover>
    </div>
  )
}

interface FilterFieldProps {
  label: string;
  icon: React.ReactNode;
  options: Option[];
  value: Option[];
  onChange: (options: Option[]) => void;
}

function FilterField({ label, icon, options, value, onChange }: FilterFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] uppercase text-slate-400 flex items-center gap-1 font-semibold tracking-wide">
        {icon} {label}
      </label>

      <MultipleSelector
        value={value}
        options={options}
        onChange={onChange}
        placeholder="Sélectionner..."
        className="bg-slate-100 border-none rounded-xl text-[11px] min-h-8"
        badgeClassName="bg-indigo-600 text-white text-[9px] h-5"
        commandProps={{
          className: "overflow-visible bg-transparent",
          shouldFilter: true
        }}
      />
    </div>
  )
}