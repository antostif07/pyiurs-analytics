'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, Palette, Layers, RefreshCcw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"    
import MultipleSelector, {Option} from '../ui/multiselect'

interface RevenueSmartFilterProps {
    categories: Option[];
    colors: Option[];
}

export function RevenueSmartFilter({ categories, colors }: RevenueSmartFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const getOptionsFromParams = (key: string, allOptions: Option[]) => {
    const params = searchParams.get(key)?.split(',') || []
    return allOptions.filter(opt => params.includes(opt.value))
  }

  const selectedCategories = useMemo(() => getOptionsFromParams('category', categories), [searchParams, categories])
  const selectedColors = useMemo(() => getOptionsFromParams('color', colors), [searchParams, colors])

  const updateUrl = (updates: Record<string, Option[] | string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) params.set(key, value.map(v => v.value).join(','))
        else params.delete(key)
      } else if (typeof value === 'string') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const activeFiltersCount = Array.from(searchParams.keys()).filter(k => k !== 'month' && k !== 'year').length

  return (
    <div className="flex items-center gap-2 w-full">
        {/* RECHERCHE GLOBALE */}
        <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500" size={16} />
            <input 
                placeholder="HS Code ou Modèle..."
                defaultValue={searchParams.get('q') || ''}
                onKeyDown={(e: any) => e.key === 'Enter' && updateUrl({ q: e.target.value })}
                className="w-full pl-10 pr-4 h-10 bg-slate-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-rose-500/10 outline-none transition-all"
            />
        </div>

        {/* POPOVER DE FILTRES MULTIPLES */}
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest relative px-4">
                    <Filter size={14} className="mr-2 text-indigo-600" />
                    Filtrage Avancé
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[8px] animate-in zoom-in">
                            {activeFiltersCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-6 rounded-4xl shadow-2xl border-slate-100 space-y-6" align="end">
                <div className="flex items-center justify-between">
                    <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Options de tri</h4>
                    <Button variant="ghost" size="sm" onClick={() => router.push(window.location.pathname)} className="h-6 text-[8px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-lg">
                        Effacer tout
                    </Button>
                </div>
                
                <div className="space-y-4">
                    <FilterField 
                        label="Catégories" 
                        icon={<Layers size={12}/>} 
                        options={categories}
                        value={selectedCategories}
                        onChange={(vals) => updateUrl({ category: vals })}
                    />

                    <FilterField 
                        label="Couleurs / Gammes" 
                        icon={<Palette size={12}/>} 
                        options={colors}
                        value={selectedColors}
                        onChange={(vals) => updateUrl({ color: vals })}
                    />
                </div>

                <div className="pt-4 border-t border-slate-50">
                    <Button onClick={() => {/* Trigger manual refresh if needed */}} className="w-full bg-slate-900 hover:bg-black text-white h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2">
                        <RefreshCcw size={12} /> Actualiser les données
                    </Button>
                </div>
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
  placeholder?: string;
}

function FilterField({ label, icon, options, value, onChange, placeholder }: FilterFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1 tracking-widest">
        {icon} {label}
      </label>
      <MultipleSelector
        value={value}
        options={options} // On passe bien les options ici
        onChange={onChange}
        placeholder={placeholder || "Sélectionner..."}
        className="bg-slate-50 border-none rounded-xl text-[11px] min-h-9"
        badgeClassName="bg-indigo-600 text-white text-[9px] h-5"
        // Force la liste à sortir du Popover si nécessaire
        commandProps={{
            className: "overflow-visible bg-transparent", 
            shouldFilter: true // On laisse cmdk filtrer
        }}
        // Message si rien n'est trouvé
        emptyIndicator={
          <p className="text-center text-[10px] py-2 text-gray-400 font-bold uppercase">
            Aucune option trouvée
          </p>
        }
      />
    </div>
  )
}