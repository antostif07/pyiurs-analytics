"use client";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeftRight, Store, ChevronDown, ShieldCheck, Tag, X, Bookmark, LayoutGrid 
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SHOP_GROUPS = [
  { id: "group_24", label: "PB.24", pattern: "24" },
  { id: "group_ktm", label: "PB.KTM", pattern: "KTM" },
  { id: "group_lmb", label: "PB.LMB", pattern: "LMB" },
  { id: "group_mto", label: "PB.MTO", pattern: "MTO" },
  { id: "group_bc", label: "PB.BC / DC", patterns: ["BC", "DC"] },
];

interface ToolbarProps {
  warehouses: any[]; 
  segments: string[];
  selectedShops: number[];
  onShopsChange: (shops: number[]) => void;
  compareMode: boolean;
  onCompareModeChange: (mode: boolean) => void;
}

export default function DashboardToolbar({
  warehouses = [],
  segments = [],
  selectedShops,
  onShopsChange,
  compareMode,
  onCompareModeChange,
}: ToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [openShop, setOpenShop] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // 1. Synchronisation avec l'URL
  const updateShopsUrl = (ids: number[]) => {
    const params = new URLSearchParams(searchParams);
    if (ids.length > 0) {
      params.set("shops", ids.join(","));
    } else {
      params.delete("shops");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    onShopsChange(ids);
  };

  // 2. Calcul des Groupes Métier
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

  const isGroupSelected = (groupIds: number[]) => {
    if (groupIds.length === 0) return false;
    return groupIds.every(id => selectedShops.includes(id));
  };

  const toggleGroup = (groupIds: number[]) => {
    const allSelected = isGroupSelected(groupIds);
    let nextSelection: number[];
    
    if (allSelected) {
      nextSelection = selectedShops.filter(id => !groupIds.includes(id));
    } else {
      nextSelection = Array.from(new Set([...selectedShops, ...groupIds]));
    }
    updateShopsUrl(nextSelection);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-2xl px-4 py-2.5 shadow-sm"
    >
      {/* Sélecteur de Groupes (Popover) */}
      <Popover open={openShop} onOpenChange={setOpenShop}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-dashed">
            <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">
              Boutiques : {SHOP_GROUPS.filter(g => isGroupSelected(groupedWarehouses.find(gw => gw.id === g.id)?.ids || [])).length} / {SHOP_GROUPS.length}
            </span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-64" align="start">
          <Command>
            <div className="px-3 py-2 border-b border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Groupes Odoo (Codes)</p>
            </div>
            <CommandList>
              <CommandGroup>
                {groupedWarehouses.map((group) => (
                  <CommandItem
                    key={group.id}
                    onSelect={() => toggleGroup(group.ids)}
                    className="text-xs cursor-pointer py-2"
                  >
                    <div className={cn(
                      "mr-3 flex h-4 w-4 items-center justify-center rounded border border-primary transition-colors",
                      isGroupSelected(group.ids) ? "bg-primary text-primary-foreground" : "opacity-50"
                    )}>
                      {isGroupSelected(group.ids) && <ShieldCheck className="h-3 w-3" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium">{group.label}</span>
                        <span className="text-[9px] opacity-50">{group.ids.length} emplacements Odoo</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t border-border">
                <Button 
                    variant="ghost" 
                    className="w-full h-7 text-[10px] justify-center"
                    onClick={() => updateShopsUrl(warehouses.map(w => w.id))}
                >
                    Sélectionner tout le parc
                </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Segments (Catégories) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground hover:text-foreground">
            <Tag className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Segments</span>
            {selectedCats.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-primary/10 text-primary text-[10px] border-none">{selectedCats.length}</Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {segments.map((segment, index) => (
            <DropdownMenuCheckboxItem
              key={index}
              checked={selectedCats.includes(segment)}
              onCheckedChange={() => {
                const next = selectedCats.includes(segment) 
                    ? selectedCats.filter(s => s !== segment) 
                    : [...selectedCats, segment];
                setSelectedCats(next);
              }}
              className="text-xs"
            >
              {segment}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-[1px] bg-border mx-1" />

      {/* Pills des Groupes sélectionnés */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <AnimatePresence mode="popLayout">
          {groupedWarehouses.map((group) => isGroupSelected(group.ids) && (
            <motion.div 
                key={group.id}
                initial={{ scale: 0.8, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.8, opacity: 0 }}
            >
              <Badge variant="secondary" className="pl-2 pr-1 py-1 gap-1.5 text-[10px] bg-primary/5 border-primary/20 text-primary font-bold">
                {group.label}
                <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => toggleGroup(group.ids)} />
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex-1" />

      {/* Mode Comparaison */}
      <Button
        variant={compareMode ? "default" : "outline"}
        size="sm"
        onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set("compare", (!compareMode).toString());
            router.push(`${pathname}?${params.toString()}`, { scroll: false });
            onCompareModeChange(!compareMode);
        }}
        className={cn(
          "h-9 gap-2 rounded-xl text-xs font-semibold transition-all duration-300",
          compareMode ? "bg-primary shadow-lg shadow-primary/20" : "bg-background"
        )}
      >
        <ArrowLeftRight className={cn("w-3.5 h-3.5", compareMode && "rotate-180 transition-transform")} />
        Analyse Comparative
      </Button>

      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl transition-colors">
        <Bookmark className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}