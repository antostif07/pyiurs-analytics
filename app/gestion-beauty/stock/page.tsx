// app/analyse-beauty/stock/page.tsx
import { Suspense } from "react";
import InventoryTable from "./InventoryTable"; // Le composant react-table
import { Loader2 } from "lucide-react";
import { odooClient } from "@/lib/odoo/xmlrpc";

// Fonction pour récupérer les compteurs des 4 cartes (Summary)
async function getStockSummary() {
  try {
    const beautyDomain = [["x_studio_segment", "=", "Beauty"]];
    
    // On récupère les stocks de tous les produits beauty
    const products = await odooClient.searchRead("product.product", {
      domain: beautyDomain,
      fields: ["qty_available"],
    }) as { qty_available: number }[];

    const summary = {
      rupture: products.filter(p => p.qty_available <= 0).length,
      critique: products.filter(p => p.qty_available > 0 && p.qty_available <= 5).length,
      faible: products.filter(p => p.qty_available > 5 && p.qty_available <= 15).length,
      bon: products.filter(p => p.qty_available > 15).length,
    };

    return summary;
  } catch (error) {
    console.error("Erreur summary:", error);
    return { rupture: 0, critique: 0, faible: 0, bon: 0 };
  }
}

export default async function StockBeautyPage() {
  const summary = await getStockSummary();

  return (
    <div className="space-y-8">
      {/* 1. TITRE ET ENTÊTE */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Niveaux de Stock</h1>
          <p className="text-sm text-gray-500">Analyse globale du segment Beauty</p>
        </div>
        <div className="text-[10px] text-gray-400 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Données synchronisées avec Odoo
        </div>
      </div>

      {/* 2. LES 4 CARTES KPI (Reproduisant ton image) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          label="Rupture" 
          count={summary.rupture} 
          subLabel="Stock à zéro"
          colorClass="bg-slate-100 text-slate-900 border-slate-200"
        />
        <SummaryCard 
          label="Critique" 
          count={summary.critique} 
          subLabel="1 à 5 unités"
          colorClass="bg-red-50 text-red-600 border-red-100"
        />
        <SummaryCard 
          label="Faible" 
          count={summary.faible} 
          subLabel="6 à 15 unités"
          colorClass="bg-amber-50 text-amber-600 border-amber-100"
        />
        <SummaryCard 
          label="Bon" 
          count={summary.bon} 
          subLabel="Plus de 15 unités"
          colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
        />
      </div>

      {/* 3. SECTION TABLEAU AVEC REACT-TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-gray-800">Inventaire des Produits</h2>
          <div className="flex gap-2">
            {/* On pourra ajouter ici des filtres rapides plus tard */}
          </div>
        </div>
        
        <Suspense fallback={
          <div className="h-64 w-full bg-white rounded-xl border border-gray-100 flex items-center justify-center">
            <Loader2 className="animate-spin text-pink-500" />
          </div>
        }>
          <InventoryTable />
        </Suspense>
      </div>
    </div>
  );
}

// Composant interne pour les cartes de stats
function SummaryCard({ label, count, subLabel, colorClass }: { 
  label: string; 
  count: number; 
  subLabel: string;
  colorClass: string;
}) {
  return (
    <div className={`p-5 rounded-2xl border transition-all hover:shadow-md ${colorClass}`}>
      <div className="flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black mb-1">{count}</span>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{label}</span>
        <span className="text-[9px] opacity-60 font-medium mt-1 uppercase">{subLabel}</span>
      </div>
    </div>
  );
}