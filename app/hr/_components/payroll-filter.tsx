"use client";

import React, { useTransition, useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const MONTHS = [
  { val: "01", label: "Janvier" },
  { val: "02", label: "Février" },
  { val: "03", label: "Mars" },
  { val: "04", label: "Avril" },
  { val: "05", label: "Mai" },
  { val: "06", label: "Juin" },
  { val: "07", label: "Juillet" },
  { val: "08", label: "Août" },
  { val: "09", label: "Septembre" },
  { val: "10", label: "Octobre" },
  { val: "11", label: "Novembre" },
  { val: "12", label: "Décembre" },
];

export function PayrollFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const currentMonth = searchParams.get("month") || String(now.getMonth() + 1).padStart(2, "0");
  const currentYear = searchParams.get("year") || String(now.getFullYear());

  // Plage d'années dynamique (-4 ans jusqu'à +1 an pour projections budgétaires)
  const currentYearNum = now.getFullYear();
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => String(currentYearNum - 4 + i)),
    [currentYearNum]
  );

  // Mise à jour fluide préservant les autres paramètres (shopId, tabs, etc.)
  const updateFilters = useCallback(
    (month: string, year: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", month);
      params.set("year", year);

      startTransition(() => {
        // Reste sur la page active (universel pour /hr/payroll, /hr/payroll/preparation, etc.)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border border-border/80 shadow-xs">
      {/* Label Période avec icône ou micro-spinner */}
      <div className="flex items-center gap-2 px-2.5 text-muted-foreground">
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        ) : (
          <Calendar className="w-3.5 h-3.5 text-primary/80" />
        )}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none">
          Période
        </span>
      </div>

      <Separator orientation="vertical" className="h-5 opacity-60" />

      {/* Sélecteur Mois */}
      <Select
        value={currentMonth}
        onValueChange={(val) => updateFilters(val, currentYear)}
      >
        <SelectTrigger className="w-[125px] h-8 border-none shadow-none text-xs font-semibold focus:ring-0 bg-transparent hover:bg-muted/40 transition-colors">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[90]">
          {MONTHS.map((m) => (
            <SelectItem key={m.val} value={m.val} className="text-xs">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-4 opacity-40" />

      {/* Sélecteur Année */}
      <Select
        value={currentYear}
        onValueChange={(val) => updateFilters(currentMonth, val)}
      >
        <SelectTrigger className="w-[85px] h-8 border-none shadow-none text-xs font-mono font-semibold focus:ring-0 bg-transparent hover:bg-muted/40 transition-colors text-primary">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[90]">
          {years.map((y) => (
            <SelectItem key={y} value={y} className="text-xs font-mono">
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}