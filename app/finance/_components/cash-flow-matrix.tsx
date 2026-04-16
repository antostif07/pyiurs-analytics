"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, Target, Store } from "lucide-react";
import { motion } from "framer-motion";

interface CashFlowMatrixProps {
  data: any;
  shops: { id: number; name: string }[];
  isLoading: boolean;
}

export default function CashFlowMatrix({ data, shops = [], isLoading }: CashFlowMatrixProps) {
  if (isLoading) return <div className="h-96 w-full bg-muted animate-pulse rounded-3xl" />;
  if (!data) return null;

  // Calcul dynamique du nombre de colonnes pour le colSpan des headers de section
  const totalColumns = shops.length + 2; 

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              {/* Libellé Indicateur */}
              <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 min-w-[220px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                Structure Cash Flow
              </th>
              
              {/* TOTAL GLOBAL (Toujours en premier) */}
              <th className="px-4 py-3 text-right text-[10px] font-black uppercase text-indigo-600 min-w-[110px] bg-indigo-50/30 border-x border-indigo-100/50">
                Total Global
              </th>
              
              {/* Colonnes par SHOP */}
              {shops.map((shop) => (
                <th key={shop.id} className="px-4 py-3 text-right text-[10px] font-black uppercase text-slate-500 min-w-[100px] border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <Store className="w-3 h-3 opacity-70"/> 
                    {shop.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* --- SECTION 1: GLOBAL --- */}
            <SectionHeader label="FLUX GLOBAUX" color="bg-indigo-600" colSpan={totalColumns} />
            <RowItem 
                label="S.O (Solde Ouverture)" 
                icon={<Wallet className="text-amber-500 w-3 h-3" />} 
                total={data.global.so.total} 
                values={data.global.so.shops} 
                shops={shops} 
            />
            <RowItem 
                label="Entrée (Vente Jour)" 
                icon={<TrendingUp className="text-emerald-500 w-3 h-3" />} 
                total={data.global.entree.total} 
                values={data.global.entree.shops} 
                shops={shops} 
            />
            <RowItem 
                label="Objectif Journalier" 
                icon={<Target className="text-rose-500 w-3 h-3" />} 
                total={data.global.objectif.total} 
                values={data.global.objectif.shops} 
                shops={shops} 
                isLastInSection 
            />

            {/* --- SECTIONS SEGMENTS --- */}
            {["Femme", "Beauty", "Enfant"].map((segment) => (
              <React.Fragment key={segment}>
                <SectionHeader label={segment.toUpperCase()} color="bg-slate-400" colSpan={totalColumns} />
                <RowItem 
                  label="S.O" 
                  icon={<Wallet className="text-amber-500/70 w-3 h-3" />} 
                  total={data[segment.toLowerCase()]?.so.total || 0} 
                  values={data[segment.toLowerCase()]?.so.shops || {}} 
                  shops={shops} 
                />
                <RowItem 
                  label="Entrée" 
                  icon={<TrendingUp className="text-emerald-500/70 w-3 h-3" />} 
                  total={data[segment.toLowerCase()]?.entree.total || 0} 
                  values={data[segment.toLowerCase()]?.entree.shops || {}} 
                  shops={shops} 
                />
                <RowItem 
                  label="Objectif" 
                  icon={<Target className="text-rose-500/70 w-3 h-3" />} 
                  total={data[segment.toLowerCase()]?.objectif.total || 0} 
                  values={data[segment.toLowerCase()]?.objectif.shops || {}} 
                  shops={shops} 
                  isLastInSection 
                />
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* --- SOUS-COMPOSANTS --- */

function SectionHeader({ label, color, colSpan }: { label: string; color: string; colSpan: number }) {
  return (
    <tr className="bg-slate-50/30 dark:bg-slate-800/30 border-y border-slate-100 dark:border-slate-800">
      <td colSpan={colSpan} className="px-4 py-1.5 sticky left-0 z-10">
        <div className="flex items-center gap-2">
            <div className={cn("w-1 h-3 rounded-full", color)} />
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
        isLastInSection && "border-b-2 border-b-slate-200 dark:border-b-slate-800"
    )}>
      {/* Label Indicateur */}
      <td className="px-4 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-50 dark:bg-slate-800 rounded-md shrink-0">
            {icon}
          </div>
          <span className="truncate whitespace-nowrap">{label}</span>
        </div>
      </td>

      {/* TOTAL GLOBAL */}
      <td className="px-4 py-1.5 text-right font-mono font-bold text-[11px] text-indigo-600 bg-indigo-50/5 tabular-nums min-w-[110px] border-r border-indigo-100/30">
        {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
      </td>

      {/* VALEURS PAR SHOP */}
      {shops.map((shop: any) => {
        const val = values[shop.id] || 0;
        return (
          <td key={shop.id} className="px-4 py-1.5 text-right font-mono text-[11px] text-slate-600 dark:text-slate-500 tabular-nums min-w-[100px] border-r border-slate-50 dark:border-slate-800 last:border-r-0">
            {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
          </td>
        );
      })}
    </tr>
  );
}