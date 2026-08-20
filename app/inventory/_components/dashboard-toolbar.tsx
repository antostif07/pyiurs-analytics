"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  ChevronDown,
  ShieldCheck,
  Tag,
  X,
  LayoutGrid,
  Search
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker"; // ✅ Importation du type DateRange

const SHOP_GROUPS = [
  { id: "group_24", label: "PB.24", pattern: "24" },
  { id: "group_ktm", label: "PB.KTM", pattern: "KTM" },
  { id: "group_lmb", label: "PB.LMB", pattern: "LMB" },
  { id: "group_mto", label: "PB.MTO", pattern: "MTO" },
  { id: "group_bc", label: "PB.BC / DC", patterns: ["BC", "DC"] },
];

// ✅ Ajout explicite de dateRange et onDateRangeChange dans ToolbarProps
interface ToolbarProps {
  warehouses?: any[];
  segments?: string[];
  selectedSegment?: string;
  onSegmentChange?: (seg: any) => void;
  selectedShops: any[];
  onShopsChange: (shops: any[]) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  compareMode: boolean;
  onCompareModeChange: (mode: boolean) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export default function DashboardToolbar({
  warehouses = [],
  segments = ["Tous", "Femme", "Beauty", "Enfant"],
  selectedSegment = "Tous",
  onSegmentChange,
  selectedShops = [],
  onShopsChange,
  dateRange,
  onDateRangeChange,
  compareMode,
  onCompareModeChange,
  searchQuery = "",
  onSearchChange,
}: ToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openShop, setOpenShop] = useState(false);

  // 1. Synchronisation des Boutiques avec l'URL
  const updateShopsUrl = (ids: any[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (ids.length > 0) {
      params.set("shops", ids.join(","));
    } else {
      params.delete("shops");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    onShopsChange(ids);
  };

  // 2. Synchronisation du Segment avec l'URL
  const handleSegmentSelect = (seg: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (seg && seg !== "Tous") {
      params.set("segment", seg);
    } else {
      params.delete("segment");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    if (onSegmentChange) {
      onSegmentChange(seg);
    }
  };

  // 3. Calcul des Groupes Métier Odoo (PB.24, PB.KTM, PB.LMB, PB.MTO, PB.BC)
  const groupedWarehouses = useMemo(() => {
    return SHOP_GROUPS.map(group => {
      const ids = warehouses
        .filter(wh => {
          const code = (wh.code || "").toUpperCase();
          const name = (wh.name || "").toUpperCase();
          if (group.patterns) {
            return group.patterns.some(p => code.includes(p) || name.includes(p));
          }
          return code.includes(group.pattern || "") || name.includes(group.pattern || "");
        })
        .map(wh => wh.id);
      return { ...group, ids };
    });
  }, [warehouses]);

  const isGroupSelected = (groupIds: any[]) => {
    if (groupIds.length === 0) return false;
    return groupIds.every(id => selectedShops.includes(id) || selectedShops.includes(String(id)));
  };

  const toggleGroup = (groupIds: any[]) => {
    const allSelected = isGroupSelected(groupIds);
    let nextSelection: any[];

    if (allSelected) {
      nextSelection = selectedShops.filter(id => !groupIds.includes(id) && !groupIds.includes(Number(id)));
    } else {
      nextSelection = Array.from(new Set([...selectedShops, ...groupIds]));
    }
    updateShopsUrl(nextSelection);
  };

  const activeGroupCount = SHOP_GROUPS.filter(g =>
    isGroupSelected(groupedWarehouses.find(gw => gw.id === g.id)?.ids || [])
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-xs transition-colors duration-150"
    >
      {/* A. Sélecteur de Boutiques Odoo (Popover) */}
      <Popover open={openShop} onOpenChange={setOpenShop}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-semibold cursor-pointer shadow-2xs">
            <LayoutGrid className="w-3.5 h-3.5 text-primary" />
            <span>
              Boutiques : <strong className="text-primary">{activeGroupCount}</strong> / {SHOP_GROUPS.length}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64 rounded-2xl shadow-xl border-border bg-popover text-popover-foreground z-50" align="start">
          <Command className="bg-popover">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                Points de Vente Physiques
              </p>
            </div>
            <CommandList>
              <CommandGroup>
                {groupedWarehouses.map((group) => {
                  const selected = isGroupSelected(group.ids);
                  return (
                    <CommandItem
                      key={group.id}
                      onSelect={() => toggleGroup(group.ids)}
                      className="text-xs cursor-pointer py-2 px-3 flex items-center justify-between hover:bg-accent"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          selected ? "bg-primary text-primary-foreground border-primary" : "border-border opacity-60"
                        )}>
                          {selected && <ShieldCheck className="h-3 w-3" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-xs">{group.label}</span>
                          <span className="text-[9px] text-muted-foreground">{group.ids.length} emplacement(s)</span>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>

            <div className="p-1.5 border-t border-border flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[10px] justify-center cursor-pointer font-medium"
                onClick={() => updateShopsUrl(warehouses.map(w => w.id))}
              >
                Tout sélectionner
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-[10px] justify-center cursor-pointer text-muted-foreground font-medium"
                onClick={() => updateShopsUrl([])}
              >
                Réinitialiser
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* B. Sélecteur de Segment Produit (Femme, Beauty, Enfant, Tous) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border bg-card text-foreground hover:bg-muted/40 text-xs font-semibold cursor-pointer shadow-2xs">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span>Segment : <strong className="text-primary">{selectedSegment}</strong></span>
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 p-1.5 rounded-2xl shadow-xl border-border bg-popover text-popover-foreground z-50">
          <DropdownMenuLabel className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
            Filtrer par Département
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {segments.map((seg) => (
            <DropdownMenuItem
              key={seg}
              onClick={() => handleSegmentSelect(seg)}
              className={cn(
                "text-xs cursor-pointer py-1.5 px-2 rounded-xl flex items-center justify-between font-medium",
                selectedSegment === seg && "bg-primary/10 text-primary font-bold"
              )}
            >
              <span>{seg}</span>
              {selectedSegment === seg && <ShieldCheck className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* C. Recherche Rapide dans le Tableau de Bord */}
      {onSearchChange && (
        <div className="relative w-48 sm:w-64">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Rechercher article, code..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-muted/20 border border-input rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary h-9"
          />
        </div>
      )}

      <div className="h-4 w-px bg-border mx-0.5 hidden md:block" />

      {/* D. Badges des Boutiques Sélectionnées */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <AnimatePresence mode="popLayout">
          {groupedWarehouses.map((group) => isGroupSelected(group.ids) && (
            <motion.div
              key={group.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Badge variant="secondary" className="pl-2.5 pr-1.5 py-1 gap-1.5 text-[10px] bg-primary/10 border border-primary/20 text-primary font-mono font-bold rounded-lg shadow-2xs">
                {group.label}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
                  onClick={() => toggleGroup(group.ids)}
                />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex-1" />

      {/* E. Analyse Comparative Toggle */}
      <Button
        variant={compareMode ? "default" : "outline"}
        size="sm"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("compare", (!compareMode).toString());
          router.push(`${pathname}?${params.toString()}`, { scroll: false });
          onCompareModeChange(!compareMode);
        }}
        className={cn(
          "h-9 gap-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shadow-2xs",
          compareMode ? "bg-primary text-primary-foreground hover:opacity-90" : "border-border bg-card hover:bg-muted/40"
        )}
      >
        <ArrowLeftRight className={cn("w-3.5 h-3.5", compareMode && "rotate-180 transition-transform")} />
        <span>Analyse Comparative</span>
      </Button>
    </motion.div>
  );
}