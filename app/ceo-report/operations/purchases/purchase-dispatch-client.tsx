// app/ceo-report/operations/purchases/purchase-dispatch-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShoppingBag, Truck, ArrowRightLeft, Warehouse } from "lucide-react";
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
import DashboardHeader from "@/app/revenue/arpu/_components/arpu-header";
import PurchaseDispatchMatrixTable, {
    DEFAULT_PURCHASE_DISPATCH,
} from "../_components/purchase-dispatch-matrix-table";

const STORE_DISPATCH_BAR_COLORS: Record<string, string> = {
    P24: "#3b82f6",
    "P.MTO": "#6366f1",
    "P.ONL": "#8b5cf6",
    "P.LMB": "#0ea5e9",
    "P.KTM": "#14b8a6",
};

export default function PurchaseDispatchClient() {
    const [data] = useState(DEFAULT_PURCHASE_DISPATCH);

    // Graphique 1 : Entonnoir par Catégorie (Commande PO vs Reçu P.BC vs Transféré)
    const funnelChartData = data.map((d) => ({
        name: d.category.replace("Achats ", ""),
        "Commande PO": d.poAmount,
        "Reçu P.BC": d.receivedPbc,
        "Transféré Boutiques": d.totalTransferred,
        "Reliquat Central": d.reliquatPbc,
    }));

    // Graphique 2 : Volume total transféré par boutique
    const storeComparisonData = [
        { store: "P24", montant: 10400, part: "27,7%" },
        { store: "P.MTO", montant: 7900, part: "21,1%" },
        { store: "P.ONL", montant: 7800, part: "20,8%" },
        { store: "P.LMB", montant: 6100, part: "16,3%" },
        { store: "P.KTM", montant: 5300, part: "14,1%" },
    ];

    return (
        <div className="space-y-6">
            {/* 1. Header de Contrôle & Synchronisation Odoo PO */}
            <DashboardHeader onExport={(fmt) => toast(`Export ${fmt} des achats PO en cours...`)} />

            {/* 2. 4 KPIs Exécutifs Supply Chain */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1 : Total Commandes PO */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Engagements PO
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                        42 000 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">3 catégories d'achats</p>
                </div>

                {/* KPI 2 : Taux de Réception Entrepôt Central P.BC */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Reçu P.BC (Central)
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <Truck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-emerald-600">
                        40 500 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        96,4% reçu (1 500 $ en reliquat Beauty)
                    </p>
                </div>

                {/* KPI 3 : Total Transféré vers les 5 Boutiques */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Dispatch Boutiques
                        </span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <ArrowRightLeft className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-indigo-600">
                        37 500 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        92,6% des réceptions expédiées
                    </p>
                </div>

                {/* KPI 4 : Reliquat Tampon au Magasin Central */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Stock Tampon P.BC
                        </span>
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                            <Warehouse className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-amber-600">
                        3 000 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Stock de sécurité conservé au central
                    </p>
                </div>
            </div>

            {/* 3. Section Graphiques de Flux Logistiques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Entonnoir PO -> Réception -> Dispatch */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Pipeline Logistique par Catégorie : Commande vs Réception vs Dispatch
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">
                        Contrôle des volumes reçus et distribués aux points de vente ($)
                    </p>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={funnelChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
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
                </div>

                {/* Répartition par Boutique */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Part des Réassorts Reçus
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">
                        Ventilation des 37 500 $ transférés
                    </p>
                    <div className="space-y-2.5">
                        {storeComparisonData.map((s) => (
                            <div key={s.store} className="space-y-1">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">{s.store}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-900 dark:text-white">
                                            {s.montant.toLocaleString("fr-FR")} $
                                        </span>
                                        <span className="text-indigo-600 text-[10px]">({s.part})</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: s.part,
                                            backgroundColor: STORE_DISPATCH_BAR_COLORS[s.store] || "#6366f1",
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Le Tableau Matrice exact du Point 4 (Réutilisé) */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        4. SUIVI DES ACHATS PO : COMMANDES, RÉCEPTIONS P.BC & TRANSFERTS ENVOYÉS AUX BOUTIQUES
                    </h2>
                </div>
                <PurchaseDispatchMatrixTable data={data} />
            </div>
        </div>
    );
}