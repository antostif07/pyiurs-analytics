'use client';

import React, { useState, useMemo } from "react";
import {
    Truck,
    PackageCheck,
    AlertTriangle,
    Clock,
    Search,
    Calendar,
    ArrowRight,
    Sparkles,
    Download,
    Boxes,
    FileSpreadsheet
} from "lucide-react";
import Link from "next/link";

// --- 1. INTERFACES DES RÉCEPTIONS DE STOCKS (INCOMING PICKINGS) ---

interface IncomingReceipt {
    pickingRef: string;       // Référence Odoo (ex: WH/IN/00142)
    originPO: string;         // Document d'achat d'origine (ex: PO-2024-082)
    supplier: string;         // Fournisseur
    scheduledDate: string;    // Date de livraison prévue
    actualDate?: string;      // Date de réception effective
    carrier: string;          // Transporteur
    totalQtyExpected: number; // Quantité attendue
    totalQtyReceived: number; // Quantité physique réceptionnée
    status: "Draft" | "Waiting" | "Ready" | "Done" | "Late";
}

// --- 2. DONNÉES SIMULÉES (MOCK DATA CONNECTÉES À L'INVENTAIRE) ---

const MOCK_RECEIPTS: IncomingReceipt[] = [
    { pickingRef: "WH/IN/00241", originPO: "PO-2024-001", supplier: "Amazon Web Services (SaaS)", scheduledDate: "2024-11-05", actualDate: "2024-11-05", carrier: "Digital Delivery", totalQtyExpected: 1, totalQtyReceived: 1, status: "Done" },
    { pickingRef: "WH/IN/00242", originPO: "PO-2024-002", supplier: "Dell Technologies", scheduledDate: "2024-11-04", actualDate: "2024-11-04", carrier: "DHL Express", totalQtyExpected: 15, totalQtyReceived: 15, status: "Done" },
    { pickingRef: "WH/IN/00243", originPO: "PO-2024-003", supplier: "Lyreco Corp", scheduledDate: "2024-11-10", carrier: "FedEx", totalQtyExpected: 250, totalQtyReceived: 0, status: "Ready" },
    { pickingRef: "WH/IN/00244", originPO: "PO-2024-004", supplier: "Verescence Packaging", scheduledDate: "2024-11-02", carrier: "Geodis", totalQtyExpected: 5000, totalQtyReceived: 1200, status: "Late" }, // Retard de livraison
    { pickingRef: "WH/IN/00245", originPO: "PO-2024-005", supplier: "Organic Cotton Co", scheduledDate: "2024-11-12", carrier: "Schenker", totalQtyExpected: 1800, totalQtyReceived: 0, status: "Waiting" },
];

const INVENTORY_INSIGHTS = [
    { type: "critical", message: "Alerte de stockage : La réception Verescence (5000 unités de Packaging attendues) nécessite 12 emplacements palettes vides dans la zone d'allée B.", action: "Réserver emplacements" },
    { type: "delay", message: "Le fournisseur Verescence Packaging (PO-2024-004) accuse un retard de réception de +3 jours sur la date planifiée.", action: "Contacter le transporteur" }
];

