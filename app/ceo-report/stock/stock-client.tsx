// app/ceo-report/stock/stock-client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ReportPageHeader from "../_components/report-page-header";
import GlobalFilters from "../_components/global-filters";
import { ReportSection } from "../_components/report-section";
import { parseFilters } from "../_lib/filters";
import StockKpiGrid from "./_components/stock-kpi-grid";
import StockAnalytics from "./_components/stock-analytics";
import StockMovementMatrixTable from "./_components/stock-movement-matrix-table";
import StoreStockAuditSizesTable from "./_components/store-stock-audit-sizes-table";
import { useStockKpis } from "./_lib/hooks/use-stock-kpis";

export default function StockClient() {
    const searchParams = useSearchParams();
    const filters = parseFilters(Object.fromEntries(searchParams.entries()));

    const { data, isLoading, refetch, dataUpdatedAt } = useStockKpis();

    const handleRefresh = async () => {
        await refetch();
        toast.success("Stock actualisé depuis Odoo");
    };

    return (
        <div className="flex flex-col min-h-full">
            <ReportPageHeader
                title="Mouvements & Valorisation Stock"
                subtitle="Flux logistiques, valorisation par boutique et conformité d'inventaire"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isLoading}
                onRefresh={handleRefresh}
            >
                <GlobalFilters filters={filters} compact />
            </ReportPageHeader>

            <div className="flex-1 p-4 sm:p-5 space-y-4">
                <StockKpiGrid />

                <StockAnalytics
                    fluxData={data?.fluxData ?? []}
                    sizesData={data?.sizesData ?? []}
                    isLoading={isLoading}
                />

                <ReportSection index={3} title="Mouvements de stock global">
                    <StockMovementMatrixTable
                        data={data?.movementsData ?? []}
                        isLoading={isLoading}
                    />
                </ReportSection>

                <ReportSection
                    index={8}
                    title="Valorisation stock par boutique · Tailles femme"
                >
                    <StoreStockAuditSizesTable
                        data={data?.storeStockAuditSizesData ?? []}
                        isLoading={isLoading}
                    />
                </ReportSection>
            </div>
        </div>
    );
}