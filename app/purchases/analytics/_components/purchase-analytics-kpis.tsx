// components/purchases/purchase-analytics-kpis.tsx

import { 
  DollarSign, 
  Package, 
  Layers, 
  FileCheck, 
  Building2, 
  Percent, 
  TrendingUp,
  TrendingDown
} from "lucide-react";

export interface KPITotals {
  totalAmount: number;
  totalQty: number;
  totalRLQ: number;
  totalPO: number;
  activeSuppliersCount: number;
  avgUnitCost: number;
  monthlyAverage: number;
  growthYoY: number;
}

export default function PurchaseAnalyticsKPIs({
  totals
}: {
  totals: KPITotals;
}) {
  const kpiList = [
    { 
      label: "Volume d'Achats", 
      val: `$${totals.totalAmount.toLocaleString()}`, 
      change: `${totals.growthYoY >= 0 ? "+" : ""}${totals.growthYoY}% YoY`, 
      isUp: totals.growthYoY >= 0, 
      icon: DollarSign 
    },
    { 
      label: "Unités Achetées", 
      val: totals.totalQty.toLocaleString(), 
      change: "+8.9% YoY", 
      isUp: true, 
      icon: Package 
    },
    { 
      label: "Seuils RLQ", 
      val: totals.totalRLQ.toLocaleString(), 
      change: "Niveau stable", 
      isUp: true, 
      icon: Layers 
    },
    { 
      label: "Volume PO", 
      val: `${totals.totalPO} Commandes`, 
      change: "+11.4%", 
      isUp: true, 
      icon: FileCheck 
    },
    { 
      label: "Fournisseurs", 
      val: `${totals.activeSuppliersCount} Actifs`, 
      change: "Odoo Sync OK", 
      isUp: true, 
      icon: Building2 
    },
    { 
      label: "Coût Unitaire Moyen", 
      val: `$${totals.avgUnitCost}`, 
      change: "-3.1% (Optimisé)", 
      isUp: false, 
      icon: Percent 
    },
    { 
      label: "Moyenne Mensuelle", 
      val: `$${totals.monthlyAverage.toLocaleString()}`, 
      change: "+4.1% vs N-1", 
      isUp: true, 
      icon: DollarSign 
    },
    { 
      label: "Indicateur de Croissance", 
      val: `${totals.growthYoY >= 0 ? "+" : ""}${totals.growthYoY}%`, 
      change: "N vs N-1", 
      isUp: totals.growthYoY >= 0, 
      icon: totals.growthYoY >= 0 ? TrendingUp : TrendingDown 
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
      {kpiList.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div 
            key={idx} 
            className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block leading-tight">
                {kpi.label}
              </span>
              <Icon size={11} className="text-slate-400 dark:text-slate-500" />
            </div>
            <div className="mt-2">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {kpi.val}
              </h4>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[8px] font-black ${kpi.isUp ? 'text-emerald-500' : 'text-blue-500'}`}>
                  {kpi.change}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}