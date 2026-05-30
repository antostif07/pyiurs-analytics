// components/purchases/purchase-analytics-table.tsx

export interface MonthlyReportRow {
  month: string;
  amount: number;
  qty: number;
  rlq: number;
  poCount: number;
  avgUnitCost: number;
  supplierCount: number;
  growthPct: number;
  monthlyDelta: number;
}

export interface ReportTotals {
  totalAmount: number;
  totalQty: number;
  totalRLQ: number;
  totalPO: number;
  avgUnitCost: number;
  monthlyAverage: number;
  activeSuppliersCount: number;
  growthYoY: number;
}

export default function PurchaseAnalyticsTable({
  selectedYear,
  monthlyData,
  totals
}: {
  selectedYear: string;
  monthlyData: MonthlyReportRow[];
  totals: ReportTotals;
}) {
  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* En-tête de la matrice */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex justify-between items-center">
        <div>
          <h2 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Matrice de Consolidation Mensuelle ({selectedYear})
          </h2>
          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
            Analyse dynamique des flux financiers par mois civil.
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/10 dark:border-indigo-900 dark:text-indigo-400 uppercase">
          Format : ERP Ledger
        </span>
      </div>

      {/* Conteneur scrollable horizontalement pour l'affichage de données denses */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-250">
          <thead className="bg-slate-900 text-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">Mois</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">Volume Financier</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">Volume Unitaire</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">Niveau RLQ</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">Bons Commande</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">C.U Moyen</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">Fournisseurs</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider border-r border-slate-700">Croissance %</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider">Écart Budgétaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-900 font-medium">
            {monthlyData.map((row) => (
              <tr 
                key={row.month} 
                className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-black text-slate-900 dark:text-slate-100 uppercase italic">
                  {row.month}
                </td>
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-black text-slate-800 dark:text-slate-200 italic">
                  ${row.amount.toLocaleString()}
                </td>
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-slate-600 dark:text-slate-400 font-semibold">
                  {row.qty.toLocaleString()}
                </td>
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 text-slate-500 dark:text-slate-500">
                  {row.rlq}
                </td>
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-bold text-slate-700 dark:text-slate-300">
                  {row.poCount} POs
                </td>
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-mono text-slate-500">
                  ${row.avgUnitCost}
                </td>
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900 font-semibold text-slate-600 dark:text-slate-400">
                  {row.supplierCount} tiers
                </td>
                {/* Conditionnel Croissance */}
                <td className="px-4 py-2 border-r border-slate-100 dark:border-slate-900">
                  <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                    row.growthPct >= 0 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400' 
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/10 dark:text-rose-400'
                  }`}>
                    {row.growthPct > 0 ? "+" : ""}{row.growthPct}%
                  </span>
                </td>
                {/* Conditionnel Écart Budgétaire */}
                <td className={`px-4 py-2 font-black italic ${row.monthlyDelta < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {row.monthlyDelta < 0 ? "Sous-utilisé" : "Sur-utilisé"} (${Math.abs(row.monthlyDelta).toLocaleString()})
                </td>
              </tr>
            ))}
          </tbody>

          {/* LIGNES GLOBALES DE TOTALISATION */}
          <tfoot className="bg-slate-50 dark:bg-slate-950 border-t-2 border-slate-200 dark:border-slate-800 font-black text-slate-900 dark:text-slate-200">
            {/* Ligne TOTAL */}
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 uppercase text-[10px]">CUMUL TOTAL</td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 text-sm font-black text-indigo-600 dark:text-indigo-400 italic">
                ${totals.totalAmount.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">
                {totals.totalQty.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">
                {totals.totalRLQ.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">
                {totals.totalPO} POs
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">—</td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">{totals.activeSuppliersCount} Actifs</td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 text-emerald-500">
                {totals.growthYoY >= 0 ? "+" : ""}{totals.growthYoY}%
              </td>
              <td className="px-4 py-2.5">—</td>
            </tr>
            {/* Ligne MOYENNE */}
            <tr>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 uppercase text-[10px]">MOYENNE MENSUELLE</td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 italic">
                ${totals.monthlyAverage.toLocaleString()}
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">
                {Math.round(totals.totalQty / (monthlyData.length || 12)).toLocaleString()}
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">
                {Math.round(totals.totalRLQ / (monthlyData.length || 12)).toLocaleString()}
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">
                {Math.round(totals.totalPO / (monthlyData.length || 12))} POs
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 font-mono text-xs">
                ${totals.avgUnitCost}
              </td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">46 Tiers</td>
              <td className="px-4 py-2.5 border-r border-slate-200 dark:border-slate-800 font-bold">—</td>
              <td className="px-4 py-2.5">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}