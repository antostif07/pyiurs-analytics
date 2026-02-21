'use client'

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const MONTHS = [
  { val: "01", label: "Janvier" }, { val: "02", label: "Février" },
  { val: "03", label: "Mars" }, { val: "04", label: "Avril" },
  { val: "05", label: "Mai" }, { val: "06", label: "Juin" },
  { val: "07", label: "Juillet" }, { val: "08", label: "Août" },
  { val: "09", label: "Septembre" }, { val: "10", label: "Octobre" },
  { val: "11", label: "Novembre" }, { val: "12", label: "Décembre" }
];

export function RevenueDateFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 1. Récupérer les valeurs depuis l'URL ou utiliser la date actuelle par défaut
  const currentMonth = searchParams.get("month") || format(new Date(), "MM")
  const currentYear = searchParams.get("year") || format(new Date(), "yyyy")

  // 2. Générer la liste des années (de l'année actuelle jusqu'à 2018)
  const years = React.useMemo(() => {
    const year = new Date().getFullYear()
    return Array.from({ length: year - 2018 + 1 }, (_, i) => (year - i).toString())
  }, [])

  // 3. Fonction de mise à jour de l'URL
  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    // On repousse vers l'URL sans recharger la page complète (soft navigation)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm items-center h-10">
        <div className="flex items-center px-3 text-emerald-600 border-r border-slate-100 mr-1">
          <CalendarIcon size={14} />
        </div>
        
        {/* SELECT MOIS */}
        <Select value={currentMonth} onValueChange={(v) => updateUrl("month", v)}>
          <SelectTrigger className="w-30 border-none bg-transparent font-bold text-xs shadow-none focus:ring-0 uppercase tracking-tighter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
            {MONTHS.map(m => (
              <SelectItem key={m.val} value={m.val} className="text-xs font-bold uppercase italic">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* SELECT ANNÉE */}
        <Select value={currentYear} onValueChange={(v) => updateUrl("year", v)}>
          <SelectTrigger className="w-21.25 border-none bg-transparent font-black text-emerald-600 text-xs shadow-none focus:ring-0 tracking-tighter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
            {years.map(y => (
              <SelectItem key={y} value={y} className="text-xs font-black">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* BOUTON REFRESH (Visual only since Select is reactive) */}
      <Button 
        variant="ghost" 
        size="icon"
        className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-emerald-600 transition-all active:rotate-180 duration-500"
      >
        <RefreshCw size={16} />
      </Button>
    </div>
  )
}