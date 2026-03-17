import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, CreditCard, Award, AlertTriangle, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFemmeDashboardData } from "@/lib/odoo/femme.services";
import ProductImage from "../marketing/components/ProductImage";
import DailySalesChart from "./components/DailySalesChart";

export const dynamic = 'force-dynamic';

export default async function AnalyseFemmeDashboard() {
  const stats = await getFemmeDashboardData();

  // 2. Fonction utilitaire pour le badge de croissance
  const renderTrendBadge = (value: number) => {
    const isPositive = value >= 0;
    const colorClass = isPositive ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50";
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${colorClass}`}>
        <Icon className="w-3 h-3" />
        {isPositive ? "+" : ""}{value.toFixed(1)}% vs Mois Précédent
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Femme</h1>
        <p className="text-slate-500 mt-1">Analyse des performances du segment Femme (Mois en cours).</p>
      </div>

      {/* KPI CARDS (Haut de page) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARTE 1 : CHIFFRE D'AFFAIRES */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Chiffre d'Affaires</CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.currentMonth.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
            </div>
            <div className="mt-3">
              {renderTrendBadge(stats.trends.revenueGrowth)}
            </div>
          </CardContent>
        </Card>

        {/* CARTE 2 : UNITÉS VENDUES */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Articles Vendus</CardTitle>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.currentMonth.unitsSold.toLocaleString('fr-FR')} <span className="text-lg text-slate-500 font-medium">pcs</span>
            </div>
            <div className="mt-3">
              {renderTrendBadge(stats.trends.unitsGrowth)}
            </div>
          </CardContent>
        </Card>

        {/* CARTE 3 : PANIER MOYEN */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Val. Moy. par Ligne</CardTitle>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <CreditCard className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {stats.currentMonth.averageOrderValue.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
            </div>
            <p className="text-xs text-slate-400 mt-4">Prix moyen dépensé par article Femme.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <LineChart className="w-5 h-5 text-indigo-600" />
            Évolution du Chiffre d'Affaires (Mois en cours)
          </CardTitle>
          <p className="text-xs text-slate-500 font-normal mt-1">
            Tendances journalières des ventes nettes pour le segment Femme.
          </p>
        </CardHeader>
        <CardContent>
          <DailySalesChart data={stats.dailySales} />
        </CardContent>
      </Card>
      {/* DEUXIÈME SECTION : TOP PRODUITS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-amber-500" /> 
              Top 5 Bestsellers (Mois en cours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    
                    {/* 1. Le Rank (#1, #2...) */}
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      #{index + 1}
                    </div>

                    {/* 2. ✅ L'Image du Produit */}
                    <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
                      <ProductImage src={product.imageUrl} alt={product.name} />
                    </div>

                    {/* 3. Nom, Couleur et Ventes */}
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-medium">{product.qtySold} vendus</span>
                        {/* On n'affiche la couleur que si ce n'est pas "Standard" */}
                        {product.color !== 'Standard' && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-blue-600 font-semibold px-1.5 py-0.5 bg-blue-50 rounded-md">
                              {product.color}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                  
                  {/* 4. Le Revenu (Marge/CA) */}
                  <div className="text-right font-bold text-slate-900 bg-slate-50 px-3 py-1.5 rounded-lg">
                    {product.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* CARTE 2 : FLOP 5 (SLOW MOVERS) */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-red-500" /> 
              Flop 5 : Ventes Lentes (Slow Movers)
            </CardTitle>
            <p className="text-xs text-slate-500 font-normal mt-1">
              Produits avec le moins de revenus ce mois-ci. (Nécessitent une promotion).
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.flopProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-red-50/50 border border-transparent hover:border-red-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold text-sm bg-red-100 text-red-700">
                      !
                    </div>
                    <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                      <ProductImage src={product.imageUrl} alt={product.name} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 line-clamp-1">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="font-medium text-red-600">Seulement {product.qtySold} vendu{product.qtySold > 1 ? 's' : ''}</span>
                        {product.color !== 'Standard' && (
                          <><span className="text-slate-300">•</span><span className="text-slate-600 font-semibold px-1.5 py-0.5 bg-slate-100 rounded-md">{product.color}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                    {product.revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}