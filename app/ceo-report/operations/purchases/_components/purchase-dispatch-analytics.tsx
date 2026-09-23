// app/ceo-report/operations/purchases/_components/purchase-dispatch-analytics.tsx
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
} from "recharts";
import type { PurchaseFunnelPoint, StoreDispatchShare } from "../_lib/types";

const STORE_COLORS: Record<string, string> = {
    P24: "#3b82f6",
    "P.MTO": "#6366f1",
    "P.ONL": "#8b5cf6",
    "P.LMB": "#0ea5e9",
    "P.KTM": "#14b8a6",
};

interface PurchaseDispatchAnalyticsProps {
    funnelData: PurchaseFunnelPoint[];
    storeShares: StoreDispatchShare[];
    totalTransferred: number;
    isLoading?: boolean;
}

export default function PurchaseDispatchAnalytics({
    funnelData,
    storeShares,
    totalTransferred,
    isLoading = false,
}: PurchaseDispatchAnalyticsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. BarChart : Entonnoir par Catégorie (2/3 de l'écran) */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                    Pipeline Logistique : Commande vs Réception vs Dispatch
                </h3>
                <p className="text-[10px] text-slate-500 mb-3">
                    Contrôle des volumes reçus et distribués aux points de vente ($)
                </p>

                {isLoading ? (
                    <div className="h-[200px] w-full flex items-end gap-3 px-4 pb-2 animate-pulse">
                        <div className="h-3/4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-t" />
                        <div className="h-full w-1/4 bg-slate-100 dark:bg-slate-800 rounded-t" />
                        <div className="h-2/3 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-t" />
                        <div className="h-1/2 w-1/4 bg-slate-100 dark:bg-slate-800 rounded-t" />
                    </div>
                ) : (
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }}
                                    formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]}
                                />
                                <Legend wrapperStyle={{ fontSize: "10px" }} />
                                <Bar dataKey="Commande PO" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="Reçu P.BC" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="Transféré Boutiques" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* 2. Répartition par Boutique (1/3 de l'écran) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Part des Réassorts Reçus
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">
                        Ventilation des {Math.round(totalTransferred).toLocaleString("fr-FR")} $ transférés
                    </p>
                </div>

                {isLoading ? (
                    <div className="space-y-3 animate-pulse py-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {storeShares.map((s) => (
                            <div key={s.store} className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">{s.store}</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-slate-900 dark:text-white">
                                            {Math.round(s.montant).toLocaleString("fr-FR")} $
                                        </span>
                                        <span className="text-indigo-600 dark:text-indigo-400 text-[10px]">({s.part})</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: s.part,
                                            backgroundColor: STORE_COLORS[s.store] || "#6366f1",
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}