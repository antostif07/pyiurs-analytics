import { getBeautyDashboardStats, getBeautySmartAlerts } from "./data-fetcher";
import { 
  AlertTriangle, TrendingUp, PackageSearch, 
  Clock, ShoppingCart, CheckCircle2, 
  ArrowRight, BrainCircuit, Timer,
  ShoppingBag
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import ProductImage from "../marketing/components/ProductImage";
import AlertRow from "./components/AlertRow";

export default async function BeautyDashboard() {
  const stats = await getBeautyDashboardStats();
  const alerts = await getBeautySmartAlerts();

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter italic uppercase">
            Nerve Center <span className="text-rose-600">Beauty</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium">Analyse prédictive et gestion des flux</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 animate-pulse">
            Live Sync Odoo & AI
        </Badge>
      </div>

      {/* KPI CARDS : FOCUS OPÉRATIONNEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Stock Total" 
          value={stats.totalQuantity} 
          icon={<ShoppingBag size={20} className="text-blue-600" />}
          description="Unités physiques en rayon"
          color="bg-blue-50"
        />
        <StatCard 
          title="Ventes (Mois)" 
          value={`${stats.currentMonthRevenue.toLocaleString()} $`} 
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          description="Chiffre d'affaires Beauty"
          color="bg-emerald-50"
        />
        <StatCard 
          title="Risques Rupture" 
          value={alerts.filter(a => a.status === 'low_stock').length} 
          icon={<BrainCircuit size={20} className="text-rose-600" />}
          description="Identifiés par l'IA"
          status="warning"
          color="bg-rose-50"
        />
        <StatCard 
          title="En Commande" 
          value={alerts.filter(a => a.status === 'reordered').length} 
          icon={<Timer size={20} className="text-amber-600" />}
          description="Réappro en cours"
          color="bg-amber-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SECTION GAUCHE : TABLEAU DE BORD IA */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                <AlertTriangle className="text-rose-600" size={18} /> Alertes prioritaires & Prédictions
            </h3>
          </div>

          <Card className="border-none shadow-sm rounded-xl bg-white overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th></th>
                  <th className="px-6 py-4">Produit (Modèle HS)</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-center">Rupture Prévue</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alerts.length > 0 ? alerts.map((item: any) => (
                  <AlertRow key={item.hs_code} item={item} />
                )) : (
                    <tr>
                        <td colSpan={4} className="py-20 text-center">
                            <CheckCircle2 className="mx-auto text-emerald-200 mb-2" size={40} />
                            <p className="text-sm font-bold text-gray-400">Aucune alerte critique détectée</p>
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        {/* SECTION DROITE : RECOMMANDATIONS IA */}
        <div className="lg:col-span-4 space-y-6">
            <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm px-2">Exemple: Focus Stratégique</h3>
            
            <Card className="p-6 border-none shadow-xl rounded-xl bg-gray-900 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="bg-rose-500 w-10 h-10 rounded-2xl flex items-center justify-center mb-4">
                        <BrainCircuit size={20} />
                    </div>
                    <h4 className="text-lg font-bold mb-2 italic">Conseil Supply Chain</h4>
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                        "L'IA a détecté une accélération de 15% sur les produits solaires. Pensez à avancer les commandes de Mars pour éviter l'engorgement fournisseur."
                    </p>
                    <button className="mt-6 text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2 hover:text-rose-300">
                        Consulter tous les rapports <ArrowRight size={12} />
                    </button>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                    <TrendingUp size={160} />
                </div>
            </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, status, color }: any) {
  return (
    <Card className="p-6 border-none shadow-sm rounded-4xl bg-white group hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-3 rounded-2xl ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <h4 className={`text-3xl font-black tracking-tighter ${status === 'warning' ? 'text-rose-600' : 'text-gray-900'}`}>
          {value}
        </h4>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">{title}</p>
        <p className="text-[9px] text-gray-300 font-bold uppercase mt-1 italic leading-none">{description}</p>
      </div>
    </Card>
  );
}

function QuickActionButton({ label, icon }: any) {
    return (
        <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-colors group">
            <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">{label}</span>
            <div className="text-gray-300 group-hover:text-rose-500">{icon}</div>
        </button>
    )
}