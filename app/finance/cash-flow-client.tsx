"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { parseISO, startOfMonth, endOfMonth, endOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import CashFlowMatrix from "./_components/cash-flow-matrix";
import { getCaissePrincipaleStats, getCashFlowStats } from "./actions";
import CashFlowHeader from "./_components/cash-flow-header";
import CaissePrincipaleMatrix from "./_components/caisse-principale-matrix";

export default function CashFlowClient({ initialMetadata }: { initialMetadata: any }) {
  const searchParams = useSearchParams();

  // 1. Gestion des dates (Sync avec l'URL comme pour l'ARPU)
  const selectedDate = searchParams.get("selectedDate") 
    ? parseISO(searchParams.get("selectedDate")!) 
    : endOfDay(new Date());

  // 2. Fetch des données de trésorerie (Matrice Shops x Segments)
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["cash-flow-sales", selectedDate],
    queryFn: () => getCashFlowStats({ from: selectedDate, to: selectedDate }),
  });

  const { data: cashData, isLoading: loadingCash } = useQuery({
    queryKey: ["cash-flow-cash", selectedDate],
    queryFn: () => getCaissePrincipaleStats({ from: selectedDate, to: selectedDate }),
  });


  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Réutilisation du header standardisé */}
      <CashFlowHeader 
        onExport={(format) => toast.info(`Génération du rapport Cash Flow en ${format}...`)} 
      />

      {/* La Matrice : Colonnes (Shops) / Lignes (Global & Segments) */}
      <CashFlowMatrix 
        data={salesData} 
        shops={initialMetadata.shops} 
        isLoading={loadingSales} 
      />

      <CaissePrincipaleMatrix 
        data={cashData} 
        shops={initialMetadata.shops} 
        isLoading={loadingCash} 
      />

      {/* On pourra ajouter ici des graphiques de tendance de trésorerie plus tard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="font-bold mb-4">Analyse des Écarts</h3>
             <p className="text-sm text-muted-foreground italic">
                Cette section analysera les différences entre les entrées réelles et les objectifs fixés par shop.
             </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="font-bold mb-4">Flux de Caisse Net</h3>
             <p className="text-sm text-muted-foreground italic">
                Visualisation de la courbe de liquidité globale du groupe.
             </p>
          </div>
      </div>
    </div>
  );
}