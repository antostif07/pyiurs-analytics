"use client";

import React, { useState, useEffect } from "react";
import { Calculator, AlertTriangle, CheckSquare, Square, Minus } from "lucide-react";
import { PromoCandidate } from "../actions/stocks";
import ProductImage from "@/app/marketing/components/ProductImage";

export default function PromoSimulator({ initialData }: { initialData: PromoCandidate[] }) {
  
  // 1. GESTION DE LA SÉLECTION
  // Par défaut, on sélectionne tout (pour montrer l'impact total immédiat)
  const [selectedIds, setSelectedIds] = useState<number[]>(initialData.map(d => d.id));
  
  // 2. GESTION DES REMISES
  const [discounts, setDiscounts] = useState<Record<number, number>>({});

  // Helpers Sélection
  const isAllSelected = selectedIds.length === initialData.length && initialData.length > 0;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < initialData.length;

  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(initialData.map(d => d.id));
  };

  const toggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Helper Remise
  const getDiscount = (id: number) => discounts[id] ?? 0;

  const updateDiscount = (id: number, val: number) => {
    setDiscounts(prev => ({ ...prev, [id]: val }));
    // Auto-select si on touche au slider
    if (!selectedIds.includes(id)) toggleSelectOne(id); 
  };

  // Action de Masse : Appliquer remise SEULEMENT à la sélection
  const applyBulkDiscount = (pct: number) => {
    const newDiscounts = { ...discounts };
    selectedIds.forEach(id => {
      newDiscounts[id] = pct;
    });
    setDiscounts(newDiscounts);
  };

  // --- CALCULS (Basés sur la sélection uniquement) ---
  const selectedItems = initialData.filter(item => selectedIds.includes(item.id));

  const totalCashRecoverable = selectedItems.reduce((acc, item) => {
    const disc = getDiscount(item.id);
    const priceDiscounted = item.price * (1 - disc / 100);
    return acc + (priceDiscounted * item.stock);
  }, 0);

  const totalMargin = selectedItems.reduce((acc, item) => {
    const disc = getDiscount(item.id);
    const priceDiscounted = item.price * (1 - disc / 100);
    const margin = (priceDiscounted - item.cost) * item.stock;
    return acc + margin;
  }, 0);

  const totalItemsCount = selectedItems.length;
  const totalStockCount = selectedItems.reduce((acc, item) => acc + item.stock, 0);

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. DASHBOARD FLOTTANT (Sticky Top si besoin, ici statique) */}
      <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Background deco */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6 text-indigo-300"/> Simulateur de Promo
          </h2>
          <p className="text-indigo-200 text-sm mt-1">
            <span className="font-bold text-white">{totalItemsCount}</span> produits sélectionnés ({totalStockCount} pièces).
          </p>
        </div>

        <div className="flex items-center gap-8 z-10">
           <div className="text-right">
             <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider">Cash Récupérable</div>
             <div className="text-3xl font-bold text-emerald-400">{totalCashRecoverable.toLocaleString()} $</div>
           </div>
           <div className="text-right border-l border-indigo-700 pl-8">
             <div className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider">Marge Nette Est.</div>
             <div className={`text-2xl font-bold ${totalMargin < 0 ? 'text-red-400' : 'text-white'}`}>
               {totalMargin.toLocaleString()} $
             </div>
           </div>
        </div>
      </div>

      {/* 2. BARRE D'ACTIONS DE MASSE */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-4 shadow-sm sticky top-2 z-20">
        <div className="flex items-center gap-3">
            <div className="flex items-center pl-3">
                <button 
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                >
                    {isAllSelected ? <CheckSquare className="w-5 h-5 text-indigo-600"/> : 
                     isIndeterminate ? <Minus className="w-5 h-5 text-indigo-600"/> : 
                     <Square className="w-5 h-5 text-slate-300"/>}
                    
                    {selectedIds.length > 0 ? `${selectedIds.length} sélectionnés` : "Tout sélectionner"}
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase mr-2 hidden md:inline-block">Appliquer à la sélection :</span>
            {[0, 20, 30, 50, 70].map(pct => (
            <button
                key={pct}
                onClick={() => applyBulkDiscount(pct)}
                disabled={selectedIds.length === 0}
                className="px-3 py-1.5 rounded-lg text-sm font-bold border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50 transition-all"
            >
                -{pct}%
            </button>
            ))}
        </div>
      </div>

      {/* 3. LISTE DES PRODUITS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="w-12 px-4 py-4 text-center">
                  {/* Checkbox Header (visuel seulement, action via barre d'outils) */}
                  <div className={`w-4 h-4 border rounded mx-auto ${isAllSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}></div>
              </th>
              <th className="px-4 py-4">Produit</th>
              <th className="px-4 py-4 text-center">Stock</th>
              <th className="px-4 py-4 text-right hidden md:table-cell">Prix Init.</th>
              <th className="px-4 py-4 w-64 text-center">Remise</th>
              <th className="px-4 py-4 text-right">Nouveau Prix</th>
              <th className="px-4 py-4 text-right">Marge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {initialData.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const currentDisc = getDiscount(item.id);
              const newPrice = item.price * (1 - currentDisc / 100);
              const margin = newPrice - item.cost;
              const isLoss = margin < 0;

              return (
                <tr 
                    key={item.id} 
                    className={`transition-colors group ${isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50 opacity-60 hover:opacity-100'}`}
                >
                  <td className="px-4 py-3 text-center">
                    <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-12 bg-white rounded border border-slate-100 overflow-hidden shrink-0">
                        <ProductImage src={item.image_url} alt={item.name} />
                      </div>
                      <div>
                        <div className={`font-semibold line-clamp-1 ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                           {item.hs_code} 
                           <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                           Coût: {item.cost.toFixed(2)}$
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700">
                    {item.stock}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 line-through hidden md:table-cell">
                    {item.price.toFixed(2)} $
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                      <input 
                        type="range" 
                        min="0" max="90" step="5"
                        value={currentDisc}
                        onChange={(e) => updateDiscount(item.id, Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className={`text-sm font-bold w-12 text-right ${currentDisc > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        -{currentDisc}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {newPrice.toFixed(2)} $
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={`font-medium flex items-center justify-end gap-1 ${isLoss ? 'text-red-600' : 'text-emerald-600'}`}>
                      {isLoss && <AlertTriangle className="w-3 h-3" />}
                      {margin > 0 ? '+' : ''}{margin.toFixed(2)} $
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}