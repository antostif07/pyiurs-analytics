// app/ceo-report/operations/transfers/transfers-client.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    PackageCheck,
    DollarSign,
    FileCheck,
    AlertOctagon,
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
} from "recharts";
import DashboardHeader from "@/app/revenue/arpu/_components/arpu-header";
import TransferPreviewDialog from "../_components/transfer-preview-dialog";
import TransferControlTable, { DEFAULT_TRANSFERS, TransferControlRow } from "../_components/transfer-control-table.tsx";

export default function TransfersClient() {
    const [data] = useState(DEFAULT_TRANSFERS);
    const [selectedTransfer, setSelectedTransfer] = useState<TransferControlRow | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handlePreview = (ref: string) => {
        const found = data.find((t) => t.refTransfert === ref) || null;
        setSelectedTransfer(found);
        setDialogOpen(true);
    };

    // Données analytiques par Boutique réceptrice
    const destinationChartData = data.map((t) => ({
        name: t.destination,
        "Valeur ($)": t.value,
        "Articles (pcs)": t.itemCount,
    }));

    return (
        <div className="space-y-6">
            {/* 1. Header de Contrôle & Synchronisation Odoo stock.picking */}
            <DashboardHeader onExport={(fmt) => toast(`Export ${fmt} de l'audit logistique en cours...`)} />

            {/* 2. KPIs de Contrôle & Risque Logistique */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Transferts Validés
                        </span>
                        <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
                            <PackageCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white">
                        5 TR
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">488 articles expédiés du P.BC</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Valeur Transférée
                        </span>
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-indigo-600">
                        15 800 $
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">Marchandises sécurisées en transit</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Conformité Signature
                        </span>
                        <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                            <FileCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-emerald-600">
                        80,0 %
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">4/5 conformes (1 anomalie LMB)</p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Alerte Code-Barres
                        </span>
                        <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                            <AlertOctagon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl font-bold font-mono text-rose-600">
                        1 Non Renseigné
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">TR-2026-0803 (Risque de perte)</p>
                </div>
            </div>

            {/* 3. Graphique : Valeur et Volume par Boutique Réceptrice */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1">
                    Répartition des Réceptions par Destination
                </h3>
                <p className="text-[10px] text-slate-500 mb-3">
                    Valeur marchande ($) et nombre de pièces acheminées par point de vente
                </p>
                <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={destinationChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b", fontWeight: "bold" }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                                contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 8px 16px rgba(0,0,0,0.06)", fontSize: "11px" }}
                                formatter={(v: any, name: any) => [
                                    name === "Valeur ($)" ? `${Number(v).toLocaleString("fr-FR")} $` : `${v} pcs`,
                                    name,
                                ]}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px" }} />
                            <Bar dataKey="Valeur ($)" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={28} />
                            <Bar dataKey="Articles (pcs)" fill="#0ea5e9" radius={[3, 3, 0, 0]} maxBarSize={28} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 4. Le Tableau Matrice exact du Point 5 */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        5. RAPPORT DE CONTRÔLE DES TRANSFERTS MENSUELS & VALIDATION CODES-BARRES
                    </h2>
                </div>
                <TransferControlTable data={data} onPreview={handlePreview} />
            </div>

            {/* Modale de prévisualisation au clic */}
            <TransferPreviewDialog
                transfer={selectedTransfer}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
}