// app/ceo-report/stock/_components/stock-kpi-grid.tsx
"use client";

import { Package, Sparkles, Heart, Baby } from "lucide-react";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { useStockKpis } from "../_lib/hooks/use-stock-kpis";
import type { StockKpisData } from "../_lib/types";

interface StockKpiGridProps {
    initialData?: StockKpisData;
}

export default function StockKpiGrid({ initialData }: StockKpiGridProps) {
    const { data, isLoading } = useStockKpis();

    const kpis: StockKpisData = data || initialData || {
        totalValuation: 0,
        totalUnits: 0,
        subtitle: "Chargement du stock...",
        womenArticlesCount: 0,
        womenValuation: 0,
        beautyArticlesCount: 0,
        beautyValuation: 0,
        kidsArticlesCount: 0,
        kidsValuation: 0,
    };

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Valorisation Stock Globale */}
            <CeoKpiCard
                label="Valorisation Stock"
                value={`${kpis.totalValuation.toLocaleString("fr-FR")} $`}
                subtitle={kpis.subtitle}
                icon={<Package className="w-4 h-4" />}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-50 dark:bg-indigo-950/50"
                isLoading={isLoading}
            />

            {/* 2. Parc Articles Femme */}
            <CeoKpiCard
                label="Parc Articles Femme"
                value={`${kpis.womenArticlesCount.toLocaleString("fr-FR")} pcs`}
                subtitle={`${kpis.womenValuation.toLocaleString("fr-FR")} $ de valeur`}
                icon={<Heart className="w-4 h-4" />}
                iconColor="text-rose-600"
                iconBg="bg-rose-50 dark:bg-rose-950/50"
                valueColor="text-rose-600 dark:text-rose-400"
                isLoading={isLoading}
            />

            {/* 3. Articles Beauty */}
            <CeoKpiCard
                label="Articles Beauty"
                value={`${kpis.beautyArticlesCount.toLocaleString("fr-FR")} pcs`}
                subtitle={`${kpis.beautyValuation.toLocaleString("fr-FR")} $ de valeur`}
                icon={<Sparkles className="w-4 h-4" />}
                iconColor="text-amber-600"
                iconBg="bg-amber-50 dark:bg-amber-950/50"
                valueColor="text-amber-600 dark:text-amber-400"
                isLoading={isLoading}
            />

            {/* 4. Articles Enfant */}
            <CeoKpiCard
                label="Articles Enfant"
                value={`${kpis.kidsArticlesCount.toLocaleString("fr-FR")} pcs`}
                subtitle={`${kpis.kidsValuation.toLocaleString("fr-FR")} $ de valeur`}
                icon={<Baby className="w-4 h-4" />}
                iconColor="text-blue-600"
                iconBg="bg-blue-50 dark:bg-blue-950/50"
                valueColor="text-blue-600 dark:text-blue-400"
                isLoading={isLoading}
            />
        </div>
    );
}