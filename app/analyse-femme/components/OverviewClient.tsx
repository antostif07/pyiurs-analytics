"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  TrendingUp, ShoppingBag, Package, AlertTriangle, CreditCard, ArrowRight
} from "lucide-react";
import TargetEditor from "./TargetEditor";
// import { 
//   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
// } from "recharts";

type OverviewProps = {
  data: {
    kpi: { revenue: number; unitsSold: number; avgUnitVal: number };
    topProducts: any[];
    target: { current: number; goal: number; percent: number };
  } | null;
  currentRange: string;
};

// Données simulées pour le graphique (en attendant qu'on mette à jour le backend pour renvoyer l'historique)
const MOCK_CHART_DATA = [
  { name: "Lun", value: 1200 }, { name: "Mar", value: 900 },
  { name: "Mer", value: 1600 }, { name: "Jeu", value: 1400 },
  { name: "Ven", value: 2100 }, { name: "Sam", value: 3200 },
  { name: "Dim", value: 2800 },
];

export default function OverviewClient({ data, currentRange }: OverviewProps) {
  const router = useRouter();

  if (!data) return <div className="p-8 text-slate-400">Chargement des données...</div>;

  // Calculer les alertes basées sur les Top Produits reçus
  const stockAlerts = data.topProducts.filter((p: any) => p.stock < 5);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const handleRangeChange = (range: string) => {
    router.push(`/analyse-femme?range=${range}`, { scroll: false });
  };

  return (
    <div className="font-sans pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vue d'ensemble • Femme</h1>
          <p className="text-slate-500 mt-1">Performance boutique & disponibilité stock.</p>
        </div>
        <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {["7j", "30j", "12m"].map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                currentRange === range 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        
        {/* LIGNE 1 : KPI Cards (Ajout du Panier Moyen) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CA */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm font-medium text-slate-500">Chiffre d'Affaires</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">
                    {data.kpi.revenue.toLocaleString('fr-FR')} $
                  </h3>
               </div>
               <div className="p-2 bg-indigo-50 rounded-lg"><TrendingUp className="w-5 h-5 text-indigo-600"/></div>
            </div>
          </motion.div>

          {/* Volume */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm font-medium text-slate-500">Unités Vendues</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{data.kpi.unitsSold}</h3>
               </div>
               <div className="p-2 bg-emerald-50 rounded-lg"><ShoppingBag className="w-5 h-5 text-emerald-600"/></div>
            </div>
          </motion.div>

          {/* Panier Moyen (AJOUTÉ) */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <div className="flex justify-between items-start">
               <div>
                  <p className="text-sm font-medium text-slate-500">Panier Moyen (Est.)</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-2">{data.kpi.avgUnitVal} $</h3>
               </div>
               <div className="p-2 bg-blue-50 rounded-lg"><CreditCard className="w-5 h-5 text-blue-600"/></div>
            </div>
          </motion.div>

          {/* Target Widget */}
          <motion.div variants={itemVariants} className="bg-indigo-900 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2">
                  <p className="text-indigo-200 text-sm font-medium">Objectif Mensuel</p>
                  <TargetEditor 
                      currentTarget={data.target.goal} 
                      currentMonth={new Date().getMonth() + 1}
                      currentYear={new Date().getFullYear()}
                  />

                </div>
                <span className="text-lg font-bold">{data.target.percent}%</span>
              </div>
              <div className="w-full bg-indigo-800 rounded-full h-2 mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.target.percent}%` }}
                  transition={{ duration: 1 }}
                  className="bg-white h-2 rounded-full" 
                />
              </div>
            </div>
            <p className="text-xs text-indigo-300 mt-3 text-right">
               {Math.round(data.target.current/1000)}k / {Math.round(data.target.goal/1000)}k $
            </p>
          </motion.div>
        </div>

        {/* LIGNE 2 : Graphique & Alertes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Top 5 Modèles (Volume)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100 uppercase tracking-wider">
                    <th className="py-3 font-medium pl-2">Modèle / Réf</th>
                    <th className="py-3 font-medium text-right">Ventes</th>
                    <th className="py-3 font-medium text-right">CA Total</th>
                    <th className="py-3 font-medium text-right pr-2">Stock Global</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {data.topProducts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-medium text-slate-800 flex items-center pl-2">
                        <div className="w-8 h-8 rounded bg-slate-100 mr-3 flex items-center justify-center text-slate-400">
                            <Package className="w-4 h-4"/>
                        </div>
                        <div>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-xs text-slate-400 font-normal">{p.id}</div>
                        </div>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-700">{p.sold}</td>
                        <td className="py-3 text-right text-slate-500">{p.revenue.toLocaleString()} $</td>
                        <td className="py-3 text-right pr-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            p.stock < 5 ? 'bg-red-100 text-red-800' : 
                            p.stock < 20 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-emerald-100 text-emerald-800'
                        }`}>
                            {p.stock}
                        </span>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            </motion.div>
          {/* Graphique (Placeholders activés) */}
          {/* <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Tendance des Ventes</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_CHART_DATA}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 12}} />
                  <Tooltip contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                  <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div> */}

          {/* Alertes Stock (Dynamique via Top Products) */}
          <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-slate-800">Alertes Stock</h3>
               {stockAlerts.length > 0 && (
                 <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{stockAlerts.length}</span>
               )}
            </div>
            
            <div className="space-y-3">
              {stockAlerts.length === 0 ? (
                <div className="text-sm text-slate-400 italic py-4">Aucune rupture sur les best-sellers.</div>
              ) : (
                stockAlerts.map((p: any) => (
                  <div key={p.id} className="flex items-start p-3 bg-rose-50 rounded-lg border border-rose-100">
                    <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-rose-600 font-medium mt-1">
                        Reste seulement {p.stock} pièces
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              <button className="w-full mt-2 py-2 text-sm text-slate-500 hover:text-indigo-600 flex items-center justify-center transition-colors">
                Voir tout le stock <ArrowRight className="w-4 h-4 ml-1"/>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}