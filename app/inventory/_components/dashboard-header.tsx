"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  RefreshCw,
  Clock,
  Calendar as CalendarIcon,
  FileSpreadsheet,
  FileText,
  Table,
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
import { format, subDays, startOfToday, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useInventory } from "@/app/inventory/_lib/hooks/use-inventory";
import { StockDashboardFilters } from "../stock-dashboard-client"; // ✅ Importation du type de filtres

const DATE_PRESETS = [
  { label: "Aujourd'hui", value: "today", days: 0 },
  { label: "7 Jours", value: "7d", days: 7 },
  { label: "Ce Mois", value: "30d", days: -1 },
] as const;

// ✅ Ajout de 'filters' dans l'interface des Props
interface DashboardHeaderProps {
  filters?: StockDashboardFilters;
  onExport: (format: "CSV" | "PDF" | "XLSX") => void;
}

export default function DashboardHeader({ filters, onExport }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Hook de synchronisation Odoo TanStack Query
  const { refreshAll, lastUpdatedAt, isLoading } = useInventory();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // 1. Récupération des dates (Priorité aux filtres passés en props, sinon lecture URL)
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const currentPreset = searchParams.get("preset") || "30d";

  const now = new Date();
  const parsedFrom = fromParam ? parseISO(fromParam) : null;
  const parsedTo = toParam ? parseISO(toParam) : null;

  const dateRange: DateRange = {
    from: filters?.dateRange?.from || (parsedFrom && isValid(parsedFrom) ? parsedFrom : startOfMonth(now)),
    to: filters?.dateRange?.to || (parsedTo && isValid(parsedTo) ? parsedTo : endOfMonth(now)),
  };

  // 2. Mise à jour de l'URL avec préservation des autres paramètres (Shop, Segment, etc.)
  const updateUrl = (from: Date, to: Date, preset: string) => {
    const params = new URLSearchParams(searchParams.toString());
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

  // 4. Gestion du Calendrier Personnalisé
  const handleCustomDateSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      updateUrl(range.from, range.to, "custom");
      setCalendarOpen(false);
    }
  };

  // 5. Rafraîchissement manuel
  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      if (refreshAll) {
        await refreshAll();
      }
      toast.success("Synchronisation Odoo réussie", {
        description: "Les niveaux de stock ont été mis à jour en temps réel."
      });
    } catch (e) {
      toast.error("Échec de la synchronisation avec Odoo");
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const isSyncActive = isLoading || isManualRefreshing;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/80 pb-6 transition-colors duration-150"
    >
      {/* GAUCHE : Titre et Statut Live Odoo */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground uppercase">
            Gestion des Stocks <span className="text-primary font-black">Temps Réel</span>
          </h1>

          <Badge variant="outline" className="text-emerald-600 border-emerald-500/20 bg-emerald-500/10 flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-mono font-bold">
            <span className={cn(
              "w-1.5 h-1.5 rounded-full bg-emerald-500",
              isSyncActive && "animate-ping"
            )} />
            Live Odoo
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground font-light">
          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
          <p>
            {lastUpdatedAt
              ? `Dernière synchronisation à ${format(lastUpdatedAt, "HH:mm:ss", { locale: fr })}`
              : "Synchronisation Odoo active"}
          </p>
        </div>
      </div>

      {/* DROITE : Sélecteurs Temporels & Actions */}
      <div className="flex flex-wrap items-center gap-2.5">

        {/* Sélecteur de Presets Rapides */}
        <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-xl shadow-2xs">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePresetClick(p)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer",
                currentPreset === p.value
                  ? "bg-card text-primary shadow-xs ring-1 ring-border font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50 font-medium"
              )}
            >
              {p.label}
            </button>
          ))}

          {/* Calendrier Popover Personnalisé */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
                  currentPreset === "custom"
                    ? "bg-card text-primary shadow-xs ring-1 ring-border font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/50 font-medium"
                )}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                <span>{currentPreset === "custom" ? "Personnalisé" : "Dates"}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border bg-popover text-popover-foreground z-50" align="end">
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

        <div className="h-6 w-px bg-border mx-0.5 hidden sm:block" />

        {/* Période active en texte */}
        <div className="hidden xl:flex flex-col items-end pr-1 text-right">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Période Active</span>
          <span className="text-xs font-mono font-medium text-foreground">
            {dateRange.from ? format(dateRange.from, "dd MMM", { locale: fr }) : "?"}
            {" — "}
            {dateRange.to ? format(dateRange.to, "dd MMM yyyy", { locale: fr }) : "Aujourd'hui"}
          </span>
        </div>

        {/* Bouton Actualiser */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs border-border bg-card hover:bg-muted/40 text-foreground cursor-pointer rounded-xl shadow-2xs"
          onClick={handleManualRefresh}
          disabled={isSyncActive}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isSyncActive && "animate-spin text-primary")} />
          <span className="hidden sm:inline font-medium">Actualiser</span>
        </Button>

        {/* Menu Déroulant d'Exportation */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-9 gap-1.5 px-3.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 shadow-2xs active:scale-95 transition-all cursor-pointer font-semibold text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>Exporter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-2xl border-border bg-popover text-popover-foreground z-50">
            <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
              Options d'exportation
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport("XLSX")} className="rounded-xl cursor-pointer py-2 text-xs flex items-center gap-2 font-medium">
              <Table className="w-4 h-4 text-emerald-600" />
              <span>Classeur Excel (.xlsx)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("CSV")} className="rounded-xl cursor-pointer py-2 text-xs flex items-center gap-2 font-medium">
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span>Données Brutes (CSV)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("PDF")} className="rounded-xl cursor-pointer py-2 text-xs flex items-center gap-2 font-medium">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Rapport Analytique (PDF)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </motion.div>
  );
}