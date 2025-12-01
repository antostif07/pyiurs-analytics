import { getDashboardStats, getTopProducts, getWeeklyStats, getDormantStock } from "../../actions";

const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(val);

export default async function PrintReportPage() {
  const [kpi, products, marketing, dormant] = await Promise.all([
    getDashboardStats(),
    getTopProducts(),
    getWeeklyStats(),
    getDormantStock()
  ]);

  const today = new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' });

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="border-b border-black pb-4 mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-4xl font-bold uppercase tracking-tighter">Rapport Hebdo.</h1>
            <p className="text-gray-500 mt-2">{today}</p>
        </div>
        <div className="text-right">
            <div className="text-xs text-gray-400 uppercase">Chiffre d'affaires (Semaine)</div>
            <div className="text-3xl font-bold">{formatCurrency(kpi.weeklyRevenue)}</div>
        </div>
      </div>

      {/* 1. VENTES */}
      <section>
        <h2 className="text-xl font-bold border-b border-gray-200 pb-2 mb-4 uppercase text-gray-800">1. Top Ventes</h2>
        <div className="grid grid-cols-2 gap-8">
            <div>
                <h3 className="font-bold text-sm mb-2 text-gray-600">MODE</h3>
                <ul className="space-y-1 text-sm">
                    {products.fashion.slice(0, 5).map((p: any) => (
                        <li key={p.name} className="flex justify-between">
                            <span>{p.name}</span>
                            <span className="font-bold">{p.qty} pces</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <h3 className="font-bold text-sm mb-2 text-gray-600">BEAUTY</h3>
                <ul className="space-y-1 text-sm">
                    {products.beauty.slice(0, 5).map((p: any) => (
                        <li key={p.name} className="flex justify-between">
                            <span>{p.name}</span>
                            <span className="font-bold">{p.qty} pces</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
      </section>

      {/* 2. MARKETING */}
      <section>
        <h2 className="text-xl font-bold border-b border-gray-200 pb-2 mb-4 uppercase text-gray-800">2. Marketing</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 p-4 rounded">
                <div className="text-2xl font-bold">{marketing.tiktok_views}</div>
                <div className="text-xs uppercase text-gray-500">Vues TikTok</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
                <div className="text-2xl font-bold">{marketing.whatsapp_views}</div>
                <div className="text-xs uppercase text-gray-500">Vues Statut</div>
            </div>
            <div className="bg-gray-50 p-4 rounded">
                <div className="text-2xl font-bold">{marketing.fb_reach}</div>
                <div className="text-xs uppercase text-gray-500">Portée FB</div>
            </div>
        </div>
      </section>

      {/* 3. ALERTES STOCK */}
      <section>
        <h2 className="text-xl font-bold border-b border-gray-200 pb-2 mb-4 uppercase text-red-600">3. Alertes Stock</h2>
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 uppercase text-xs">
                <tr>
                    <th className="p-2">Produit Dormant (+60j)</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2">Action</th>
                </tr>
            </thead>
            <tbody>
                {dormant.slice(0, 8).map((p: any) => ( // On en montre que 8 pour que ça tienne sur 1 page
                    <tr key={p.id} className="border-b border-gray-50">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2">{p.qty_available}</td>
                        <td className="p-2 font-bold text-red-600">-{p.suggested_discount}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
        {dormant.length > 8 && <p className="text-xs text-gray-400 mt-2 italic">...et {dormant.length - 8} autres produits.</p>}
      </section>

      {/* FOOTER */}
      <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
        Généré automatiquement par le Module Pilotage Interne.
      </div>
    </div>
  );
}