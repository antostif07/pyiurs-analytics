"use client";

import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

// Sections spécialisées du Dashboard
import DashboardHeader from "./_components/dashboard-header";
import DashboardToolbar from "./_components/dashboard-toolbar";
import KpiGrid from "./_components/kpi-grid";
import StockTable from "./_components/stock-table";
import AnalyticsSection from "./_components/analytics-section";
import AlertsPanel from "./_components/alerts-panel";
import AiInsightsPanel from "./_components/ai-insights-panel";
import { InventoryItem } from "./_lib/types";

export interface StockDashboardFilters {
  selectedShops: string[]; // IDs des boutiques sélectionnées
  segment: "Tous" | "Femme" | "Beauty" | "Enfant";
  dateRange: DateRange | undefined;
  searchQuery: string;
  compareMode: boolean;
}

interface StockDashboardClientProps {
  initialMetadata?: InventoryItem | null;
}

export default function StockDashboardClient({ initialMetadata }: StockDashboardClientProps) {

  // 1. Initialisation défensive des boutiques
  const defaultWarehouses = useMemo(() => {
    return initialMetadata?.warehouses || [];
  }, [initialMetadata]);

  // 2. États de filtrage partagés du tableau de bord
  const [selectedShops, setSelectedShops] = useState<string[]>(
    defaultWarehouses.map((w) => String(w.id))
  );

  const [selectedSegment, setSelectedSegment] = useState<"Tous" | "Femme" | "Beauty" | "Enfant">("Tous");

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [compareMode, setCompareMode] = useState(false);

  // Objet de filtres mémorisé transmis aux sous-composants
  const filters: StockDashboardFilters = useMemo(() => ({
    selectedShops,
    segment: selectedSegment,
    dateRange,
    searchQuery,
    compareMode,
  }), [selectedShops, selectedSegment, dateRange, searchQuery, compareMode]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* 1. EN-TÊTE AVEC BOUTON D'EXPORT */}
      <DashboardHeader
        filters={filters}
        onExport={(format) => {
          console.log(`[EXPORT] Déclenchement de l'export ${format}`);
        }}
      />

      {/* 2. BARRE D'OUTILS ET DE FILTRES (Boutiques, Segments, Période) */}
      <DashboardToolbar
        warehouses={defaultWarehouses}
        segments={["Tous", "Femme", "Beauty", "Enfant"]}
        selectedSegment={selectedSegment}
        onSegmentChange={setSelectedSegment}
        selectedShops={selectedShops}
        onShopsChange={setSelectedShops}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 3. CARTES KPIS EN TEMPS RÉEL (Gère son propre useQuery TanStack) */}
      <KpiGrid filters={filters} />

      {/* 4. SECTION CENTRALE : ANALYTIQUES ET ALERTES */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Graphiques de rotation et mouvements de stock */}
        <div className="xl:col-span-2">
          <AnalyticsSection filters={filters} />
        </div>

        {/* Panneau d'Alertes Ruptures & Recommandations Intelligentes */}
        <div className="space-y-6">
          <AlertsPanel filters={filters} />
          <AiInsightsPanel filters={filters} />
        </div>
      </div>

      {/* 5. TABLEAU DE STOCK DÉTAILLÉ (Avec pagination et recherche TanStack Table) */}
      <StockTable filters={filters} />
    </div>
  );
}