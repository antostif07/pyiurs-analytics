import { getBeautyDashboardStats } from "./data-fetcher";
import { 
  ShoppingBag, 
  AlertTriangle, 
  TrendingUp, 
  PackageSearch,
  ArrowUpRight,
  MoreHorizontal
} from "lucide-react";

export default async function BeautyDashboard() {
  const stats = await getBeautyDashboardStats();

  return (
    <div className="space-y-8">
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vue Globale Beauty</h1>
        <p className="text-gray-500 text-sm">Données en temps réel extraites d'Odoo</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Produits Actifs" 
          value={stats.totalQuantity} 
          icon={<ShoppingBag className="text-blue-600" size={20} />}
          description="Total segment Beauty"
        />
        <StatCard 
          title="Chiffre d'Affaires" 
          value={`${stats.currentMonthRevenue.toLocaleString()} $`} 
          icon={<TrendingUp className="text-green-600" size={20} />}
          trend="+12%" 
          description="Mois en cours"
        />
        <StatCard 
          title="Alertes Stock" 
          value={stats.lowStockCount} 
          icon={<AlertTriangle className="text-amber-600" size={20} />}
          description="Moins de 10 unités"
          status={stats.lowStockCount > 0 ? "warning" : "success"}
        />
        <StatCard 
          title="Valeur Stock" 
          value="Calcul..." 
          icon={<PackageSearch className="text-purple-600" size={20} />}
          description="Estimation Odoo"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LISTE PRODUITS RÉCENTS */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Dernières Mises à Jour</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">Voir tout</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-6 py-4">Produit</th>
                  <th className="px-6 py-4">Ref</th>
                  <th className="px-6 py-4">Prix</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentProducts.map((product: any) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-gray-500">{product.default_code || '-'}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{product.lst_price} $</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${
                        product.qty_available > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.qty_available} en stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-400">
                      <MoreHorizontal size={18} className="cursor-pointer" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION DROITE : QUICK ACTIONS / INSIGHTS */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl shadow-gray-200">
            <h3 className="font-bold mb-4">Actions Rapides</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <button className="flex items-center justify-between p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span>Créer un produit Beauty</span>
                <ArrowUpRight size={16} />
              </button>
              <button className="flex items-center justify-between p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span>Imprimer Inventaire</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
          
          <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100">
            <h3 className="font-bold text-pink-900 mb-2 text-sm">Conseil Business</h3>
            <p className="text-pink-800 text-xs leading-relaxed">
              Le stock de produits "Beauty" a diminué de 15% par rapport à la semaine dernière. 
              Prévoyez un réapprovisionnement pour les références en alerte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// COMPOSANT INTERNE : CARTE STAT
function StatCard({ title, value, icon, description, trend, status }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        {trend && (
          <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <h4 className={`text-2xl font-bold mt-1 ${status === 'warning' ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </h4>
        <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider">{description}</p>
      </div>
    </div>
  );
}