"use client";

import { DollarSign, TrendingUp, Store, Award } from "lucide-react";
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
import type { SalesMatrixData } from "./types";

export default function SalesExecutiveSummary({ data }: { data: SalesMatrixData }) {
    // Préparation des données pour le graphique comparatif Réalisé vs Budget par boutique
    const chartData = data.stores.map((s) => {
        const realized = data.totals.totalRealizedByStore[s.id] || 0;
        const variance = data.totals.varianceAmountByStore[s.id] || 0;
        const budget = realized - variance; // Budget calculé rétroactivement

        return {
            name: s.code.replace(" ($)", ""),
            Réalisé: realized,
            Budget: budget,
        };
    });

    return (
        <div className="space-y-8">
            {/* 4 Cartes Exécutives (Style de votre module ARPU) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                            CA Consolidé
                        </span>
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                        {data.totals.totalRealizedGlobal.toLocaleString("en-US")} $
                    </div>
                    <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <span>+{data.totals.totalVariancePercentGlobal}% vs Budget</span>
                        <span className="text-slate-400 font-normal">
                            (+{data.totals.totalVarianceGlobal.toLocaleString()} $)
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Catégorie Leader
                        </span>
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <Award className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        Femme
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-500">
                        50 000 $ (52,1% du volume d'affaires)
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Top Point de Vente
                        </span>
                        <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600">
                            <Store className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        P.ONL (Online)
                    </div>
                    <div className="mt-2 text-xs font-bold text-emerald-600">
                        +2 500 $ au-dessus du budget
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Alerte Sous-performance
                        </span>
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600">
                        Kids (-5,3%)
                    </div>
                    <div className="mt-2 text-xs font-medium text-slate-500">
                        Déficit de -1 000 $ vs budget assigné
                    </div>
                </div>
            </div>

            {/* Graphique Comparatif Réalisé vs Budget par Boutique */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            Réalisé vs Budget par Point de Vente
                        </h3>
                        <p className="text-sm text-slate-500">
                            Comparaison directe des performances par boutique
                        </p>
                    </div>
                </div>

                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: "#64748b", fontWeight: "bold" }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: "#64748b" }}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k $`}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "16px",
                                    border: "none",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                                }}
                                formatter={(value: any, name: any) => [
                                    typeof value === "number"
                                        ? `${value.toLocaleString("en-US")} $`
                                        : `${value ?? 0} $`,
                                    name ? String(name) : "",
                                ]}
                            />
                            <Legend />
                            <Bar dataKey="Réalisé" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
                            <Bar dataKey="Budget" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}