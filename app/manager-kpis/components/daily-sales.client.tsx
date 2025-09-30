'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySaleData } from "../page";
import { BoutiqueSelector } from "@/components/boutique-selector";
import { useRouter, useSearchParams } from "next/navigation";

export interface Boutique {
  id: number;
  name: string;
}

function SalesTable({ data }: { data: DailySaleData[],  }) {
  // Extraire toutes les dates uniques
  const dates = [...new Set(data.map(item => item.date))].sort();
  
  // Définir les lignes (types de valeurs)
  const valueTypes = [
    { key: 'totalSales', label: 'CA Total', color: 'text-gray-900 dark:text-white', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { key: 'beautyAmount', label: 'Beauty', color: 'text-gray-900 dark:text-white', bgColor: 'bg-pink-50 dark:bg-pink-900/20' },
    { key: 'safeAmount', label: 'Marchandises', color: 'text-gray-900 dark:text-white', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { key: 'rentAmount', label: 'Loyer', color: 'text-gray-900 dark:text-white', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
    { key: 'ceoAmount', label: 'CEO', color: 'text-gray-900 dark:text-white', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  // Calculer les totaux par type de valeur
  const totals = valueTypes.map(type => ({
    label: type.label,
    total: data.reduce((sum, item) => sum + (item[type.key as keyof DailySaleData] as number), 0)
  }));

  return (
    <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
        <CardTitle className="text-gray-900 dark:text-white flex items-center justify-between">
          <span>Ventes Quotidiennes - Vue par Jour</span>
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            {dates.length} jours • {data.length} enregistrements
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/30">
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-slate-700/30 z-10">
                  Type de Vente
                </th>
                {dates.map(date => (
                  <th 
                    key={date} 
                    className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white min-w-32"
                  >
                    <div className="flex flex-col">
                      <span>{new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                      <span className="text-xs font-normal text-gray-500">
                        {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-900/20 min-w-32">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {valueTypes.map((valueType, index) => (
                <tr 
                  key={valueType.key}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors duration-150 group"
                >
                  <td className={`py-4 px-6 text-sm font-semibold ${valueType.color} sticky left-0 ${valueType.bgColor} z-10 border-r border-gray-200 dark:border-slate-700`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        valueType.key === 'totalSales' ? 'bg-blue-500' :
                        valueType.key === 'rentAmount' ? 'bg-purple-500' :
                        valueType.key === 'safeAmount' ? 'bg-green-500' :
                        valueType.key === 'ceoAmount' ? 'bg-orange-500' : 'bg-pink-500'
                      }`}></div>
                      <span>{valueType.label}</span>
                    </div>
                  </td>
                  {dates.map(date => {
                    const dayData = data.find(item => item.date === date);
                    const value = dayData ? (dayData[valueType.key as keyof DailySaleData] as number) : 0;
                    return (
                      <td key={`${valueType.key}-${date}`} className="py-4 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {value.toFixed(2)}$
                          </span>
                          {valueType.key === 'totalSales' && dayData && (
                            <span className={`text-xs ${
                              dayData.progress >= 100 
                                ? 'text-green-600 dark:text-green-400' 
                                : dayData.progress >= 80 
                                  ? 'text-yellow-600 dark:text-yellow-400' 
                                  : 'text-red-600 dark:text-red-400'
                            }`}>
                              {dayData.progress.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-4 px-6 text-right bg-blue-50 dark:bg-blue-900/20 border-l border-gray-200 dark:border-slate-700">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {totals[index].total.toFixed(2)}$
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Ligne des totaux par jour */}
            <tfoot className="bg-gray-50 dark:bg-slate-700/30 border-t border-gray-200 dark:border-slate-700">
              <tr>
                <td className="py-3 px-6 text-sm font-semibold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-slate-700/30 z-10 border-r border-gray-200 dark:border-slate-700">
                  Total Jour
                </td>
                {dates.map(date => {
                  const dayData = data.find(item => item.date === date);
                  const dayTotal = dayData ? dayData.totalSales : 0;
                  return (
                    <td key={`total-${date}`} className="py-3 px-6 text-right">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {dayTotal.toFixed(2)}$
                      </span>
                    </td>
                  );
                })}
                <td className="py-3 px-6 text-right bg-blue-50 dark:bg-blue-900/20 border-l border-gray-200 dark:border-slate-700">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {data.reduce((sum, item) => sum + item.totalSales, 0).toFixed(2)}$
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DailySalesClient({initialData, boutiques, selectedBoutiqueId}: {initialData: DailySaleData[], boutiques: Boutique[], selectedBoutiqueId?: string}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const handleBoutiqueChange = (boutiqueId: string) => {
        const params = new URLSearchParams(searchParams.toString());

        console.log(boutiqueId);
        
        
        if (boutiqueId === 'all') {
            params.delete('boutique');
        } else {
            params.set('boutique', boutiqueId);
        }
        
        // Naviguer vers la même page avec les nouveaux paramètres
        router.push(`?${params.toString()}`);
    };

    const selectedBoutique = selectedBoutiqueId 
    ? boutiques.find(b => b.id.toString() === selectedBoutiqueId)?.name 
    : 'Toutes les boutiques';
    
    return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Tableau des Ventes Quotidiennes
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Vue par jour - Analyse horizontale des épargnes
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <div className="bg-white dark:bg-slate-700 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">Période analysée</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {initialData.length} jours
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="py-8">
            <BoutiqueSelector boutiques={boutiques} selectedBoutique={selectedBoutiqueId} onBoutiqueChange={handleBoutiqueChange} />
        </div>
        {/* Tableau principal avec jours en colonnes */}
        <SalesTable data={initialData} />
      </div>
    </main>
  );
}