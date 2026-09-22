// app/ceo-report/cash/cash-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Banknote, AlertTriangle, PieChart as PieIcon, ShoppingBag } from "lucide-react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";
import CashOpexMatrixTable from "./_components/cash-opex-matrix-table";
import DashboardHeader from "@/components/new-ui/layout/dashboard-header";

const OPEX_COLORS = ["#3b82f6", "#64748b", "#ec4899", "#f59e0b", "#8b5cf6", "#10b981"];

export default function CashClient() {
    const opexChartData = [
        { name: "Marchandises", value: 42000 },
        { name: "Masse Salariale", value: 8400 },
        { name: "Loyers & Baux", value: 7800 },
        { name: "Marketing", value: 3500 },
        { name: "Fiscalité", value: 2400 },
        { name: "Frais Financiers", value: 650 },
    ];

    const cashByStore = [
        { name: "P.BC / ONL", cash: 18500 },
        { name: "P24", cash: 4200 },
        { name: "P.MTO", cash: 3100 },
        { name: "P.LMB", cash: 2400 },
        { name: "P.KTM", cash: 1900 },
    ];

    return (
        <div className="space-y-6">
            <DashboardHeader
                title="Trésorerie Cash & Dépenses OPEX"
                subtitle="Position de trésorerie par boutique et répartition des charges opérationnelles"
                onRefresh={() => { }}
                isLoading={false}
                lastUpdatedAt={new Date()}
                onExport={(format) => toast(`Export ${format} trésorerie...`)}
            />
            {/* 4 KPIs Trésorerie & OPEX */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Cash Dispo</span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <Banknote className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-emerald-600">30 100 $</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">18 500 $ logés au P.BC / Online</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Écart de Caisse POS</span>
                        <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-rose-600">-20 $</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Anomalie clôture caisse P.MTO</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total OPEX Mensuel</span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <PieIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">64 750 $</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Charges opérationnelles globales</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Part Achat Marchandises</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                            <ShoppingBag className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-blue-600">64,8 %</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">42 000 $ investis en stock</p>
                </div>
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* BarChart Cash Boutiques */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Répartition du Cash Disponible par Point de Vente
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">Encaisses physiques et disponibilités bancaires ($)</p>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashByStore} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }} formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]} />
                                <Bar dataKey="cash" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut OPEX */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Mix des Dépenses (OPEX)
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-2">Part dans les 64 750 $</p>
                    <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={opexChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                                    {opexChartData.map((_, i) => (
                                        <Cell key={i} fill={OPEX_COLORS[i % OPEX_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {opexChartData.slice(0, 4).map((s, i) => (
                            <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: OPEX_COLORS[i] }} />
                                <span className="text-slate-500 truncate">{s.name}</span>
                                <span className="font-mono font-bold ml-auto">{((s.value / 64750) * 100).toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tableau Matrice Point 7 */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        7. TRÉSORERIE CASH PAR POINT DE VENTE & CLASSIFICATION DES DÉPENSES (OPEX)
                    </h2>
                </div>
                <CashOpexMatrixTable />
            </div>
        </div>
    );
}