// app/ceo-report/sales/_components/sales-executive-summary.tsx
"use client";

import { DollarSign, Award, Store, TrendingUp } from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import type { SalesMatrixData } from "./types";

interface SalesExecutiveSummaryProps {
    data: SalesMatrixData;
    isLoading?: boolean;
}

export default function SalesExecutiveSummary({
    data,
    isLoading = false,
}: SalesExecutiveSummaryProps) {
    const { totals, rows, stores } = data;

    // 1. Détermination de la catégorie leader
    const sortedCategories = [...rows].sort((a, b) => b.totalRealized - a.totalRealized);
    const leaderCategory = sortedCategories[0] || { categoryName: "--", totalRealized: 0 };
    const leaderShare = totals.totalRealizedGlobal > 0
        ? ((leaderCategory.totalRealized / totals.totalRealizedGlobal) * 100).toFixed(1)
        : "0";

    // 2. Détermination de la meilleure boutique
    const sortedStores = stores
        .map((s) => ({
            name: s.name,
            amount: totals.totalRealizedByStore[s.id] || 0,
            diff: totals.varianceAmountByStore[s.id] || 0,
        }))
        .sort((a, b) => b.amount - a.amount);

    const topStore = sortedStores[0] || { name: "--", amount: 0, diff: 0 };

    // 3. Données BarChart : Réalisé vs Budget par boutique
    const chartData = stores.map((s) => {
        const realized = Math.round(totals.totalRealizedByStore[s.id] || 0);
        const variance = totals.varianceAmountByStore[s.id] || 0;
        const budget = Math.round(realized - variance);

        return {
            name: s.name,
            Réalisé: realized,
            Budget: budget,
        };
    });

    return (
        <div className="space-y-4">
            {/* ── 4 Cartes KPIs Compactes (Haute Densité CeoKpiCard) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. CA Consolidé */}
                <CeoKpiCard
                    label="Chiffre d'Affaires Brut"
                    value={`${totals.totalRealizedGlobal.toLocaleString("fr-FR")} $`}
                    subtitle={
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            +{totals.totalVariancePercentGlobal}% vs Budget (+{totals.totalVarianceGlobal.toLocaleString("fr-FR")} $)
                        </span>
                    }
                    icon={<DollarSign className="w-4 h-4" />}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50 dark:bg-emerald-950/50"
                    isLoading={isLoading}
                />

                {/* 2. Catégorie Leader */}
                <CeoKpiCard
                    label="Département Leader"
                    value={leaderCategory.categoryName}
                    subtitle={`${leaderCategory.totalRealized.toLocaleString("fr-FR")} $ (${leaderShare}% du volume)`}
                    icon={<Award className="w-4 h-4" />}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50 dark:bg-indigo-950/50"
                    valueColor="text-indigo-600 dark:text-indigo-400"
                    isLoading={isLoading}
                />

                {/* 3. Top Boutique */}
                <CeoKpiCard
                    label="Top Point de Vente"
                    value={topStore.name}
                    subtitle={`${topStore.amount.toLocaleString("fr-FR")} $ encaissés`}
                    icon={<Store className="w-4 h-4" />}
                    iconColor="text-violet-600"
                    iconBg="bg-violet-50 dark:bg-violet-950/50"
                    valueColor="text-violet-600 dark:text-violet-400"
                    isLoading={isLoading}
                />

                {/* 4. Sous-performance ou Alerte */}
                <CeoKpiCard
                    label="Suivi Objectif"
                    value={totals.totalVariancePercentGlobal >= 0 ? "Surperformance" : "Sous-Objectif"}
                    subtitle={`${Math.abs(totals.totalVarianceGlobal).toLocaleString("fr-FR")} $ d'écart budgétaire`}
                    icon={<TrendingUp className="w-4 h-4" />}
                    iconColor={totals.totalVarianceGlobal >= 0 ? "text-emerald-600" : "text-rose-600"}
                    iconBg={totals.totalVarianceGlobal >= 0 ? "bg-emerald-50 dark:bg-emerald-950/50" : "bg-rose-50 dark:bg-rose-950/50"}
                    valueColor={totals.totalVarianceGlobal >= 0 ? "text-emerald-600" : "text-rose-600"}
                    isLoading={isLoading}
                />
            </div>

            {/* ── Graphique Compact Réalisé vs Budget ── */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Réalisé vs Budget par Boutique
                        </h3>
                        <p className="text-[10px] text-slate-500">
                            Comparaison directe des ventes nettes ($) par point de vente
                        </p>
                    </div>
                </div>

                <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fill: "#64748b" }}
                                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "10px",
                                    border: "none",
                                    boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
                                    fontSize: "11px",
                                }}
                                formatter={(val: any, name: any) => [
                                    `${Number(val).toLocaleString("fr-FR")} $`,
                                    name,
                                ]}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px" }} />
                            <Bar dataKey="Réalisé" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="Budget" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={26} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}