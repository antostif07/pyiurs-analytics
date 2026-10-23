// app/inventory/stock-dashboard-client.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";

import ReportPageHeader from "@/components/new-ui/layout/report-page-header";
import { ReportSection } from "@/components/new-ui/layout/report-section";

import InventoryFilters from "./_components/inventory-filters";
import KpiGrid from "./_components/kpi-grid";
import AnalyticsSection from "./_components/analytics-section";
import AlertsPanel from "./_components/alerts-panel";
import AiInsightsPanel from "./_components/ai-insights-panel";
import StockTable from "./_components/stock-table";

import {
  parseInventoryFilters,
  toDateRange,
} from "./_lib/filters";

/**
 * Interface conservée pour compatibilité avec les sous-composants
 * (KpiGrid, AnalyticsSection, AlertsPanel, AiInsightsPanel, StockTable).
 * Sera dépréciée au fur et à mesure de leur migration vers les routes API.
 */
export interface StockDashboardFilters {
  selectedShops: string[];
  segment: "Tous" | "Femme" | "Beauty" | "Enfant";
  dateRange: DateRange | undefined;
  searchQuery: string;
  compareMode: boolean;
}

interface CompanyOption {
  id: string;
  name: string;
  odooCompanyId: number;
}

interface StockDashboardClientProps {
  companies: CompanyOption[];
}

export default function StockDashboardClient({
  companies,
}: StockDashboardClientProps) {
  const searchParams = useSearchParams();
  const filters = parseInventoryFilters(
    Object.fromEntries(searchParams.entries()),
  );

  /**
   * Reconstruit l'ancien objet `StockDashboardFilters` à partir de l'URL.
   * Les sous-composants continuent de fonctionner sans modification.
   */
  const legacyFilters: StockDashboardFilters = useMemo(() => {
    const allCompanyIds = companies.map((c) => c.odooCompanyId);
    const selectedShops =
      filters.companyId !== null
        ? [String(filters.companyId)]
        : allCompanyIds.map(String);

    return {
      selectedShops,
      segment: filters.segment,
      dateRange: toDateRange(filters),
      searchQuery: filters.search,
      compareMode: filters.compare,
    };
  }, [filters, companies]);

  return (
    <div>
      <ReportPageHeader
        title="Vue d'ensemble Stocks"
        subtitle="Valorisation consolidée du stock physique"
        badge={{ label: "Stock", tone: "violet" }}
      >
        <InventoryFilters
          filters={filters}
          companies={companies}
        />
      </ReportPageHeader>

      <div className="p-4 sm:p-5 space-y-4">
        <ReportSection index={1} title="Indicateurs clés">
          <KpiGrid />
        </ReportSection>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
          <div className="xl:col-span-2">
            <ReportSection
              index={2}
              title="Analytiques"
            >
              <AnalyticsSection />
            </ReportSection>
          </div>

          <div className="space-y-4">
            <ReportSection index={3} title="Alertes">
              <AlertsPanel filters={legacyFilters} />
            </ReportSection>
            <ReportSection
              index={4}
              title="Insights IA"
            >
              <AiInsightsPanel filters={legacyFilters} />
            </ReportSection>
          </div>
        </div>

        <ReportSection index={5} title="Détail des articles">
          <StockTable />
        </ReportSection>
      </div>
    </div>
  );
}