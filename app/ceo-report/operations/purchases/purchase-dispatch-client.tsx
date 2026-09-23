// app/ceo-report/operations/purchases/purchase-dispatch-client.tsx
"use client";

import { toast } from "sonner";
import DashboardHeader from "@/components/new-ui/layout/dashboard-header";
import PurchaseDispatchKpiGrid from "./_components/purchase-dispatch-kpi-grid";
import PurchaseDispatchAnalytics from "./_components/purchase-dispatch-analytics";
import PurchaseDispatchMatrixTable from "./_components/purchase-dispatch-matrix-table";
import { usePurchaseDispatch } from "./_lib/hooks/use-purchase-dispatch";

export default function PurchaseDispatchClient() {
    const { data, isLoading, isFetching, refetch, dataUpdatedAt } = usePurchaseDispatch();

    const isBusy = isLoading || isFetching;

    const fallbackKpis = {
        poAmountTotal: 0,
        categoriesCount: 0,
        receivedPbcTotal: 0,
        receptionRate: 0,
        transferredTotal: 0,
        transferRate: 0,
        reliquatPbcTotal: 0,
    };

    const handleRefresh = async () => {
        try {
            await refetch();
            toast.success("Achats PO & Réceptions actualisés depuis Odoo");
        } catch {
            toast.error("Échec de l'actualisation");
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Header Global avec boutons de date et Actualiser */}
            <DashboardHeader
                title="Suivi des Achats PO & Dispatch Boutiques"
                subtitle="Pilotage des commandes fournisseurs, réceptions au central P.BC et dispatch aux points de vente"
                badgeLabel="Live Odoo"
                isLoading={isBusy}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                onRefresh={handleRefresh}
                onExport={(fmt) => toast(`Export ${fmt} en cours...`)}
            />

            {/* 2. 4 KPIs Découplés */}
            <PurchaseDispatchKpiGrid
                data={data?.kpis || fallbackKpis}
                isLoading={isBusy}
            />

            {/* 3. Graphiques Découplés */}
            <PurchaseDispatchAnalytics
                funnelData={data?.funnelData || []}
                storeShares={data?.storeShares || []}
                totalTransferred={data?.kpis?.transferredTotal || 0}
                isLoading={isBusy}
            />

            {/* 4. Tableau Point 4 Branché avec Skeletons */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        4. SUIVI DES ACHATS PO : COMMANDES, RÉCEPTIONS P.BC & TRANSFERTS ENVOYÉS AUX BOUTIQUES
                    </h2>
                </div>
                <PurchaseDispatchMatrixTable
                    data={data?.tableRows || []}
                    isLoading={isBusy}
                />
            </div>
        </div>
    );
}