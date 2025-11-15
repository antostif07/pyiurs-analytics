// components/boutique-selector.tsx
'use client';

import { Boutique } from "@/app/manager-kpis/daily-sales.client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface BoutiqueSelectorProps {
  boutiques: Boutique[];
  selectedBoutique?: string | number;
  onBoutiqueChange: (boutique: string) => void;
}

export function BoutiqueSelector({ boutiques, selectedBoutique, onBoutiqueChange }: BoutiqueSelectorProps) {
  const value = selectedBoutique !== undefined && selectedBoutique !== null 
    ? selectedBoutique.toString() 
    : 'all';

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Filtrer par boutique
      </label>
      <Select value={value} onValueChange={onBoutiqueChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Sélectionner une boutique" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les boutiques</SelectItem>
          {boutiques.map((boutique) => (
            <SelectItem key={boutique.id} value={boutique.id.toString()}>
              {boutique.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}