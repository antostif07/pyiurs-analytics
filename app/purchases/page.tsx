// app/purchases/page.tsx

'use client';

import React, { useState } from "react";
import { 
  TrendingDown, 
  TrendingUp, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  ShieldCheck, 
  ArrowLeftRight, 
  Calendar,
  Sparkles,
  ArrowUpDown,
  Search,
  CheckCircle,
  XCircle,
  ExternalLink
} from "lucide-react";

// --- 1. TYPES & INTERFACES DU MODULE ACHATS ---

interface KPIMetric {
  label: string;
  value: string | number;
  subtext: string;
  trend?: {
    value: string;
    type: "positive" | "negative" | "neutral";
  };
  progress?: {
    current: number;
    max: number;
    color: string;
  };
  icon: any;
}

interface PurchaseOrder {
  id: string;
  supplier: string;
  department: string;
  amount: number;
  status: "Pending" | "Approved" | "Delivered";
  createdDate: string;
  expectedDelivery: string;
}

// --- 2. DONNÉES SIMULÉES (MOCK DATA) ---

const KPI_METRICS: KPIMetric[] = [
  {
    label: "Total Dépenses MTD",
    value: "$1,245,800",
    subtext: "Cumulé annuel : $14.8M",
    trend: { value: "+4.2% vs M-1", type: "negative" }, // Hausse des dépenses = négatif
    icon: ArrowLeftRight
  },
  {
    label: "Consommation Budget",
    value: "81.9%",
    subtext: "$1.24M dépensés sur $1.52M alloués",
    progress: { current: 81.9, max: 100, color: "bg-indigo-600" },
    icon: ShieldCheck
  },
  {
    label: "Économies Réalisées",
    value: "$148,300",
    subtext: "11.9% du volume négocié",
    trend: { value: "+1.8% vs objectif", type: "positive" },
    icon: TrendingDown
  },
  {
    label: "Commandes Actives",
    value: "42 POs",
    subtext: "12 en attente de réception",
    icon: FileText
  },
  {
    label: "Approbations en Attente",
    value: "7 Requêtes",
    subtext: "4 en attente depuis > 48h",
    trend: { value: "3 prioritaires", type: "neutral" },
    icon: Clock
  },
  {
    label: "Fournisseurs Actifs",
    value: "128 Comptes",
    subtext: "14 partenaires privilégiés",
    icon: Users
  },
  {
    label: "Délai Approbation Moyen",
    value: "4.2 Heures",
    subtext: "Objectif cible : 6.0h",
    trend: { value: "-18% de réduction", type: "positive" },
    icon: CheckCircle2
  },
  {
    label: "Taux de Conformité",
    value: "96.4%",
    subtext: "Contrats cadres respectés",
    progress: { current: 96.4, max: 100, color: "bg-emerald-500" },
    icon: ShieldCheck
  }
];

const RECENT_WORKFLOWS = [
  {
    id: "WF-1092",
    title: "Achat 15x Workstations Dell",
    department: "R&D",
    user: "Thomas L.",
    status: "approved",
    time: "Il y a 12 min",
    amount: "$22,500"
  },
  {
    id: "WF-1091",
    title: "Renouvellement Licences Slack Enterprise",
    department: "IT",
    user: "Sophie M.",
    status: "pending",
    time: "Il y a 45 min",
    amount: "$12,400"
  },
  {
    id: "WF-1090",
    title: "Contrat de Support AWS Premium",
    department: "Infrastructure",
    user: "Marc A.",
    status: "approved",
    time: "Il y a 2h",
    amount: "$48,000"
  },
  {
    id: "WF-1089",
    title: "Prestation Cabinet Audit Stratégique",
    department: "Finance",
    user: "Antoine P.",
    status: "rejected",
    time: "Il y a 3h",
    amount: "$15,000"
  }
];

const RECENT_PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "PO-2024-001", supplier: "Amazon Web Services", department: "Infrastructure", amount: 28500, status: "Approved", createdDate: "2024-11-01", expectedDelivery: "2024-11-05" },
  { id: "PO-2024-002", supplier: "Dell Technologies", department: "R&D", amount: 22500, status: "Delivered", createdDate: "2024-11-01", expectedDelivery: "2024-11-04" },
  { id: "PO-2024-003", supplier: "McKinsey Company", department: "Finance", amount: 45000, status: "Approved", createdDate: "2024-10-31", expectedDelivery: "2024-11-30" },
  { id: "PO-2024-004", supplier: "Lyreco Corp", department: "Services Généraux", amount: 3100, status: "Pending", createdDate: "2024-11-03", expectedDelivery: "2024-11-10" },
  { id: "PO-2024-005", supplier: "Salesforce EMEA", department: "Sales", amount: 18900, status: "Approved", createdDate: "2024-11-02", expectedDelivery: "2024-11-06" }
];

