'use client';

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = [
  { val: "01", label: "Janv" }, { val: "02", label: "Févr" },
  { val: "03", label: "Mars" }, { val: "04", label: "Avril" },
  { val: "05", label: "Mai" }, { val: "06", label: "Juin" },
  { val: "07", label: "Juil" }, { val: "08", label: "Août" },
  { val: "09", label: "Sept" }, { val: "10", label: "Oct" },
  { val: "11", label: "Nov" }, { val: "12", label: "Déc" }
];

export function RevenueDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // 1. Récupération des valeurs depuis l'URL
  const currentMonth = searchParams.get("month") || format(new Date(), "MM");
  const currentYear = searchParams.get("year") || format(new Date(), "yyyy");

  // 2. Génération des années
  const years = React.useMemo(() => {
    const year = new Date().getFullYear();
    return Array.from({ length: year - 2018 + 1 }, (_, i) => (year - i).toString());
  }, []);

  // 3. Mise à jour fluide de l'URL
  const updateUrl = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // 4. Action de rafraîchissement réel des données Odoo
  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="flex items-center gap-1.5 max-w-full shrink-0">

      {/* Conteneur principal compact et réactif */}
      <div className="flex items-center h-9 p-0.5 rounded-xl border border-border bg-card shadow-xs max-w-full">

        {/* Icône Calendrier (Masquée sur petit mobile pour éviter le débordement) */}
        <div className="hidden sm:flex items-center px-2 text-primary border-r border-border shrink-0">
          <CalendarIcon className="w-3.5 h-3.5" />
        </div>

        {/* SELECT MOIS */}
        <Select value={currentMonth} onValueChange={(v) => updateUrl("month", v)}>
          <SelectTrigger className="w-20 sm:w-24 h-8 border-none bg-transparent font-bold text-xs shadow-none focus:ring-0 uppercase tracking-tight text-foreground px-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground shadow-xl">
            {MONTHS.map(m => (
              <SelectItem key={m.val} value={m.val} className="text-xs font-semibold uppercase">
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-3.5 bg-border shrink-0 mx-0.5" />

        {/* SELECT ANNÉE */}
        <Select value={currentYear} onValueChange={(v) => updateUrl("year", v)}>
          <SelectTrigger className="w-16 sm:w-20 h-8 border-none bg-transparent font-bold text-primary text-xs shadow-none focus:ring-0 tracking-tight px-2 font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border bg-popover text-popover-foreground shadow-xl">
            {years.map(y => (
              <SelectItem key={y} value={y} className="text-xs font-mono font-bold">
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* BOUTON REFRESH ACTIF */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleRefresh}
        className="h-9 w-9 shrink-0 rounded-xl border border-border bg-card text-muted-foreground hover:text-primary transition-all cursor-pointer"
        aria-label="Rafraîchir les données Odoo"
      >
        <RefreshCw className={cn("w-3.5 h-3.5 transition-transform duration-500", isRefreshing && "animate-spin text-primary")} />
      </Button>
    </div>
  );
}