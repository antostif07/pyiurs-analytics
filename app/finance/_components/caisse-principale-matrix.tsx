"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Banknote, Smartphone, Building2, Wallet, ArrowDownCircle, PiggyBank, History } from "lucide-react";
import { motion } from "framer-motion";

export default function CaissePrincipaleMatrix({ data, shops = [], isLoading }: any) {
  if (isLoading) return <div className="h-64 w-full bg-muted animate-pulse rounded-3xl" />;
  if (!data) return null;

  const totalCols = shops.length + 2;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
        <h3 className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600"/> Caisse Principale & Flux Monétaires
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase text-slate-400 min-w-[220px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">Mode de Règlement</th>
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-indigo-600 min-w-[110px] bg-indigo-50/30">Total Global</th>
              {shops.map((s: any) => (
                <th key={s.id} className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-500 min-w-[100px]">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* SECTION CASH */}
            <SectionHeader label="CASH / ESPÈCES" icon={<Banknote className="w-3 h-3"/>} color="bg-emerald-500" colSpan={totalCols} />
            <RowItem label="S.O (Ouverture Cash)" icon={<History className="text-slate-400 w-3 h-3"/>} total={data.cash.so.total} values={data.cash.so.shops} shops={shops} />
            <RowItem label="Ventes Cash" icon={<Wallet className="text-emerald-500 w-3 h-3"/>} total={data.cash.entree.total} values={data.cash.entree.shops} shops={shops} />
            <RowItem 
                label="Dépenses Jour" 
                icon={<ArrowDownCircle className="text-rose-500 w-3 h-3"/>} 
                total={data.cash.depense.total} 
                values={data.cash.depense.shops} 
                shops={shops} 
            />
            <RowItem label="Épargnes / Transferts" icon={<PiggyBank className="text-blue-500 w-3 h-3"/>} total={data.cash.epargne.total} values={data.cash.epargne.shops} shops={shops} isLastInSection />

            {/* SECTION MOBILE MONEY */}
            <SectionHeader label="MOBILE MONEY" icon={<Smartphone className="w-3 h-3"/>} color="bg-orange-500" colSpan={totalCols} />
            <RowItem label="S.O Mobile" total={data.mobile.so.total} values={data.mobile.so.shops} shops={shops} />
            <RowItem label="Entrées Mobile" icon={<Wallet className="text-emerald-500 w-3 h-3"/>} total={data.mobile.entree.total} values={data.mobile.entree.shops} shops={shops} />
            <RowItem label="Sorties / Commissions" icon={<ArrowDownCircle className="text-rose-500 w-3 h-3"/>} total={data.mobile.sortie.total} values={data.mobile.sortie.shops} shops={shops} isLastInSection />

            {/* SECTION BANQUE */}
            <SectionHeader label="TRANSFERTS BANCAIRES" icon={<Building2 className="w-3 h-3"/>} color="bg-blue-600" colSpan={totalCols} />
            <RowItem label="S.O Banque" total={data.bank.so.total} values={data.bank.so.shops} shops={shops} />
            <RowItem label="Entrées Banque" icon={<Wallet className="text-emerald-500 w-3 h-3"/>} total={data.bank.entree.total} values={data.bank.entree.shops} shops={shops} />
            <RowItem label="Sorties Banque" icon={<ArrowDownCircle className="text-rose-500 w-3 h-3"/>} total={data.bank.sortie.total} values={data.bank.sortie.shops} shops={shops} isLastInSection />
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* On réutilise les sous-composants SectionHeader et RowItem du tableau précédent */
function SectionHeader({ label, icon, color, colSpan }: any) {
    return (
      <tr className="bg-slate-50/30 dark:bg-slate-800/30 border-y border-slate-100 dark:border-slate-800">
        <td colSpan={colSpan} className="px-4 py-1.5 sticky left-0 z-10">
          <div className="flex items-center gap-2">
              <div className={cn("p-1 rounded-md text-white", color)}>{icon}</div>
              <span className="text-[10px] font-black tracking-widest text-slate-500">{label}</span>
          </div>
        </td>
      </tr>
    );
}

function RowItem({ label, icon, total, values, shops, isLastInSection = false }: any) {
    return (
      <tr className={cn(
          "border-b border-slate-50 dark:border-slate-800 hover:bg-indigo-50/10 transition-colors group",
          isLastInSection && "border-b-2 border-b-slate-100 dark:border-b-slate-800"
      )}>
        <td className="px-4 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
            <span className="truncate whitespace-nowrap">{label}</span>
          </div>
        </td>
        <td className="px-4 py-1.5 text-right font-mono font-bold text-[11px] text-indigo-600 bg-indigo-50/5 tabular-nums min-w-[110px] border-r border-indigo-100/30">
          {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} $
        </td>
        {shops.map((shop: any) => (
          <td key={shop.id} className="px-4 py-1.5 text-right font-mono text-[11px] text-slate-600 dark:text-slate-500 tabular-nums min-w-[100px] border-r border-slate-50 dark:border-slate-800 last:border-r-0">
            {(values[shop.id] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} $
          </td>
        ))}
      </tr>
    );
}