// app/ceo-report/customers/customers-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, UserPlus, UserMinus, DollarSign, Award } from "lucide-react";
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
import DashboardHeader from "@/app/revenue/arpu/_components/arpu-header";
import CustomerMatrixTable, {
    DEFAULT_CUSTOMER_DATA,
} from "./_components/customer-matrix-table";

const PIE_COLORS = ["#0f172a", "#f59e0b", "#94a3b8", "#64748b"];

export default function CustomersClient() {
    const [data] = useState(DEFAULT_CUSTOMER_DATA);

    // Graphique 1 : Mix Revenu Acquisition vs Récurrent
    const revenueMixData = data.map((d) => ({
        name: d.segment,
        Acquisition: d.acqRevenue,
        Récurrent: d.recRevenue,
    }));

    // Graphique 2 : Répartition du CA Total par Segment (Pareto)
    const shareData = data.map((d) => ({
        name: d.segment,
        value: d.acqRevenue + d.recRevenue,
    }));

    return (
        <div className="space-y-6">
            {/* 1. Header de contrôle */}
            <DashboardHeader onExport={(fmt) => toast(`Export ${fmt} en cours...`)} />

            {/* 2. KPIs Clés Clientèle */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parc Total</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">2 750</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Base active identifiée</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Adds</span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <UserPlus className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-emerald-600">+289</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">24 900 $ générés</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Churn 30J</span>
                        <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                            <UserMinus className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-rose-600">122</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">4,4% taux d'attrition</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ARPU Global</span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-indigo-600">34,91 $</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Platinum à 261,25 $</p>
                </div>
            </div>

            {/* 3. Section Graphiques d'Analyse */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* BarChart : Acquisition vs Récurrent */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Mix Revenus par Segment : Acquisition vs Récurrent
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">
                        Structure du chiffre d'affaires généré par segment ($)
                    </p>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueMixData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }}
                                    formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]}
                                />
                                <Legend wrapperStyle={{ fontSize: "10px" }} />
                                <Bar dataKey="Acquisition" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                                <Bar dataKey="Récurrent" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut : Contribution au CA Total */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Poids dans le Chiffre d'Affaires
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-2">Part du CA total ($96 000)</p>
                    <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={shareData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                                    {shareData.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {shareData.map((s, i) => (
                            <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="text-slate-500 truncate">{s.name}</span>
                                <span className="font-mono font-bold ml-auto">{((s.value / 96000) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Le Tableau Matrice exact (Réutilisé) */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        2. SUIVI CLIENTÈLE, FLUX (GROSS ADDS, CHURN 30J) & SEGMENTATION
                    </h2>
                </div>
                <CustomerMatrixTable data={data} />
            </div>
        </div>
    );
}