// app/ceo-report/stock/_components/stock-kpi-grid.tsx
"use client";

import { Package, Sparkles, Heart, Baby } from "lucide-react";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { useStockKpis } from "../_lib/hooks/use-stock-kpis";

const fmt = (n: number) => n.toLocaleString("fr-FR");

export default function StockKpiGrid() {
    const { data, isLoading } = useStockKpis();

    const kpis = data ?? {
        totalValuation: 0,
        totalUnits: 0,
        subtitle: "",
        valuationDelta: undefined,
        womenArticlesCount: 0,
        womenValuation: 0,
        beautyArticlesCount: 0,
        beautyValuation: 0,
        kidsArticlesCount: 0,
        kidsValuation: 0,
        storeStockAuditSizesData: [],
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <CeoKpiCard
                label="Valorisation Stock"
                value={`${fmt(kpis.totalValuation)} $`}
                subtitle={kpis.subtitle || undefined}
                delta={kpis.valuationDelta}
                icon={<Package className="w-3.5 h-3.5" />}
                iconColor="text-sky-600 dark:text-sky-400"
                iconBg="bg-sky-50 dark:bg-sky-950/40"
                isLoading={isLoading}
            />

            <CeoKpiCard
                label="Parc Articles Femme"
                value={`${fmt(kpis.womenArticlesCount)} pcs`}
                subtitle={`${fmt(kpis.womenValuation)} $`}
                icon={<Heart className="w-3.5 h-3.5" />}
                iconColor="text-violet-600 dark:text-violet-400"
                iconBg="bg-violet-50 dark:bg-violet-950/40"
                isLoading={isLoading}
            />

            <CeoKpiCard
                label="Articles Beauty"
                value={`${fmt(kpis.beautyArticlesCount)} pcs`}
                subtitle={`${fmt(kpis.beautyValuation)} $`}
                icon={<Sparkles className="w-3.5 h-3.5" />}
                iconColor="text-pink-600 dark:text-pink-400"
                iconBg="bg-pink-50 dark:bg-pink-950/40"
                isLoading={isLoading}
            />

            <CeoKpiCard
                label="Articles Enfant"
                value={`${fmt(kpis.kidsArticlesCount)} pcs`}
                subtitle={`${fmt(kpis.kidsValuation)} $`}
                icon={<Baby className="w-3.5 h-3.5" />}
                iconColor="text-emerald-600 dark:text-emerald-400"
                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                isLoading={isLoading}
            />
        </div>
    );
}