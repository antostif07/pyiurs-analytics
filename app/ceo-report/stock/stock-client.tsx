// app/ceo-report/stock/stock-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import DashboardHeader from "@/components/new-ui/layout/dashboard-header";
import StockKpiGrid from "./_components/stock-kpi-grid";
import StockAnalytics from "./_components/stock-analytics";
import StockMovementMatrixTable from "./_components/stock-movement-matrix-table";
import StoreStockAuditSizesTable from "./_components/store-stock-audit-sizes-table";
import type { StockReportData } from "./_lib/types";
import { useStockKpis } from "./_lib/hooks/use-stock-kpis";

// État initial (servira de fallback pendant la connexion API Odoo)
const INITIAL_STOCK_DATA: StockReportData = {
    fluxData: [],
    sizesData: [
        { size: "S", pieces: 240, part: "15%" },
        { size: "M", pieces: 500, part: "31%" },
        { size: "L", pieces: 435, part: "27%" },
        { size: "XL", pieces: 275, part: "17%" },
        { size: "XXL+", pieces: 150, part: "10%" },
    ],
};

export default function StockClient() {
    const { data, isLoading, refetch, dataUpdatedAt } = useStockKpis();

    return (
        <div className="space-y-6">
            {/* 1. Header Universel (Non bloqué sur ARPU) */}
            <DashboardHeader
                title="Mouvements & Valorisation Stock"
                subtitle="Suivi des flux logistiques, valorisation par boutique et conformité d'inventaire"
                badgeLabel="Live Odoo"
                isLoading={isLoading}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                onRefresh={async () => {
                    await refetch();
                    toast.success("Stock actualisé depuis Odoo");
                }}
            />

            {/* 2. Grille des 4 KPIs Découplée */}
            <StockKpiGrid />

            {/* 3. Graphiques Découplés */}
            <StockAnalytics
                fluxData={data?.fluxData || []}
                sizesData={data?.sizesData || []}
                isLoading={isLoading}
            />

            {/* 4. Tableau Point 3 : Mouvements Globaux */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        MOUVEMENTS DE STOCK GLOBAL (CLÔTURE M-1, ACHATS FOURNISSEURS, VENTES & AJUSTEMENTS)
                    </h2>
                </div>
                <StockMovementMatrixTable
                    data={data?.movementsData || []}
                    isLoading={isLoading}
                />
            </div>

            {/* 5. Tableau Point 8 : Valorisation par Boutique & Tailles Femme */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        VALORISATION DU STOCK PAR BOUTIQUE (AVEC AUDITS) & SUIVI DES TAILLES FEMME
                    </h2>
                </div>
                <StoreStockAuditSizesTable
                    data={data?.storeStockAuditSizesData || []}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
}