const AI_INSIGHTS = [
  {
    type: "warning",
    message: "Le département Marketing est proche du dépassement (94% du budget MTD consommés en 15 jours).",
    action: "Ajuster l'enveloppe"
  },
  {
    type: "delay",
    message: "Délai de transit critique détecté chez DHL Express (hausse moyenne de +1.2 jours constatée sur la semaine).",
    action: "Voir l'alternative FedEx"
  },
  {
    type: "optimization",
    message: "Contrat de maintenance Logiciel Oracle à renouveler dans 45 jours. Renégociation conseillée (économies estimées de 15%).",
    action: "Lancer un appel d'offre"
  }
];

export default function ProcurementDashboard() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOrders = RECENT_PURCHASE_ORDERS.filter(order => 
    order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700 bg-slate-50/50 dark:bg-slate-900/10 min-h-screen">
      
      {/* 1. HEADER & CONTROLES */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
            Tableau de Bord <span className="text-indigo-600">Approvisionnements</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Vue consolidée des engagements de dépenses, budgets et statuts fournisseurs.
          </p>
        </div>

        {/* Bouton de filtrage rapide de date */}
        <div className="flex bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm items-center h-10">
          <div className="flex items-center px-3 text-indigo-600 border-r border-slate-100 dark:border-slate-800 mr-1">
            <Calendar size={14} />
          </div>
          <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 px-3 italic">
            Novembre 2024
          </span>
        </div>
      </div>

      {/* 2. GRILLE DES 8 CARTES DE KPI DENSES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {KPI_METRICS.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={index} 
              className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block leading-tight">
                    {kpi.label}
                  </span>
                  <Icon size={12} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
                  {kpi.value}
                </h3>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-900 flex flex-col gap-1">
                {kpi.progress ? (
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`${kpi.progress.color} h-full transition-all`} 
                      style={{ width: `${kpi.progress.current}%` }}
                    />
                  </div>
                ) : null}
                
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-400 dark:text-slate-500 font-medium truncate">
                    {kpi.subtext}
                  </span>
                  {kpi.trend && (
                    <span className={`font-bold shrink-0 ${
                      kpi.trend.type === "positive" ? "text-emerald-500" :
                      kpi.trend.type === "negative" ? "text-rose-500" : "text-amber-500"
                    }`}>
                      {kpi.trend.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. GRILLE D'ANALYTIQUES PRINCIPALE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Graphique de Tendances : Évolution mensuelle (Prand 8/12) */}
        <div className="xl:col-span-8 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Évolution des Dépenses de Fonctionnement (12 mois)
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 uppercase">
              Flux consolidé ($K)
            </span>
          </div>
          
          {/* Simulation Graphique Line Chart en SVG */}
          <div className="h-64 w-full flex items-end">
            <svg viewBox="0 0 800 240" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2"/>
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" className="dark:stroke-slate-900" />
              <line x1="0" y1="100" x2="800" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" className="dark:stroke-slate-900" />
              <line x1="0" y1="160" x2="800" y2="160" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" className="dark:stroke-slate-900" />
              <line x1="0" y1="220" x2="800" y2="220" stroke="#e2e8f0" strokeWidth="1.5" className="dark:stroke-slate-800" />

              {/* Area path */}
              <path 
                d="M 10 220 L 10 180 L 80 160 L 150 190 L 220 130 L 290 145 L 360 90 L 430 110 L 500 80 L 570 75 L 640 115 L 710 60 L 780 45 L 780 220 Z" 
                fill="url(#chart-grad)"
              />
              {/* Line path */}
              <path 
                d="M 10 180 L 80 160 L 150 190 L 220 130 L 290 145 L 360 90 L 430 110 L 500 80 L 570 75 L 640 115 L 710 60 L 780 45" 
                fill="none" 
                stroke="#4f46e5" 
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {[
                {x: 10, y: 180, label: "Jan"}, {x: 80, y: 160, label: "Fév"}, {x: 150, y: 190, label: "Mar"},
                {x: 220, y: 130, label: "Avr"}, {x: 290, y: 145, label: "Mai"}, {x: 360, y: 90, label: "Juin"},
                {x: 430, y: 110, label: "Juil"}, {x: 500, y: 80, label: "Aoû"}, {x: 570, y: 75, label: "Sep"},
                {x: 640, y: 115, label: "Oct"}, {x: 710, y: 60, label: "Nov"}, {x: 780, y: 45, label: "Déc"}
              ].map((pt, i) => (
                <g key={i} className="group cursor-pointer">
                  <circle cx={pt.x} cy={pt.y} r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" />
                  <text x={pt.x} y="235" textAnchor="middle" className="text-[10px] fill-slate-400 font-bold tracking-tight">{pt.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Répartition par Catégories : Barre de progression (Prand 4/12)
        <div className="xl:col-span-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
              Dépenses par Familles de Produit MTD
            </h2>
            <div className="space-y-4">
              {[
                { cat: "Infrastructure Cloud", val: "$485,000", pct: 39, color: "bg-indigo-600" },
                { cat: "Prestations d'audit & Conseil", val: "$320,000", pct: 26, color: "bg-blue-500" },
                { cat: "Campagnes Marketing", val: "$275,000", pct: 22, color: "bg-amber-500" },
                { cat: "Équipements & Matériel", val: "$110,000", pct: 9, color: "bg-emerald-500" },
                { cat: "Licences & Fournitures", val: "$55,800", pct: 4, color: "bg-slate-400" },
              ].map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{item.cat}</span>
                    <span className="font-black text-slate-950 dark:text-slate-100 italic">{item.val}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center text-[10px] text-slate-400 font-semibold">
            <span>Total consolidé : $1,245,800</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-black cursor-pointer hover:underline">Voir le grand livre</span>
          </div>
        </div> */}
      </div>

      {/* 4. ACTIONS RAPIDES & FLUX WORKFLOWS */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* IA-INSIGHT PANEL (Prand 5/12) */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Anomalies & Opportunités d'Économie
              </h2>
            </div>
            
            <div className="space-y-3">
              {AI_INSIGHTS.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border text-xs ${
                    insight.type === "warning" ? "bg-rose-50/50 border-rose-100 text-rose-950 dark:bg-rose-950/10 dark:border-rose-900 dark:text-rose-200" :
                    insight.type === "delay" ? "bg-amber-50/50 border-amber-100 text-amber-950 dark:bg-amber-950/10 dark:border-amber-900 dark:text-amber-200" :
                    "bg-indigo-50/50 border-indigo-100 text-indigo-950 dark:bg-indigo-950/10 dark:border-indigo-900 dark:text-indigo-200"
                  }`}
                >
                  <p className="font-semibold leading-relaxed mb-2">
                    {insight.message}
                  </p>
                  <button className="text-[10px] font-black uppercase italic tracking-wider underline hover:text-opacity-80">
                    {insight.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center text-[10px] text-slate-400">
            <span>Données d'analyse calculées en continu</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">Configurer les alertes</span>
          </div>
        </div>

        {/* WORKFLOWS ACTIVITÉ RECENTE (Prand 7/12) */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
            Demandes d'achats récentes (Workflows)
          </h2>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-900">
            {RECENT_WORKFLOWS.map((wf, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-1 rounded-full">
                    {wf.status === "approved" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                     wf.status === "rejected" ? <XCircle className="w-4 h-4 text-rose-500" /> :
                     <Clock className="w-4 h-4 text-amber-500 animate-pulse" />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-slate-100">{wf.title}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      Réf: {wf.id} • Dpt: {wf.department} • Demandeur : {wf.user}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-black text-slate-950 dark:text-slate-100 italic block">{wf.amount}</span>
                  <span className="text-[9px] text-slate-400 font-bold block">{wf.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. TABLEAU D'ENGAGEMENT : BONS DE COMMANDES RECENTES (PO) */}
      <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Header du Tableau */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50 dark:bg-slate-950">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Bons de commande récents (Purchase Orders)
            </h2>
            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
              Historique des contrats signés et validés par le comité financier.
            </p>
          </div>

          {/* Input de recherche à la volée */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Fournisseur, PO, Département..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-400 text-slate-700 dark:text-slate-300"
            />
          </div>
        </div>

        {/* Structure HTML de la table ERP d'achats */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse min-w-200">
            <thead className="bg-slate-900 text-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">ID PO</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Fournisseur</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Département</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Montant</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700 text-center">Status</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest border-r border-slate-700">Créé Le</th>
                <th className="px-4 py-3 font-bold uppercase tracking-widest">Livraison Prévue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* ID PO */}
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-black text-slate-900 dark:text-slate-100 italic">
                      {order.id}
                    </td>
                    
                    {/* Fournisseur */}
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-bold text-slate-700 dark:text-slate-300">
                      {order.supplier}
                    </td>

                    {/* Département */}
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-400 font-medium">
                      {order.department}
                    </td>

                    {/* Montant */}
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-black text-slate-900 dark:text-slate-100 italic">
                      ${order.amount.toLocaleString()}
                    </td>

                    {/* Badge de Status */}
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase italic ${
                        order.status === "Approved" ? "bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/10 dark:border-indigo-900 dark:text-indigo-300" :
                        order.status === "Delivered" ? "bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-950/10 dark:border-emerald-900 dark:text-emerald-300" :
                        "bg-amber-50 border border-amber-100 text-amber-700 dark:bg-amber-950/10 dark:border-amber-900 dark:text-amber-300"
                      }`}>
                        {order.status}
                      </span>
                    </td>

                    {/* Créé Le */}
                    <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-slate-400 dark:text-slate-500 font-semibold">
                      {order.createdDate}
                    </td>

                    {/* Date Livraison Attendue */}
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400 font-medium">
                      {order.expectedDelivery}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic bg-slate-50/20 dark:bg-slate-900/10 text-xs">
                    Aucun bon de commande ne correspond à votre recherche.
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