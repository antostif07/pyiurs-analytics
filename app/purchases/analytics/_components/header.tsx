import { Download, RotateCcw } from "lucide-react";

export default function PurchaseAnalyticsHeader({resetAllFilters}: {resetAllFilters: () => void}) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">
            Analytiques <span className="text-indigo-600">Procurement & BI</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Console de pilotage décisionnelle et d'agrégation matricielle connectée à Odoo ERP.
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={resetAllFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 shadow-sm"
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase shadow-sm">
            <Download size={12} /> Exporter BI (.xlsx)
          </button>
        </div>
      </div>
    )
}