import { Tag, TrendingUp, StopCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { getActivePromosPerformance, stopPromo } from '../actions';

const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

export default async function PromosPage() {
  const activePromos = await getActivePromosPerformance();

  return (
    <div className="min-h-screen">
      
      {/* HEADER AVEC BOUTON ACTION */}
      <div className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Tag className="text-red-600" size={32} /> Campagnes Promo
            </h1>
            <p className="text-gray-500 mt-1">Suivi des performances et liquidations.</p>
        </div>
        
        <Link href="/marketing/promos/create">
            <button className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-shadow shadow-lg shadow-gray-200">
                <Plus size={20} /> Nouvelle Campagne
            </button>
        </Link>
      </div>

      {/* LISTE DES PROMOS ACTIVES */}
      {activePromos.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
                <Tag size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Aucune campagne en cours</h3>
            <p className="text-gray-500 mt-2 mb-6 max-w-md">
                Le stock dormant s'accumule ? Lancez une campagne ciblée pour libérer de la trésorerie.
            </p>
            <Link href="/marketing/promos/create">
                <button className="text-blue-600 font-bold hover:underline">Créer ma première campagne →</button>
            </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
             <div className="p-6 border-b border-blue-50 bg-blue-50/30 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20}/> 
                <h2 className="text-lg font-bold text-blue-900">Performances en Temps Réel</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-medium">
                        <tr>
                            <th className="p-4">Campagne</th>
                            <th className="p-4 text-center">Offre</th>
                            <th className="p-4 text-center">Écoulement</th>
                            <th className="p-4 text-right">CA Généré</th>
                            <th className="p-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {activePromos.map((promo: any) => (
                            <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4">
                                    <Link href={`promos/${promo.id}`}>
                                        <div className="font-bold text-gray-900 text-lg">{promo.product_name}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {promo.hs_codes?.map((code: string) => (
                                                <span key={code} className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{code}</span>
                                            ))}
                                        </div>
                                    </Link>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">-{promo.discount_percent}%</span>
                                </td>
                                <td className="p-4 w-1/3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${promo.sell_through_rate}%` }}></div>
                                        </div>
                                        <div className="text-right min-w-[60px]">
                                            <span className="block text-sm font-bold text-gray-900">{promo.sell_through_rate}%</span>
                                            <span className="block text-[10px] text-gray-400">{promo.sold_qty} / {promo.initial_stock}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-right font-bold text-gray-900 text-lg">
                                    {formatCurrency(promo.revenue_generated)}
                                </td>
                                <td className="p-4 text-right">
                                    <form action={async () => {
                                        'use server'
                                        await stopPromo(promo.id)
                                    }}>
                                        <button className="text-gray-300 hover:text-red-500 transition-colors p-2" title="Arrêter">
                                            <StopCircle size={24} />
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

    </div>
  );
}