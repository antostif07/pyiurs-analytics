import { getInventoryIntelligence } from "../services";

// --- CONFIGURATION ---
export const revalidate = 300; // Mise à jour toutes les 5 minutes

// --- HELPERS VISUELS ---
const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    STAR: "bg-emerald-100 text-emerald-800 border-emerald-200",
    HOT: "bg-blue-100 text-blue-800 border-blue-200",
    HEALTHY: "bg-gray-100 text-gray-800 border-gray-200",
    SLOW: "bg-orange-100 text-orange-800 border-orange-200",
    DEAD: "bg-red-100 text-red-800 border-red-200",
  };
  
  const labels: Record<string, string> = {
    STAR: "★ Star",
    HOT: "⚡ Tendance",
    HEALTHY: "✔ Sain",
    SLOW: "⚠️ Lent",
    DEAD: "💀 Dormant",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.HEALTHY}`}>
      {labels[status] || status}
    </span>
  );
};

const getProgressBarColor = (value: number) => {
  if (value >= 70) return "bg-emerald-500";
  if (value >= 40) return "bg-blue-500";
  if (value >= 25) return "bg-gray-400";
  if (value >= 10) return "bg-orange-400";
  return "bg-red-500";
};

// --- COMPOSANT PRINCIPAL ---
export default async function StockPerformancePage() {
  const inventoryData = await getInventoryIntelligence();

  return (
    <div className="p-8 max-w-400 mx-auto space-y-8">
      
      {/* HEADER: Titre et Contexte */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Performance Stock & Merchandising</h1>
          <p className="text-gray-500 mt-1">
            Analyse des collections par HS Code sur les 30 derniers jours.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center min-w-30">
            <div className="text-xs text-gray-500 uppercase font-semibold">Référence</div>
            <div className="text-2xl font-bold text-gray-900">{inventoryData.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border shadow-sm text-center min-w-30">
            <div className="text-xs text-gray-500 uppercase font-semibold">Taux Global</div>
            {/* Calcul d'un taux moyen simple pour l'exemple */}
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(inventoryData.reduce((acc, i) => acc + i.sellThrough, 0) / (inventoryData.length || 1))}%
            </div>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Modèle</th>
                <th className="px-6 py-4 font-semibold text-center w-60">Statut</th>
                <th className="px-6 py-4 font-semibold text-right">Stock Actuel</th>
                <th className="px-6 py-4 font-semibold text-right">Ventes (30j)</th>
                <th className="px-6 py-4 font-semibold w-1/4">Taux d'écoulement (Sell-Through)</th>
                <th className="px-6 py-4 font-semibold text-right">CA Généré</th>
                <th className="px-6 py-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inventoryData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  
                  {/* Nom du Modèle */}
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{item.displayName}</div>
                    <div className="text-xs text-gray-400">{item.variantsCount} variantes (tailles/couleurs)</div>
                  </td>

                  {/* Statut (Badge) */}
                  <td className="px-6 py-4 text-center">
                    {getStatusBadge(item.status)}
                  </td>

                  {/* Stock */}
                  <td className="px-6 py-4 text-right font-mono text-gray-700">
                    {item.stockCount}
                  </td>

                  {/* Ventes */}
                  <td className="px-6 py-4 text-right font-mono font-medium text-gray-900">
                    {item.soldCount30d}
                  </td>

                  {/* Barre de progression Sell-Through */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressBarColor(item.sellThrough)}`} 
                          style={{ width: `${Math.min(item.sellThrough, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold w-10 text-right">{item.sellThrough}%</span>
                    </div>
                  </td>

                  {/* CA Généré */}
                  <td className="px-6 py-4 text-right font-medium">
                    {item.revenue30d.toLocaleString()} <span className="text-xs text-gray-400">$</span>
                  </td>

                  {/* Actions (Boutons fictifs pour le moment) */}
                  <td className="px-6 py-4 text-center">
                    {item.status === 'DEAD' || item.status === 'SLOW' ? (
                      <button className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 transition">
                        Promouvoir
                      </button>
                    ) : item.status === 'STAR' ? (
                      <button className="text-xs border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition">
                        Commander
                      </button>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                </tr>
              ))}

              {inventoryData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Aucune donnée disponible. Vérifiez la connexion Odoo ou les produits.
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