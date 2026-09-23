// app/ceo-report/finance/finance-client.tsx
"use client";

import { toast } from "sonner";
import {
    Banknote,
    DollarSign,
    ShieldCheck,
    Percent,
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
    PieChart,
    Pie,
    Cell,
} from "recharts";
import DashboardHeader from "@/app/revenue/arpu/_components/arpu-header";
import PurchaseAuditFinanceTable from "./_components/purchase-audit-finance-table";

const LANDED_COST_COLORS = ["#6366f1", "#0ea5e9", "#f59e0b"];

export default function FinanceAuditClient() {
    // Graphique 1 : Facturé Odoo vs Décaissement Payé
    const paymentComparisonData = [
        { category: "Femme", "Facturé Odoo": 22000, "Décaissement Payé": 16000, "Reste à Payer": 6000 },
        { category: "Kids", "Facturé Odoo": 6500, "Décaissement Payé": 6500, "Reste à Payer": 0 },
        { category: "Beauty", "Facturé Odoo": 12000, "Décaissement Payé": 12000, "Reste à Payer": 0 },
    ];

    // Graphique 2 : Structure des frais d'approche logistiques (7 800 $)
    const landedCostsShareData = [
        { name: "Frets du mois", value: 3800, percent: "9,05%" },
        { name: "Douanes & Dédouanement", value: 2900, percent: "6,90%" },
        { name: "Transports sur achats", value: 1100, percent: "2,62%" },
    ];

    return (
        <div className="space-y-6">
            {/* 1. Header de Contrôle & Synchronisation Odoo Compta */}
            <DashboardHeader onExport={(fmt) => toast(`Export ${fmt} de l'audit comptable en cours...`)} />

            {/* 2. 4 KPIs Financiers & Trésorerie */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1 : Facturé Odoo */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Total Facturé Odoo
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                            <Banknote className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                        40 500 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Sur 42 000 $ engagés en PO</p>
                </div>

                {/* KPI 2 : Total Réellement Décaisé */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Décaissements Payés
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-emerald-600">
                        34 500 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Reste à payer : <span className="font-bold text-amber-600">6 000 $</span> (Achats Femme)
                    </p>
                </div>

                {/* KPI 3 : Coûts Logistiques d'Approche */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Frais d'Approche
                        </span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <Percent className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-indigo-600">
                        7 800 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        +18,57% de surcoût sur les achats PO
                    </p>
                </div>

                {/* KPI 4 : Performance de Négociation Achat */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Économie Négociée
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-emerald-600">
                        -7 000 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        Demande prix (49k$) vs Bon de commande (42k$)
                    </p>
                </div>
            </div>

            {/* 3. Section Graphiques Financiers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Facturé vs Payé */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Rapprochement Facturation Odoo vs Trésorerie Décaisée
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">
                        Ventilation des montants facturés et des règlements par catégorie d'achat ($)
                    </p>
                    <div className="h-[210px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={paymentComparisonData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }}
                                    formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]}
                                />
                                <Legend wrapperStyle={{ fontSize: "10px" }} />
                                <Bar dataKey="Facturé Odoo" fill="#64748b" radius={[3, 3, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="Décaissement Payé" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="Reste à Payer" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut : Structure des Frais d'Approche (Landed Costs) */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                        Frais d'Approche (7 800 $)
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-2">Poids par poste logistique</p>

                    <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={landedCostsShareData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value">
                                    {landedCostsShareData.map((_, i) => (
                                        <Cell key={i} fill={LANDED_COST_COLORS[i % LANDED_COST_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-1.5 mt-2">
                        {landedCostsShareData.map((s, i) => (
                            <div key={s.name} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: LANDED_COST_COLORS[i % LANDED_COST_COLORS.length] }} />
                                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{s.name}</span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                    {s.value.toLocaleString("fr-FR")} $ ({s.percent})
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 4. Le Tableau Matrice exact du Point 6 */}
            <div className="space-y-2">
                <PurchaseAuditFinanceTable />
            </div>
        </div>
    );
}