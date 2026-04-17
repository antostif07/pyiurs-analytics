"use client";
import { Banknote, Smartphone, Building2, Wallet, ArrowDownCircle, PiggyBank, History, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import SectionHeader from "./section-header";
import RowItem from "./row-item";

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
            <RowItem 
                label="S.F (Solde Fermeture Cash)" 
                icon={<CheckCircle2 className="text-indigo-600 w-3 h-3"/>} 
                total={data.cash.sf.total} 
                values={data.cash.sf.shops} 
                shops={shops} 
                isLastInSection 
                className="bg-indigo-50/20 font-bold" 
            />

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