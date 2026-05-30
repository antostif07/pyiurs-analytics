'use client';

import React, { useState, useMemo, useEffect } from "react";
import { 
  TrendingUp,
  Layers, 
  SlidersHorizontal,
  Sparkles,
  DollarSign,
  Package,
  FileCheck,
  Building2,
  Percent,
  Info,
} from "lucide-react";
import { getProcurementAnalyticsData, ProcurementAnalyticsPayload } from "../action";
import PurchaseAnalyticsHeader from "./_components/header";
import PurchaseAnalyticsFilters, { OdooFilterOption } from "./_components/purchase-analytics-filters";
import PurchaseAnalyticsKPIs from "./_components/purchase-analytics-kpis";
import PurchaseAnalyticsTable from "./_components/purchase-analytics-table";

// --- 1. DÉFINITION DES TYPES OPÉRATIONNELS ---

export type Segment = "All" | "Beauty" | "Femme" | "Kid";
export type Category = "All" | "Matières Premières" | "SaaS & Tech" | "Logistique" | "Packaging";
export type PivotMetric = "Amount" | "Quantity" | "RLQ" | "POCount";
export type GroupBy = "Segment" | "Category" | "Supplier" | "Brand";

interface MonthRow {
  month: string;
  amount: number;
  qty: number;
  rlq: number; // Reorder Level Quantity (Seuil d'alerte de réapprovisionnement)
  poCount: number;
  avgUnitCost: number;
  supplierCount: number;
  growthPct: number;
  monthlyDelta: number; // Écart budgétaire
}

// --- 2. DONNÉES SIMULÉES DE TYPE BI (SAP/Odoo Like) ---


const PIVOT_RAW_DATA = [
  // Segment: Beauty
  { Segment: "Beauty", Category: "Matières Premières", Supplier: "Estée Lauder Group", Brand: "Clinique", Amount: 350000, Quantity: 24000, RLQ: 800, POCount: 45 },
  { Segment: "Beauty", Category: "Packaging", Supplier: "Verescence", Brand: "Orchidée", Amount: 180000, Quantity: 45000, RLQ: 1200, POCount: 28 },
  // Segment: Femme
  { Segment: "Femme", Category: "Matières Premières", Supplier: "Lenzing AG", Brand: "Tencel Co", Amount: 540000, Quantity: 88000, RLQ: 2100, POCount: 62 },
  { Segment: "Femme", Category: "Logistique", Supplier: "DHL Supply Chain", Brand: "Carrier Premium", Amount: 220000, Quantity: 5000, RLQ: 0, POCount: 110 },
  // Segment: Kid
  { Segment: "Kid", Category: "Matières Premières", Supplier: "Organic Cotton Co", Brand: "BioKid", Amount: 195000, Quantity: 31000, RLQ: 950, POCount: 33 },
  { Segment: "Kid", Category: "SaaS & Tech", Supplier: "Odoo ERP SA", Brand: "Odoo Suite", Amount: 95000, Quantity: 150, RLQ: 0, POCount: 12 }
];

const BI_INSIGHTS = [
  { title: "Anomalie d'achat", text: "Pic de dépenses de +27.9% en Novembre provoqué par la renégociation de la catégorie Packaging.", status: "warning" },
  { title: "Segment Leader", text: "Le segment Femme représente 51.3% du volume global des achats engagés cette année.", status: "info" },
  { title: "Indicateur Reorder (RLQ)", text: "Le niveau d'alerte RLQ global a grimpé de +12% à l'approche de la clôture annuelle.", status: "success" }
];