export default function InventoryPurchasesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    // Filtrage combiné (Recherche brute + Statut de livraison)
    const filteredReceipts = useMemo(() => {
        return MOCK_RECEIPTS.filter(rcpt => {
            const matchesSearch =
                rcpt.pickingRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rcpt.originPO.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rcpt.supplier.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === "All" || rcpt.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, statusFilter]);

    // Calculs des KPIs d'inventaire d'achats
    const stats = useMemo(() => {
        const totalPending = MOCK_RECEIPTS.filter(r => r.status !== "Done").length;
        const totalLate = MOCK_RECEIPTS.filter(r => r.status === "Late").length;
        const totalDone = MOCK_RECEIPTS.filter(r => r.status === "Done").length;
        const globalExpectedQty = MOCK_RECEIPTS.reduce((acc, c) => acc + c.totalQtyExpected, 0);
        const globalReceivedQty = MOCK_RECEIPTS.reduce((acc, c) => acc + c.totalQtyReceived, 0);
        const receptionRate = Math.round((globalReceivedQty / (globalExpectedQty || 1)) * 100);

        return { totalPending, totalLate, totalDone, receptionRate };
    }, []);

    return (
        <div className="space-y-8 pb-12 bg-slate-50/50 dark:bg-slate-900/10 min-h-screen p-4">

            {/* HEADER DE LA PAGE */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
                        Réceptions d'Achats & <span className="text-indigo-600">Entrées Entrepôt</span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Suivi des réceptions physiques de marchandises en attente d'inventaire (`stock.picking` Odoo).
                    </p>
                </div>

                <div className="flex gap-2">
                    {/* NOUVEAU BOUTON : Redirection vers le générateur de fichier d'import */}
                    <Link
                        href="/inventory/purchases/import-generator"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 shadow-sm"
                    >
                        <FileSpreadsheet size={12} /> Générer fichier Import Commande
                    </Link>

                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase shadow-sm">
                        <Download size={12} /> Exporter Réception (.csv)
                    </button>
                </div>
            </div>

            {/* BLOC KPI DE RECEPTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Réceptions en Attente", value: `${stats.totalPending} Transferts`, subtext: "Prêtes pour déchargement", icon: Truck, color: "text-indigo-600" },
                    { label: "Retards de Livraison", value: `${stats.totalLate} Alertes`, subtext: "Pénalités fournisseurs applicables", icon: AlertTriangle, color: "text-rose-500" },
                    { label: "Validations du Mois", value: `${stats.totalDone} Reçues`, subtext: "Mises en stock validées", icon: PackageCheck, color: "text-emerald-500" },
                    { label: "Taux d'Entrée en Stock", value: `${stats.receptionRate}%`, subtext: "Rendement de réception physique", icon: Boxes, color: "text-blue-500" },
                ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                            <div>
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block leading-none mb-1">{stat.label}</span>
                                <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">{stat.value}</h4>
                                <p className="text-[9px] text-slate-400 mt-1 font-semibold">{stat.subtext}</p>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-full">
                                <Icon size={16} className={stat.color} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* OPPORTUNITÉS & ANOMALIES LOGISTIQUES */}
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        Recommandations Logistiques & Anomalies Réception
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INVENTORY_INSIGHTS.map((insight, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg border text-xs flex justify-between items-start gap-4 ${insight.type === "critical"
                                ? "bg-rose-50/50 border-rose-100 text-rose-950 dark:bg-rose-950/10 dark:border-rose-900 dark:text-rose-200"
                                : "bg-amber-50/50 border-amber-100 text-amber-950 dark:bg-amber-950/10 dark:border-amber-900 dark:text-amber-200"
                                }`}
                        >
                            <div>
                                <span className="font-black uppercase text-[8px] tracking-wider block mb-1">Alerte entrepôt</span>
                                <p className="font-semibold leading-relaxed">{insight.message}</p>
                            </div>
                            <button className="text-[9px] font-black uppercase italic tracking-wider shrink-0 underline hover:opacity-80">
                                {insight.action}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* TABLEAU DES TRANSFERTS D'ENTRÉES DE MARCHANDISE */}
            <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                {/* Barre de Filtres de Recherche locale */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-950">
                    <div>
                        <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            Bons de Réception en Entrée (Incoming Shipments)
                        </h2>
                        <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            Historique et planification de l'arrivée physique des marchandises d'achats.
                        </p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {/* Statut de livraison */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none cursor-pointer shadow-sm"
                        >
                            <option value="All">Tous les statuts</option>
                            <option value="Done">Réceptionné (Done)</option>
                            <option value="Ready">Prêt à recevoir (Ready)</option>
                            <option value="Waiting">En attente (Waiting)</option>
                            <option value="Late">En retard (Late)</option>
                        </select>

                        {/* Input de recherche */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Réf WH, PO d'origine, Fournisseur..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-400 text-slate-700 dark:text-slate-300 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Structure du tableau d'inventaire achats */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse min-w-200">
                        <thead className="bg-slate-900 text-slate-200">
                            <tr>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Réf Transfert</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Fournisseur</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700 text-center">Quantités (Reçues / Attendues)</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700 text-center">Statut Odoo</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Transporteur</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Date Prévue</th>
                                <th className="px-4 py-3 font-bold uppercase tracking-widest">Document Source</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-medium">
                            {filteredReceipts.length > 0 ? (
                                filteredReceipts.map((rcpt) => (
                                    <tr
                                        key={rcpt.pickingRef}
                                        className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                                    >
                                        {/* Réf WH / IN */}
                                        <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-black text-slate-900 dark:text-slate-100 italic">
                                            {rcpt.pickingRef}
                                        </td>

                                        {/* Fournisseur */}
                                        <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-bold text-slate-700 dark:text-slate-300">
                                            {rcpt.supplier}
                                        </td>

                                        {/* Quantités cumulées attendues vs reçues */}
                                        <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="font-black text-slate-900 dark:text-slate-100 italic">{rcpt.totalQtyReceived.toLocaleString()}</span>
                                                <ArrowRight size={10} className="text-slate-400" />
                                                <span className="text-slate-400 dark:text-slate-500 font-bold">{rcpt.totalQtyExpected.toLocaleString()}</span>
                                            </div>
                                        </td>

                                        {/* Badge de Statut */}
                                        <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase italic ${rcpt.status === "Done" ? "bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-950/10 dark:border-emerald-900 dark:text-emerald-300" :
                                                rcpt.status === "Ready" ? "bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/10 dark:border-indigo-900 dark:text-indigo-300" :
                                                    rcpt.status === "Late" ? "bg-rose-50 border border-rose-100 text-rose-700 dark:bg-rose-950/10 dark:border-rose-900 dark:text-rose-300" :
                                                        "bg-amber-50 border border-amber-100 text-amber-700 dark:bg-amber-950/10 dark:border-amber-900 dark:text-amber-300"
                                                }`}>
                                                {rcpt.status === "Done" ? "Reçu (Done)" :
                                                    rcpt.status === "Ready" ? "Prêt (Ready)" :
                                                        rcpt.status === "Late" ? "En retard (Late)" : "Attente (Waiting)"}
                                            </span>
                                        </td>

                                        {/* Transporteur */}
                                        <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-slate-400 dark:text-slate-500 font-semibold">
                                            {rcpt.carrier}
                                        </td>

                                        {/* Date Prévue de réception */}
                                        <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400">
                                            {rcpt.scheduledDate}
                                        </td>

                                        {/* PO Document d'Origine */}
                                        <td className="px-4 py-2 font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                                            {rcpt.originPO}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic bg-slate-50/20 dark:bg-slate-900/10 text-xs">
                                        Aucun bon d'entrée en stock ne correspond à votre recherche.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}