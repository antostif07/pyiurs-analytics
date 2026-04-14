"use client";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";

// Sections du Dashboard
import DashboardHeader from "./_components/dashboard-header";
import DashboardToolbar from "./_components/dashboard-toolbar";
import KpiGrid from "./_components/kpi-grid";
import StockTable from "./_components/stock-table";
import AnalyticsSection from "./_components/analytics-section";
import AlertsPanel from "./_components/alerts-panel";
import AiInsightsPanel from "./_components/ai-insights-panel";

export default function StockDashboardClient({ initialMetadata }: { initialMetadata: any }) {
  // États de filtrage partagés
  const [selectedShops, setSelectedShops] = useState<number[]>(
    initialMetadata.warehouses.map((w: any) => w.id)
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [compareMode, setCompareMode] = useState(false);

  return (
    <div className="space-y-6">
      <DashboardHeader onExport={(format) => {
        // Implémenter la logique d'export CSV/PDF ici
        alert(`Export en ${format} non implémenté`);
      }}
      />

      <DashboardToolbar
        warehouses={initialMetadata.warehouses}
        // categories={initialMetadata.categories}
        segments={["Femme", "Beauty", "Enfant"]} // Exemples de segments, à remplacer par des données réelles si besoin
        selectedShops={selectedShops}
        onShopsChange={setSelectedShops}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
      />

      {/* Chaque composant gère son propre loading via TanStack Query */}
      <KpiGrid />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AnalyticsSection 
        //   filters={{ selectedShops, dateRange }}
          />
        </div>
        <div className="space-y-6">
          <AlertsPanel
            // selectedShops={selectedShops}
        />
          <AiInsightsPanel />
        </div>
      </div>

      <StockTable />
    </div>
  );
}