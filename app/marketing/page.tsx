import { ShoppingBag, Sparkles, Shirt } from 'lucide-react'; // Ajout d'icones
import { getDashboardStats, getTodayTasks, getTopProducts } from './actions';
import StatCard from './components/StatCard';
import TopProductsList from './components/TopProductsList';
import AgendaWidget from './components/AgendaWidget';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);
};

export default async function DashboardPage() {
  const [stats, topProducts, tasks] = await Promise.all([
    getDashboardStats(),
    getTopProducts(),
    getTodayTasks()
  ]);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-500">Vue d'ensemble en temps réel (Source: Odoo)</p>
      </div>

      {/* --- SECTION KPI --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="CA du Jour" value={formatCurrency(stats.dailyRevenue)} subValue={`${stats.orderCount} commandes`} iconName="money" color="blue" delay={0.1} />
        <StatCard title="CA de la Semaine" value={formatCurrency(stats.weeklyRevenue)} subValue="Total cumulé" iconName="trend" color="green" delay={0.2} />
        <StatCard title="Stock Faible" value={stats.lowStockCount} subValue="Produits < 3 pièces" iconName="alert" color="red" delay={0.3} />
        <StatCard title="Stock Dormant" value={stats.dormantStockCount} subValue="+60 jours sans mouvement" iconName="archive" color="orange" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* --- MODULE TOP VENTES (Prend 2 colonnes sur grand écran) --- */}
        <div className="xl:col-span-2 space-y-6">
            
            {/* BLOC 1 : MODE (Femme/Enfant) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Shirt size={20} className="text-blue-600"/> Top Ventes : Mode (Femme/Enfant)
                </h2>
              </div>
              <TopProductsList products={topProducts.fashion} />
            </div>

            {/* BLOC 2 : BEAUTY */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles size={20} className="text-pink-500"/> Top Ventes : Beauty
                </h2>
              </div>
              <TopProductsList products={topProducts.beauty} />
            </div>

        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[600px] xl:sticky xl:top-6">
          {/* On passe les tâches récupérées au composant Client */}
          <AgendaWidget initialTasks={tasks} />
        </div>

      </div>
    </div>
  );
}