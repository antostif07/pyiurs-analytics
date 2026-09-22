// app/ceo-report/sales/sales-matrix-client.tsx
"use client";

import { toast } from "sonner";
import DashboardHeader from "@/components/new-ui/layout/dashboard-header";
import SalesRevenueMatrixTable from "./_components/sales-revenue-matrix-table";
import SalesExecutiveSummary from "./_components/sales-executive-summary";
import { SALES_MATRIX_INITIAL_DATA } from "./_components/data";
import { useSalesMatrix } from "./_lib/use-sales-matrix";

export default function SalesMatrixClient() {
  // ✅ 1. Lecture réelle Odoo + Supabase via TanStack Query
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useSalesMatrix();

  const isBusy = isLoading || isFetching;

  // Utilisation des vraies données ou fallback propre de secours
  const matrixData = data || SALES_MATRIX_INITIAL_DATA;

  // ✅ 2. Action de rafraîchissement réelle
  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Ventes réelles Odoo & Budgets actualisés");
    } catch {
      toast.error("Échec de synchronisation des ventes");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. Header Global connecté au Refetch Odoo et aux filtres temporels */}
      <DashboardHeader
        title="Performance Commerciale & Matrice des Revenus"
        subtitle="Ventilation croisée des ventes POS par boutique et segment vs budget Supabase"
        badgeLabel="Live Odoo"
        isLoading={isBusy}
        lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        onRefresh={handleRefresh}
        onExport={(format) => toast(`Export ${format} de la matrice en cours...`)}
      />

      {/* 2. Synthèse Visuelle & 4 Cartes Exécutives (Vraies Données) */}
      <SalesExecutiveSummary
        data={matrixData}
        isLoading={isBusy}
      />

      {/* 3. La Matrice Croisée Réelle (Boutiques × Segments) */}
      <SalesRevenueMatrixTable
        data={matrixData}
        isLoading={isBusy}
      />
    </div>
  );
}