export default function ProcurementAnalytics() {
    const currentYear = new Date().getFullYear().toString();

  // --- ÉTATS DES FILTRES GLOBAUX ---
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedSegment, setSelectedSegment] = useState<Segment>("All");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [selectedSupplier, setSelectedSupplier] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // --- ÉTATS DU TABLEAU DE PIVOT INTERACTIF ---
  const [pivotGroupBy, setPivotGroupBy] = useState<GroupBy>("Segment");
  const [pivotMetric, setPivotMetric] = useState<PivotMetric>("Amount");
  const [data, setData] = useState<ProcurementAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 4. TRAITEMENT DE LA MATRICE DE PIVOT SECONDAIRE ---
  const computedPivotData = useMemo(() => {
    const map: Record<string, number> = {};
    PIVOT_RAW_DATA.forEach(row => {
      // Filtrage dynamique
      if (selectedSegment !== "All" && row.Segment !== selectedSegment) return;
      if (selectedCategory !== "All" && row.Category !== selectedCategory) return;

      const groupKey = row[pivotGroupBy];
      const metricVal = row[pivotMetric];
      map[groupKey] = (map[groupKey] || 0) + metricVal;
    });

    return Object.entries(map).map(([key, value]) => ({ group: key, value }));
  }, [pivotGroupBy, pivotMetric, selectedSegment, selectedCategory]);

  const resetAllFilters = () => {
    setSelectedSegment("All");
    setSelectedCategory("All");
    setSelectedSupplier("All");
    setSelectedStatus("All");
    setSelectedYear("2024");
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const response = await getProcurementAnalyticsData({
          year: selectedYear,
          segment: selectedSegment,
          category: selectedCategory
        });
        setData(response);
      } catch (err) {
        console.error("Erreur lors de la synchronisation Odoo :", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedYear, selectedSegment, selectedCategory]);
  
  if (loading) {
    return <div className="p-12 text-center text-xs font-bold text-slate-400">Chargement et agrégation en cours depuis l'ERP Odoo...</div>;
  }

  console.log(data);

  const totals = {
    totalAmount: data?.kpis.totalAmount || 0,
    totalQty: data?.kpis.totalQty || 0,
    totalRLQ: 0,
    totalPO: data?.kpis.totalPO || 0,
    activeSuppliersCount: data?.kpis.activeSuppliers   || 0,
    avgUnitCost: data?.kpis.avgUnitCost || 0,
    monthlyAverage: data?.kpis.monthlyAverage || 0,
    growthYoY: data?.kpis.growthYoY || 0,
  }
  const monthlyData = data ? data.monthlyTable.map(row => ({
    month: row.month,
    amount: row.amount,
    qty: row.qty,
    rlq: row.rlq,
    poCount: row.poCount,
    avgUnitCost: row.avgUnitCost,
    supplierCount: row.supplierCount,
    growthPct: row.growthPct,
    monthlyDelta: row.monthlyDelta
  })) : [];
  
  return (
    <div className="space-y-8 pb-12 bg-slate-50/50 dark:bg-slate-900/10 min-h-screen">
      
      {/* HEADER DE LA PAGE */}
      <PurchaseAnalyticsHeader resetAllFilters={resetAllFilters} />

      {/* BARRE DE FILTRES GLOBAUX */}
      <PurchaseAnalyticsFilters
        selectedYear={selectedYear}
        setSelectedYear={(val: string) => setSelectedYear(val)}
        setSelectedSegment={(val: Segment) => setSelectedSegment(val)}
        setSelectedCategory={(val: Category) => setSelectedCategory(val)}
        setSelectedSupplier={(val: string) => setSelectedSupplier(val)}
        setSelectedStatus={(val: string) => setSelectedStatus(val)}
        selectedSegment={selectedSegment}
        selectedCategory={selectedCategory}
        selectedSupplier={selectedSupplier}
        selectedStatus={selectedStatus}
        categoryOptions={data?.pivotMatrix.category.map(c => ({name: c.group, value: c.value})) as unknown as OdooFilterOption[]}
        supplierOptions={data?.pivotMatrix.supplier.map(s => ({name: s.group, value: s.value})) as unknown as OdooFilterOption[]}
        selectedBrand={""} setSelectedBrand={function (value: string): void {
          throw new Error("Function not implemented.");
        } }        />

      {/* GRILLE DES 8 CARTES KPI PRINCIPALES (Power BI Layout) */}
      <PurchaseAnalyticsKPIs
        totals={totals}       
      />

      {/* TABLEAU ANALYTIQUE PRINCIPAL (Months Jan -> Dec) */}
      <PurchaseAnalyticsTable
        selectedYear={selectedYear} monthlyData={monthlyData} totals={totals} />

      {/* PIVOT MATRICIEL ET ANALYTIQUE DU CHASSIS DE DONNÉES */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* INTERACTIVE PIVOT MATRIX TABLE (Prand 7/12) */}
        <div className="xl:col-span-7 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-slate-100 dark:border-slate-900 pb-3">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Pivot d'Analyse Bidirectionnel (BI Segment)
              </h3>
              <p className="text-[9px] text-slate-400 font-medium">Configurez les axes d'analyse de la matrice d'engagement.</p>
            </div>
            
            {/* SWITCH METRICS */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg">
              {(["Amount", "Quantity", "RLQ", "POCount"] as PivotMetric[]).map(met => (
                <button 
                  key={met}
                  onClick={() => setPivotMetric(met)}
                  className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-tighter transition-all ${
                    pivotMetric === met 
                      ? 'bg-white dark:bg-slate-950 text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {met === "Amount" ? "Fonds" : met === "Quantity" ? "Unités" : met === "RLQ" ? "RLQ" : "PO"}
                </button>
              ))}
            </div>
          </div>

          {/* AXE DE REGROUPEMENT */}
          <div className="flex gap-2 items-center mb-4">
            <span className="text-[9px] font-bold uppercase text-slate-400">Regrouper par :</span>
            {(["Segment", "Category", "Supplier", "Brand"] as GroupBy[]).map(grp => (
              <button
                key={grp}
                onClick={() => setPivotGroupBy(grp)}
                className={`px-2 py-0.5 rounded border text-[9px] font-bold ${
                  pivotGroupBy === grp 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>

          {/* RENDER TABLE DU PIVOT */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-900 text-slate-200">
                <tr>
                  <th className="px-3 py-2 uppercase font-bold tracking-widest">{pivotGroupBy}</th>
                  <th className="px-3 py-2 uppercase font-bold tracking-widest text-right">Valeur Cumulée</th>
                  <th className="px-3 py-2 uppercase font-bold tracking-widest text-center">Part Relative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {computedPivotData.map((row, idx) => {
                  const grandTotal = computedPivotData.reduce((acc, c) => acc + c.value, 0);
                  const pct = grandTotal > 0 ? Math.round((row.value / grandTotal) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 font-medium">
                      <td className="px-3 py-2 font-black text-slate-900 dark:text-slate-100 uppercase italic border-r border-slate-100 dark:border-slate-900">
                        {row.group}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-slate-800 dark:text-slate-200 border-r border-slate-100 dark:border-slate-900">
                        {pivotMetric === "Amount" ? `$${row.value.toLocaleString()}` : row.value.toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden border">
                            <div className="bg-indigo-600 h-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-black italic">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI-STYLE BI BUSINESS INSIGHTS (Prand 5/12) */}
        <div className="xl:col-span-5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Avis d'Optimisation des Coûts (AI Insight)
              </h3>
            </div>

            <div className="space-y-3">
              {BI_INSIGHTS.map((insight, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border text-xs ${
                    insight.status === "warning" ? 'bg-rose-50/50 border-rose-100 text-rose-950 dark:bg-rose-950/10 dark:border-rose-900 dark:text-rose-200' :
                    insight.status === "success" ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950 dark:bg-emerald-950/10 dark:border-emerald-900 dark:text-emerald-200' :
                    'bg-indigo-50/50 border-indigo-100 text-indigo-950 dark:bg-indigo-950/10 dark:border-indigo-900 dark:text-indigo-200'
                  }`}
                >
                  <span className="font-black uppercase tracking-wider text-[9px] block mb-1">{insight.title}</span>
                  <p className="font-semibold leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900 text-[10px] text-slate-400 flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1">
              <Info size={11} /> Données d'analyse calculées en continu
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-black">Historique</span>
          </div>
        </div>
      </div>
    </div>
  );
}