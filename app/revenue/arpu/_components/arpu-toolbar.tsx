"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeftRight, 
  Check, 
  ChevronDown,
  X,
  Tags,
  Calendar as CalendarIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Vos segments fixes définis dans Odoo Studio
const ODOO_SEGMENTS = ["Enfant", "Femme", "Beauty"];

interface ArpuToolbarProps {
    segments: string[]; // Tous les segments disponibles (ex: ["Enfant", "Femme", "Beauty"])    
    selectedSegments: string[];
    onSegmentsChange: (segments: string[]) => void;
    compareMode: boolean;
    onCompareModeChange: (mode: boolean) => void;
}

export default function ArpuToolbar({
    segments,
    selectedSegments,
    onSegmentsChange,
    compareMode,
    onCompareModeChange,
}: ArpuToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Gestion de la sélection x_studio_segment
  const toggleSegment = (segment: string) => {
    const next = selectedSegments.includes(segment)
      ? selectedSegments.filter((s) => s !== segment)
      : [...selectedSegments, segment];
    
    const params = new URLSearchParams(searchParams);
    if (next.length > 0) {
      params.set("segments", next.join(","));
    } else {
      params.delete("segments");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    onSegmentsChange(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl px-5 py-3 shadow-sm"
    >
      {/* Sélecteur de Segment Odoo Studio */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 rounded-2xl border-dashed border-slate-300 hover:border-indigo-400 gap-2 transition-all"
            >
              <Tags className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-bold">Segments Studio</span>
              {selectedSegments.length > 0 && (
                <Badge className="ml-1 bg-indigo-600 text-white hover:bg-indigo-700 h-5 px-1.5 min-w-[20px] justify-center border-none">
                  {selectedSegments.length}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-2 rounded-2xl shadow-xl border-slate-200">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1.5 tracking-widest">
              Champ: x_studio_segment
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ODOO_SEGMENTS.map((segment) => (
              <DropdownMenuCheckboxItem
                key={segment}
                checked={selectedSegments.includes(segment)}
                onCheckedChange={() => toggleSegment(segment)}
                className="rounded-lg cursor-pointer py-2 focus:bg-indigo-50 dark:focus:bg-indigo-950"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm">{segment}</span>
                  {selectedSegments.includes(segment) && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Pills interactifs */}
        <div className="hidden md:flex gap-2 items-center">
          <AnimatePresence mode="popLayout">
            {selectedSegments.map((segment) => (
              <motion.div
                key={segment}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
              >
                <Badge 
                  variant="secondary" 
                  className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border-indigo-100 dark:border-indigo-900 pl-3 pr-1 py-1 rounded-full text-xs font-bold gap-1"
                >
                  {segment}
                  <button 
                    onClick={() => toggleSegment(segment)}
                    className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block" />

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
          "h-10 rounded-2xl text-sm font-bold transition-all duration-300 gap-2",
          compareMode 
            ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none border-indigo-600" 
            : "bg-white hover:border-indigo-400"
        )}
      >
        <ArrowLeftRight className={cn("w-4 h-4", compareMode && "rotate-180 transition-transform duration-500")} />
        Analyse Comparative
      </Button>

      <div className="flex-1" />

      {/* Presets temporels compacts */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
        {["7J", "30J", "90J", "YTD"].map((preset) => {
             const currentPreset = searchParams.get("preset") || "30d";
             const isSelected = (preset === "7J" && currentPreset === "7d") || 
                                (preset === "30J" && currentPreset === "30d") ||
                                (preset === "90J" && currentPreset === "90d") ||
                                (preset === "YTD" && currentPreset === "ytd");
             return (
                <button
                    key={preset}
                    className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] font-black transition-all",
                    isSelected 
                        ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-sm" 
                        : "text-slate-500 hover:text-slate-900"
                    )}
                >
                    {preset}
                </button>
             )
        })}
        <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-500">
          <CalendarIcon className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}