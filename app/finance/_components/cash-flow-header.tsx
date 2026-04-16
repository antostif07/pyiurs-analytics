"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Download, RefreshCw, Clock, Calendar as CalendarIcon, 
  Banknote, ChevronLeft, ChevronRight, Target 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; 
import { format, subDays, startOfToday, parseISO, addDays, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export default function CashFlowHeader({ onExport }: { onExport: (f: "CSV" | "PDF") => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Date sélectionnée (URL ou Aujourd'hui par défaut)
  const dateParam = searchParams.get("date");
  const selectedDate = dateParam ? parseISO(dateParam) : startOfToday();
  const isToday = isSameDay(selectedDate, startOfToday());

  // 2. Mise à jour de l'URL pour un jour unique
  const updateUrl = (date: Date) => {
    const params = new URLSearchParams(searchParams);
    const dateStr = format(date, "yyyy-MM-dd");
    params.set("date", dateStr);
    params.set("selectedDate", dateStr); // Pour l'action Odoo
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -12 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/50 pb-6"
    >
      {/* GAUCHE : Titre */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
            <Banknote className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Position de Caisse</h1>
          <Badge variant={isToday ? "default" : "outline"} className={cn(
            isToday ? "bg-emerald-500" : "text-amber-600 border-amber-200 bg-amber-50"
          )}>
            {isToday ? "En Direct" : "Archive"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
          <Clock className="w-3.5 h-3.5" /> 
          {isToday ? "Situation actuelle des flux" : `Archives du ${format(selectedDate, "dd MMMM yyyy", { locale: fr })}`}
        </p>
      </div>

      {/* DROITE : Sélecteur de date Unique & Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Contrôles de Date */}
        <div className="flex items-center bg-muted/50 border border-border p-1 rounded-xl">
          {/* Bouton Aujourd'hui (Preset unique) */}
          <button
            onClick={() => updateUrl(startOfToday())}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
              isToday 
                ? "bg-background text-indigo-600 shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Aujourd'hui
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          {/* Navigation jour par jour */}
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateUrl(subDays(selectedDate, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2",
                  !isToday && "bg-background text-indigo-600 shadow-sm"
                )}>
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span className="min-w-[80px]">
                    {isToday ? "Choisir date" : format(selectedDate, "dd MMM yyyy", { locale: fr })}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl border-border" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && updateUrl(date)}
                  disabled={(date) => date > new Date()} // Empêche de choisir le futur
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>

            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-md" 
              onClick={() => updateUrl(addDays(selectedDate, 1))}
              disabled={isToday}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-border mx-1 hidden lg:block" />

        {/* Actions de rafraîchissement et Export */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 w-9 p-0 border-border" 
            onClick={() => {
              setIsRefreshing(true);
              setTimeout(() => { setIsRefreshing(false); toast.success("Données de caisse actualisées"); }, 800);
            }}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-2 px-4 bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-xl">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl">
              <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1.5 tracking-tighter">Options Export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport("CSV")} className="rounded-lg text-xs font-medium cursor-pointer">Relevé de Caisse (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("PDF")} className="rounded-lg text-xs font-medium cursor-pointer">Bilan Journalier (PDF)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}