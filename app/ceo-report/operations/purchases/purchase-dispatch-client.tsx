// app/ceo-report/operations/purchases/purchase-dispatch-client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ReportPageHeader from "../../../../components/new-ui/layout/report-page-header";
import GlobalFilters from "../../_components/global-filters";
import { ReportSection } from "../../../../components/new-ui/layout/report-section";
import { parseFilters } from "../../_lib/filters";
import PurchaseDispatchKpiGrid from "./_components/purchase-dispatch-kpi-grid";
import PurchaseDispatchAnalytics from "./_components/purchase-dispatch-analytics";
import PurchaseDispatchMatrixTable from "./_components/purchase-dispatch-matrix-table";
import { usePurchaseDispatch } from "./_lib/hooks/use-purchase-dispatch";

// Fallback stable hors render (évite la réallocation à chaque render)
const FALLBACK_KPIS = {
    poAmountTotal: 0,
    categoriesCount: 0,
    receivedPbcTotal: 0,
    receptionRate: 0,
    transferredTotal: 0,
    transferRate: 0,
    reliquatPbcTotal: 0,
} as const;

export default function PurchaseDispatchClient() {
    const searchParams = useSearchParams();
    const filters = parseFilters(Object.fromEntries(searchParams.entries()));

    const { data, isLoading, isFetching, refetch, dataUpdatedAt } =
        usePurchaseDispatch();

    const isBusy = isLoading || isFetching;

    const handleRefresh = async () => {
        try {
            await refetch();
            toast.success("Achats PO & Réceptions actualisés depuis Odoo");
        } catch {
            toast.error("Échec de l'actualisation");
        }
    };

    return (
        <div>
            <ReportPageHeader
                title="Suivi des Achats PO & Dispatch Boutiques"
                subtitle="Commandes fournisseurs, réceptions central P.BC et dispatch aux points de vente"
                badge={{ label: "Live Odoo", tone: "emerald" }}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                isLoading={isBusy}
                onRefresh={handleRefresh}
            >
                <GlobalFilters filters={filters} compact />
            </ReportPageHeader>

            <div className="p-4 sm:p-5 space-y-4">
                <PurchaseDispatchKpiGrid
                    data={data?.kpis ?? FALLBACK_KPIS}
                    isLoading={isBusy}
                />

                <PurchaseDispatchAnalytics
                    funnelData={data?.funnelData ?? []}
                    storeShares={data?.storeShares ?? []}
                    totalTransferred={data?.kpis?.transferredTotal ?? 0}
                    isLoading={isBusy}
                />

                <ReportSection
                    index={4}
                    title="Suivi des achats PO · Commandes · Réceptions P.BC · Transferts boutiques"
                >
                    <PurchaseDispatchMatrixTable
                        data={data?.tableRows ?? []}
                        isLoading={isBusy}
                    />
                </ReportSection>
            </div>
        </div>
    );
}