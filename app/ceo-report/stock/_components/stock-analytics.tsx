// app/ceo-report/stock/_components/stock-analytics.tsx
"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import type { StockFluxPoint, SizeDistributionPoint } from "../_lib/types";

const PIE_PALETTE = [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#ec4899", // Rose
    "#0ea5e9", // Bleu ciel
    "#f59e0b", // Ambre
    "#10b981", // Émeraude
    "#64748b", // Ardoise
    "#94a3b8", // Gris clair
];

interface StockAnalyticsProps {
    fluxData: StockFluxPoint[];
    sizesData: SizeDistributionPoint[];
    isLoading?: boolean; // ✅ Prise en compte du chargement
}

export default function StockAnalytics({
    fluxData,
    sizesData,
    isLoading = false,
}: StockAnalyticsProps) {
    const totalWomenPieces = sizesData.reduce(
        (acc, s) => acc + (s.pieces > 0 ? s.pieces : 0),
        0
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ── 1. BarChart : Flux Entrées vs Sorties ── */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                    Équilibre des Flux : Entrées Fournisseurs vs Sorties Clients
                </h3>
                <p className="text-[10px] text-slate-500 mb-3">
                    Valorisation des mouvements par catégorie ($)
                </p>

                {isLoading ? (
                    <div className="h-[190px] w-full flex items-end gap-3 px-4 pb-2 animate-pulse">
                        <div className="h-3/4 w-1/6 bg-slate-100 dark:bg-slate-800 rounded-t-lg" />
                        <div className="h-1/2 w-1/6 bg-slate-100 dark:bg-slate-800 rounded-t-lg" />
                        <div className="h-full w-1/6 bg-slate-100 dark:bg-slate-800 rounded-t-lg" />
                        <div className="h-2/3 w-1/6 bg-slate-100 dark:bg-slate-800 rounded-t-lg" />
                        <div className="h-4/5 w-1/6 bg-slate-100 dark:bg-slate-800 rounded-t-lg" />
                        <div className="h-1/3 w-1/6 bg-slate-100 dark:bg-slate-800 rounded-t-lg" />
                    </div>
                ) : (
                    <div className="h-[190px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fluxData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }}
                                    formatter={(val: any) => [`${Number(val).toLocaleString("fr-FR")} $`]}
                                />
                                <Legend wrapperStyle={{ fontSize: "10px" }} />
                                <Bar dataKey="Achats Fournisseurs" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
                                <Bar dataKey="Ventes Sorties" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ── 2. Camembert (Donut) : Répartition des Tailles Femme ── */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                            Répartition Tailles Femme
                        </h3>
                        {isLoading ? (
                            <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        ) : (
                            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                                {totalWomenPieces.toLocaleString("fr-FR")} pcs
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">
                        Répartition des stocks par grille de taille
                    </p>
                </div>

                {/* État de Chargement Skeleton pour le Donut */}
                {isLoading ? (
                    <div className="h-[180px] w-full flex flex-col items-center justify-center gap-3 animate-pulse">
                        <div className="w-24 h-24 rounded-full border-8 border-slate-200 dark:border-slate-800 border-t-indigo-500/40" />
                        <div className="w-32 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                ) : sizesData.length > 0 && totalWomenPieces > 0 ? (
                    <>
                        <div className="h-[125px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={sizesData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={36}
                                        outerRadius={56}
                                        paddingAngle={2}
                                        dataKey="pieces"
                                        nameKey="size"
                                    >
                                        {sizesData.map((_, i) => (
                                            <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.08)", fontSize: "11px" }}
                                        formatter={(v: any, name: any) => [`${Number(v).toLocaleString("fr-FR")} pcs`, `Taille ${name}`]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Total au centre du trou */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Femme</span>
                                <span className="text-xs font-black font-mono text-slate-900 dark:text-white leading-none mt-0.5">
                                    {totalWomenPieces.toLocaleString("fr-FR")}
                                </span>
                            </div>
                        </div>

                        {/* Légende détaillée */}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 max-h-[72px] overflow-y-auto pr-1">
                            {sizesData.map((s, i) => (
                                <div key={s.size} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }}
                                        />
                                        <span className="text-slate-600 dark:text-slate-400 font-semibold truncate">
                                            {s.size}
                                        </span>
                                    </div>
                                    <span className="font-mono text-slate-900 dark:text-white shrink-0">
                                        {s.pieces} <span className="text-slate-400 text-[9px]">({s.part})</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="h-[180px] flex items-center justify-center text-center text-xs text-slate-400 italic">
                        Aucune taille enregistrée sur les articles Femme
                    </div>
                )}
            </div>
        </div>
    );
}