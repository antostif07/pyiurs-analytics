import { CalendarClock, PieChart } from "lucide-react";
import { getPosConfigs, getSalesTrends } from "../actions/analytics";
import CategoryChart from "../components/CategoryChart";
import SalesHeatmap from "../components/SalesHeatmap";
import ShopFilter from "../components/ShopFilter";

export const metadata = { title: "Tendances & Catégories • Pyiurs Femme" };

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ period?: string; store?: string }> }) {
  const params = await searchParams;
  const period = (params.period as '7d'|'30d'|'90d') || '30d';
  const storeId = params.store ? params.store : undefined;
  
  const [trendData, shops] = await Promise.all([
    getSalesTrends(period, storeId),
    getPosConfigs()
  ]);
  
  const { heatmap, categories } = await getSalesTrends(period);

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tendances de Vente</h1>
          <p className="text-slate-500 mt-1">Analysez l'affluence en boutique et la performance des catégories.</p>
        </div>
        
        <div className="flex gap-3">
            {/* 1. Nouveau Filtre Magasin */}
            <ShopFilter shops={shops} />

            {/* 2. Filtre Période */}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm text-sm h-fit">
                {/* On garde le paramètre store dans l'URL quand on change de période */}
                {['7d', '30d', '90d'].map((p) => (
                    <a 
                        key={p}
                        href={`?period=${p}${storeId ? `&store=${storeId}` : ''}`} 
                        className={`px-4 py-1.5 rounded transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        {p.replace('d', 'j')}
                    </a>
                ))}
            </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. HEATMAP (Affluence) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><CalendarClock className="w-5 h-5"/></div>
            <div>
               <h2 className="text-lg font-bold text-slate-900">Affluence Hebdomadaire</h2>
               <p className="text-xs text-slate-400">
                 {storeId 
                    ? `Données pour : ${shops.find(s => s.id === storeId)?.name}` 
                    : "Données consolidées (Tous les magasins)"}
               </p>
            </div>
          </div>
          <SalesHeatmap data={heatmap} />
        </div>

        {/* 2. CATEGORIES (Performance) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><PieChart className="w-5 h-5"/></div>
            <div>
               <h2 className="text-lg font-bold text-slate-900">Répartition par Catégorie</h2>
               <p className="text-xs text-slate-400">Chiffre d'affaires par famille POS.</p>
            </div>
          </div>
          
          <CategoryChart data={categories} />
          
          {/* Mini Table Summary */}
          <div className="mt-6 border-t border-slate-100 pt-4">
             <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-2 px-2">
                <span>Catégorie</span>
                <span>Part du CA</span>
             </div>
             <div className="space-y-1">
                {categories.slice(0, 5).map(cat => {
                   const totalRev = categories.reduce((a, b) => a + b.revenue, 0);
                   const pct = totalRev > 0 ? Math.round((cat.revenue / totalRev) * 100) : 0;
                   return (
                     <div key={cat.name} className="flex justify-between text-sm px-2 py-1 hover:bg-slate-50 rounded">
                        <span className="font-medium text-slate-700">{cat.name}</span>
                        <span className="font-bold text-slate-900">{pct}%</span>
                     </div>
                   );
                })}
             </div>
          </div>
        </div>

      </div>
    </main>
  );
}