// app/ceo-report/hr/hr-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, Building2, Calendar, Banknote } from "lucide-react";
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
import LeaseHrMatrixTable from "./_components/lease-hr-matrix-table";

export default function HrClient() {
    // Graphique 1 : Coût Salarial Total Chargé par Équipe
    const staffPayrollData = [
        { team: "P.BC (Admin/Stock)", "Salaire Base": 2100, "Avantages": 650, total: 2750 },
        { team: "Vente P24", "Salaire Base": 1200, "Avantages": 300, total: 1500 },
        { team: "Vente P.ONL", "Salaire Base": 900, "Avantages": 250, total: 1150 },
        { team: "Vente P.MTO", "Salaire Base": 800, "Avantages": 200, total: 1000 },
        { team: "Vente P.LMB", "Salaire Base": 800, "Avantages": 200, total: 1000 },
        { team: "Vente P.KTM", "Salaire Base": 800, "Avantages": 200, total: 1000 },
    ];

    return (
        <div className="space-y-6">
            <DashboardHeader onExport={(fmt) => toast(`Export ${fmt} RH & Baux en cours...`)} />

            {/* 4 KPIs RH & Baux */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Effectif Actif</span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">15 Collaborateurs</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">11 en boutique / 4 au siège P.BC</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Masse Salariale Chargée</span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <Banknote className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-emerald-600">8 400 $</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">6 600 $ salaires + 1 800 $ avantages</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Loyers Payés (YTD)</span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-indigo-600">68 200 $</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Loyer mensuel consolidé : 7 800 $</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Congés Cumulés</span>
                        <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-amber-600">61 Jours</div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Provision passif social à surveiller</p>
                </div>
            </div>

            {/* Graphique Masse Salariale */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                    Ventilation du Coût Salarial Chargé par Entité
                </h3>
                <p className="text-[10px] text-slate-500 mb-3">Répartition Base Fixe vs Primes & Avantages Sociaux ($)</p>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={staffPayrollData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="team" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "11px" }} formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]} />
                            <Legend wrapperStyle={{ fontSize: "10px" }} />
                            <Bar dataKey="Salaire Base" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={26} />
                            <Bar dataKey="Avantages" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={26} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tableau Matrice Point 9 : Loyers & RH */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        9. SUIVI IMMOBILIER (LOYERS), FISCALITÉ LOCATIVE & TABLEAU RH
                    </h2>
                </div>
                <LeaseHrMatrixTable />
            </div>
        </div>
    );
}