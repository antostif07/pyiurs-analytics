// app/ceo-report/customers/customers-client.tsx
"use client";

import { toast } from "sonner";
import { Users, UserPlus, UserMinus, DollarSign } from "lucide-react";
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
import DashboardHeader from "@/components/new-ui/layout/dashboard-header";
import CustomerMatrixTable from "./_components/customer-matrix-table";
import CeoKpiCard from "@/app/ceo-report/_components/ceo-kpi-card";
import { useCustomerSegmentation } from "./_lib/hooks/use-customer-segmentation";

export default function CustomersClient() {
    const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useCustomerSegmentation();

    const isBusy = isLoading || isFetching;
    const kpis = data?.kpis || {
        parcTotal: 0,
        parcActif: 0,
        grossAdds: 0,
        churn30d: 0,
        arpuGlobal: 0,
        arpuActif: 0,
    };

    const rows = data?.rows || [];

    // Graphique basé UNIQUEMENT sur la période sélectionnée
    const chartData = rows.map((d) => ({
        name: d.segment,
        "Revenu Acquisition": d.acqRevenue,
        "Revenu Récurrent": d.recRevenue,
    }));

    const handleRefresh = async () => {
        try {
            await refetch();
            toast.success("Clientèle actualisée depuis Odoo");
        } catch {
            toast.error("Échec de l'actualisation");
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Header Global avec filtres de date */}
            <DashboardHeader
                title="Suivi Clientèle, Flux & Segmentation"
                subtitle="Analyse du parc clients par mobile unique, flux d'acquisition, churn 30j et ARPU"
                badgeLabel="Live Odoo"
                isLoading={isBusy}
                lastUpdatedAt={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
                onRefresh={handleRefresh}
                onExport={(fmt) => toast(`Export ${fmt} de la clientèle...`)}
            />

            {/* 2. 4 KPIs avec les 2 Parcs et les 2 ARPUs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1 : Parc Total & Parc Actif */}
                <CeoKpiCard
                    label="Parc Total / Actif"
                    value={`${kpis.parcActif.toLocaleString("fr-FR")} actives`}
                    subtitle={`Sur ${kpis.parcTotal.toLocaleString("fr-FR")} clientes dans la base globale`}
                    icon={<Users className="w-4 h-4" />}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-50 dark:bg-blue-950/50"
                    isLoading={isBusy}
                />

                {/* KPI 2 : Gross Adds */}
                <CeoKpiCard
                    label="Gross Adds (Nouveaux)"
                    value={`+${kpis.grossAdds.toLocaleString("fr-FR")}`}
                    subtitle="Première commande sur la période"
                    icon={<UserPlus className="w-4 h-4" />}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50 dark:bg-emerald-950/50"
                    valueColor="text-emerald-600"
                    isLoading={isBusy}
                />

                {/* KPI 3 : Churn 30J */}
                <CeoKpiCard
                    label="Churn 30J"
                    value={kpis.churn30d.toLocaleString("fr-FR")}
                    subtitle="Sans achat depuis plus de 30 jours"
                    icon={<UserMinus className="w-4 h-4" />}
                    iconColor="text-rose-600"
                    iconBg="bg-rose-50 dark:bg-rose-950/50"
                    valueColor="text-rose-600"
                    isLoading={isBusy}
                />

                {/* KPI 4 : ARPU Actif & ARPU Global */}
                <CeoKpiCard
                    label="ARPU Actif (Période)"
                    value={`${kpis.arpuActif.toFixed(2).replace(".", ",")} $`}
                    subtitle={`Panier global historique : ${kpis.arpuGlobal.toFixed(2).replace(".", ",")} $`}
                    icon={<DollarSign className="w-4 h-4" />}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50 dark:bg-indigo-950/50"
                    valueColor="text-indigo-600"
                    isLoading={isBusy}
                />
            </div>

            {/* 3. Graphique : Basé UNIQUEMENT sur la période sélectionnée */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                    Mix Revenus : Acquisition vs Récurrent par Segment (Période)
                </h3>
                <p className="text-[10px] text-slate-500 mb-3">
                    Contribution financière des nouvelles clientes vs clientes fidèles sur la sélection ($)
                </p>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                                contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }}
                                formatter={(v: any) => [`${Number(v).toLocaleString("fr-FR")} $`]}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px" }} />
                            <Bar dataKey="Revenu Acquisition" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                            <Bar dataKey="Revenu Récurrent" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={24} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. Le Tableau Matrice Point 2 (Basé UNIQUEMENT sur la période) */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        2. SUIVI CLIENTÈLE, FLUX (GROSS ADDS, CHURN 30J) & SEGMENTATION
                    </h2>
                </div>
                <CustomerMatrixTable data={rows} isLoading={isBusy} />
            </div>
        </div>
    );
}