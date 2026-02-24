'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X, ChevronDown, Tag, Palette, User, Layers } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export function RevenueSmartFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inputValue, setInputValue] = useState(searchParams.get('q') || '')

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => router.push(window.location.pathname)

  const activeFiltersCount = Array.from(searchParams.keys()).filter(k => k !== 'month' && k !== 'year').length

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
          <Input 
            placeholder="Rechercher par HS Code ou Nom..." 
            className="pl-10 h-11 rounded-2xl border-slate-200 bg-white shadow-sm italic font-medium"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && updateFilters({ q: inputValue })}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11 rounded-2xl gap-2 border-slate-200 font-bold text-xs uppercase tracking-widest relative">
              <Filter size={16} />
              Filtres
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 rounded-[28px] shadow-2xl border-slate-100" align="end">
            <div className="space-y-4">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-4">Filtres Avancés</h4>
              
              <div className="space-y-3">
                <FilterField label="Catégorie Odoo" icon={<Layers size={14}/>} 
                  value={searchParams.get('category') || ''}
                  onSelect={(v: any) => updateFilters({ category: v })} 
                />
                <FilterField label="Couleur" icon={<Palette size={14}/>} 
                  value={searchParams.get('color') || ''}
                  onSelect={(v: any) => updateFilters({ color: v })} 
                />
                <FilterField label="ID Client (Partner)" icon={<User size={14}/>} 
                  value={searchParams.get('partner') || ''}
                  onSelect={(v: any) => updateFilters({ partner: v })} 
                />
              </div>

              <Button onClick={clearFilters} variant="ghost" className="w-full text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-xl">
                Réinitialiser
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* CHIPS DES FILTRES ACTIFS */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1">
          {Array.from(searchParams.entries()).map(([key, value]) => {
            if (key === 'month' || key === 'year') return null
            return (
              <Badge key={key} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none px-3 py-1 rounded-full text-[10px] font-bold flex gap-2 items-center capitalize">
                {key}: {value}
                <X size={12} className="cursor-pointer" onClick={() => updateFilters({ [key]: null })} />
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilterField({ label, icon, value, onSelect }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                {icon} {label}
            </label>
            <Input 
                className="h-9 rounded-xl bg-slate-50 border-none text-xs font-bold"
                value={value}
                placeholder="Saisir..."
                onKeyDown={(e: any) => e.key === 'Enter' && onSelect(e.target.value)}
            />
        </div>
    )
}