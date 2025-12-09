"use client";

import React from "react";
import { 
  ArrowLeftRight, AlertTriangle, TrendingDown, Package, Receipt 
} from "lucide-react";
import { ReturnStat, RecentTransaction } from "../actions/orders";

type Props = {
  data: {
    kpi: { returnRate: string; totalReturns: number; lostRevenue: number };
    topReturns: ReturnStat[];
    transactions: RecentTransaction[];
  };
};

export default function OrdersDashboard({ data }: Props) {
  return (
    <div className="space-y-6">
      
      {/* 1. KPI Cards - Focus Retours */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase">Taux de Retour (90j)</p>
             <p className={`text-3xl font-bold mt-1 ${Number(data.kpi.returnRate) > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
               {data.kpi.returnRate}%
             </p>
           </div>
           <ArrowLeftRight className="w-8 h-8 text-slate-300"/>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase">Articles Retournés</p>
             <p className="text-3xl font-bold text-slate-900 mt-1">{data.kpi.totalReturns}</p>
           </div>
           <Package className="w-8 h-8 text-slate-300"/>
        </div>

        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center justify-between">
           <div>
             <p className="text-red-800 text-xs font-bold uppercase">CA Remboursé</p>
             <p className="text-3xl font-bold text-red-900 mt-1">-{data.kpi.lostRevenue.toLocaleString()} $</p>
           </div>
           <TrendingDown className="w-8 h-8 text-red-400 opacity-50"/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 2. Top Produits Retournés */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">Top Retours (Produits à pb)</h3>
                <p className="text-xs text-slate-400">Produits avec le plus gros volume de retours.</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-orange-400"/>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                 <tr>
                   <th className="px-6 py-3">Produit</th>
                   <th className="px-6 py-3 text-center">Taux</th>
                   <th className="px-6 py-3 text-right">Qté Ret.</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {data.topReturns.map((item, idx) => (
                   <tr key={idx} className="hover:bg-slate-50">
                     <td className="px-6 py-3 font-medium text-slate-700 truncate max-w-[200px]">
                       {item.productName}
                     </td>
                     <td className="px-6 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          item.returnRate > 20 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {item.returnRate}%
                        </span>
                     </td>
                     <td className="px-6 py-3 text-right font-bold text-red-600">
                       -{item.qtyReturned}
                     </td>
                   </tr>
                 ))}
                 {data.topReturns.length === 0 && (
                   <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Aucun retour récent. Bravo !</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* 3. Flux Transactions Récent */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
           <div className="p-6 border-b border-slate-50 bg-white sticky top-0 z-10">
              <h3 className="font-bold text-slate-900">Transactions Récentes</h3>
              <p className="text-xs text-slate-400">Flux en direct des ventes et remboursements.</p>
           </div>
           
           <div className="overflow-y-auto flex-1">
             <table className="w-full text-left text-sm">
               <tbody className="divide-y divide-slate-50">
                 {data.transactions.map((tx) => (
                   <tr key={tx.id} className="hover:bg-slate-50">
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-full ${tx.type === 'SALE' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                              {tx.type === 'SALE' ? <Receipt className="w-4 h-4"/> : <ArrowLeftRight className="w-4 h-4"/>}
                           </div>
                           <div>
                              <div className="font-medium text-slate-900 line-clamp-1">{tx.product}</div>
                              <div className="text-xs text-slate-400 flex gap-2">
                                <span>{tx.date}</span>
                                <span>•</span>
                                <span>{tx.orderRef}</span>
                              </div>
                           </div>
                        </div>
                     </td>
                     <td className={`px-6 py-4 text-right font-bold ${tx.type === 'SALE' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {tx.type === 'SALE' ? '+' : ''}{tx.amount.toLocaleString()} $
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}