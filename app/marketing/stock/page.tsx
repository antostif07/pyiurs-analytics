import { Package, AlertTriangle, ArrowDownRight, CalendarCheck } from 'lucide-react';
import clsx from 'clsx';
import { getDormantStock, getRecentArrivals } from '../actions';

const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val);

export default async function StockPage() {
  const [dormant, arrivals] = await Promise.all([
    getDormantStock(),
    getRecentArrivals()
  ]);

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
             <Package className="text-indigo-600" size={32} /> Gestion du Stock
        </h1>
        <p className="text-gray-500 mt-1">Nouveautés et Liquidation.</p>
      </div>

      <div className="space-y-8">
        
        {/* SECTION 1 : STOCK DORMANT (ALERTE) */}
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-6 border-b border-red-50 bg-red-50/30 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-red-700 flex items-center gap-2">
                        <AlertTriangle size={20}/> Stock Dormant (+60 jours)
                    </h2>
                    <p className="text-xs text-red-500">Ces produits immobilisent de la trésorerie. Appliquez les promos suggérées.</p>
                </div>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
                    {dormant.length} articles
                </span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                        <tr>
                            <th className="p-4">Produit / Ref</th>
                            <th className="p-4">Stock</th>
                            <th className="p-4">Âge</th>
                            <th className="p-4">Prix Actuel</th>
                            <th className="p-4 text-green-600">Promo Suggérée</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {dormant.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-gray-900">{p.name.split('[')[0]}</div>
                                    <div className="text-xs text-gray-400">REF: {p.hs_code || 'N/A'}</div>
                                </td>
                                <td className="p-4 font-medium">{p.qty_available}</td>
                                <td className="p-4">{p.age_months} mois</td>
                                <td className="p-4 line-through text-gray-400">{formatCurrency(p.list_price)}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">-{p.suggested_discount}%</span>
                                        <span className="font-bold text-green-700">{formatCurrency(p.new_price)}</span>
                                        <ArrowDownRight size={14} className="text-green-600"/>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {dormant.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Aucun stock dormant. Bravo !</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* SECTION 2 : DERNIERS ARRIVAGES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <CalendarCheck size={20} className="text-indigo-600"/> Derniers Arrivages (30j)
                </h2>
            </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                        <tr>
                            <th className="p-4">Date</th>
                            <th className="p-4">Produit</th>
                            <th className="p-4">Quantité Reçue (Dispo)</th>
                            <th className="p-4">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {arrivals.map((p: any) => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-500">{new Date(p.create_date).toLocaleDateString()}</td>
                                <td className="p-4 font-medium text-gray-900">{p.name}</td>
                                <td className="p-4">{p.qty_available}</td>
                                <td className="p-4">
                                    <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold">Nouveau</span>
                                </td>
                            </tr>
                        ))}
                         {arrivals.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">Aucun arrivage récent.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}