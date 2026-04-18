"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  RefreshCw,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; 
import { format, subDays, startOfToday, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSansCode } from "@/hooks/useSansCode";

const DATE_PRESETS = [
  { label: "Aujourd'hui", value: "today", days: 0 },
  { label: "7 Jours", value: "7d", days: 7 },
  { label: "Ce Mois", value: "30d", days: -1 }, // On l'utilise pour le mois actuel
] as const;

export default function DashboardHeader({ onExport }: { onExport: (f: "CSV" | "PDF") => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Hook de synchronisation Odoo
  const { refreshAll, lastUpdatedAt, isLoading } = useSansCode();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // 1. Récupération des dates depuis l'URL
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const currentPreset = searchParams.get("preset") || "30d";
  
  const dateRange: DateRange = {
    from: fromParam ? parseISO(fromParam) : startOfMonth(new Date()),
    to: toParam ? parseISO(toParam) : endOfMonth(new Date()),
  };

  // 2. Mise à jour de l'URL
  const updateUrl = (from: Date, to: Date, preset: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("from", format(from, "yyyy-MM-dd"));
    params.set("to", format(to, "yyyy-MM-dd"));
    params.set("preset", preset);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 3. Gestion des Presets
  const handlePresetClick = (p: typeof DATE_PRESETS[number]) => {
    let from: Date, to: Date;

    if (p.value === "30d") {
      from = startOfMonth(new Date());
      to = endOfMonth(new Date());
    } else {
      from = subDays(startOfToday(), p.days);
      to = new Date();
    }
    updateUrl(from, to, p.value);
  };

  // 4. Gestion du Calendrier Custom
  const handleCustomDateSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      updateUrl(range.from, range.to, "custom");
    }
  };

  // 5. Rafraîchissement manuel TanStack + Odoo
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refreshAll();
      toast.success("Synchronisation Odoo réussie", {
        description: "Les données ont été mises à jour. Le rapport se rafraîchira automatiquement."
      });
    } catch (e) {
      toast.error("Échec de la synchronisation");
    } finally {
      setIsManualRefreshing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/50 pb-6"
    >
      {/* GAUCHE : Titre et Status de Connexion */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Rapport des sans code</h1>  
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <p>
            {lastUpdatedAt 
                ? `Mis à jour à ${format(lastUpdatedAt, "HH:mm:ss", { locale: fr })}` 
                : "Synchronisation en cours..."}
          </p>
        </div>
      </div>

      {/* DROITE : Contrôles et Filtres Temporels */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Sélecteur de Presets Rapides */}
        <div className="flex items-center gap-1 bg-muted/50 border border-border p-1 rounded-xl">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePresetClick(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                currentPreset === p.value
                  ? "bg-background text-primary shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {p.label}
            </button>
          ))}

          {/* Calendrier Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2",
                  currentPreset === "custom"
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                {currentPreset === "custom" ? "Personnalisé" : "Custom"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={handleCustomDateSelect}
                numberOfMonths={2}
                locale={fr}
                className="p-3"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="h-8 w-[1px] bg-border mx-1 hidden lg:block" />

        {/* Info Période et Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden xl:flex flex-col items-end mr-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Période d'analyse</span>
            <span className="text-xs font-medium">
              {dateRange.from ? format(dateRange.from, "dd MMM", { locale: fr }) : "?"} 
              {" — "} 
              {dateRange.to ? format(dateRange.to, "dd MMM yyyy", { locale: fr }) : "En cours"}
            </span>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 gap-2 text-xs border-border hover:bg-accent"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || isLoading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isManualRefreshing || isLoading) && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 gap-2 px-4 shadow-sm active:scale-95 transition-transform">
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exporter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl shadow-xl">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1.5">
                Format du rapport
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport("CSV")} className="rounded-lg cursor-pointer py-2">
                Données Brutes (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("PDF")} className="rounded-lg cursor-pointer py-2">
                Rapport Visuel (PDF)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}