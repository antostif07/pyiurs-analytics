// app/ceo-report/stock/stock-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    Package,
    AlertOctagon,
    Layers,
    ShieldAlert,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area,
} from "recharts";
import DashboardHeader from "@/app/revenue/arpu/_components/arpu-header";
import StockMovementMatrixTable, {
    DEFAULT_STOCK_MOVEMENTS,
} from "./_components/stock-movement-matrix-table";
import StoreStockAuditSizesTable from "./_components/store-stock-audit-sizes-table";

export default function StockClient() {
    const [movementData] = useState(DEFAULT_STOCK_MOVEMENTS);

    // Graphique 1 : Entrées (Achats) vs Sorties (Ventes)
    const fluxChartData = movementData.map((d) => ({
        name: d.segment,
        "Achats Fournisseurs": d.purchases,
        "Ventes Sorties": d.sales,
    }));

    // Graphique 2 : Courbe de distribution des tailles Femme (Total 1 600 pcs)
    const sizesCurveData = [
        { size: "S", pieces: 240, part: "15%" },
        { size: "M", pieces: 500, part: "31%" },
        { size: "L", pieces: 435, part: "27%" },
        { size: "XL", pieces: 275, part: "17%" },
        { size: "XXL+", pieces: 150, part: "10%" },
    ];

    return (
        <div className="space-y-6">
            {/* 1. Header Odoo Stock Sync */}
            <DashboardHeader onExport={(fmt) => toast(`Export ${fmt} du stock complet en cours...`)} />

            {/* 2. 4 KPIs d'Actif Stock & Conformité Audit */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Valorisation Stock
                        </span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <Package className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                        106 990 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">51 500 $ logés au P.BC (Central)</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Alerte Audit Physique
                        </span>
                        <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-rose-600">
                        P.LMB (&gt; 90J)
                    </div>
                    <p className="text-[10px] text-rose-500 font-semibold mt-0.5">
                        Retard critique d'inventaire Odoo
                    </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Parc Tailles Femme
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-blue-600">
                        1 600 pcs
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Cœur de cible : Tailles M & L (58%)</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Démarque & Ajustements
                        </span>
                        <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                            <AlertOctagon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-rose-600">
                        -800 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Femme : -450 $ | Kids : -200 $</p>
                </div>
            </div>

            {/* 3. Graphiques Analytiques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Graphique Flux Achats vs Ventes */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Équilibre des Flux : Entrées Fournisseurs vs Sorties Clients
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">Valorisation des mouvements par catégorie ($)</p>
                    <div className="h-[190px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fluxChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }} formatter={(val: any) => [`${Number(val).toLocaleString("fr-FR")} $`]} />
                                <Legend wrapperStyle={{ fontSize: "10px" }} />
                                <Bar dataKey="Achats Fournisseurs" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={24} />
                                <Bar dataKey="Ventes Sorties" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Courbe en cloche des Tailles Femme */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Courbe des Tailles Femme (1 600 pcs)
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-2">Répartition S à XXL+</p>
                    <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sizesCurveData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSize" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="size" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                                <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "11px" }} formatter={(v: any) => [`${v} pcs`, "Quantité"]} />
                                <Area type="monotone" dataKey="pieces" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSize)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                        <span>S: 15%</span>
                        <span className="font-bold text-indigo-600">M: 31%</span>
                        <span className="font-bold text-indigo-600">L: 27%</span>
                        <span>XL: 17%</span>
                        <span>XXL: 10%</span>
                    </div>
                </div>
            </div>

            {/* 4. Tableau Point 3 : Mouvements Globaux */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        3. MOUVEMENTS DE STOCK GLOBAL (CLÔTURE M-1, ACHATS FOURNISSEURS, VENTES & AJUSTEMENTS)
                    </h2>
                </div>
                <StockMovementMatrixTable data={movementData} />
            </div>

            {/* 5. Tableau Point 8 : Valorisation par Boutique & Tailles Femme */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        8. VALORISATION DU STOCK PAR BOUTIQUE (AVEC AUDITS) & SUIVI DES TAILLES FEMME
                    </h2>
                </div>
                <StoreStockAuditSizesTable />
            </div>
        </div>
    );
}