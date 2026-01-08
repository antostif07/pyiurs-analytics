"use client";

import React from "react";
import { HeatmapData } from "../actions/analytics";

// Heures d'ouverture (pour ne pas afficher 3h du matin si inutile)
const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;

export default function SalesHeatmap({ data }: { data: HeatmapData[] }) {
  
  // Trouver la valeur max pour calculer l'opacité (échelle relative)
  const maxVal = Math.max(...data.flatMap(d => d.hours));

  // Générer les heures d'affichage
  const displayHours = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => i + OPEN_HOUR);

  const getColor = (value: number) => {
    if (value === 0) return "bg-slate-50";
    const intensity = value / maxVal;
    // Dégradé de bleu/indigo
    if (intensity < 0.2) return "bg-indigo-100";
    if (intensity < 0.4) return "bg-indigo-300";
    if (intensity < 0.6) return "bg-indigo-500";
    if (intensity < 0.8) return "bg-indigo-700";
    return "bg-indigo-900";
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Header Heures */}
        <div className="flex mb-2">
          <div className="w-16"></div> {/* Spacer jours */}
          {displayHours.map(h => (
            <div key={h} className="flex-1 text-center text-xs text-slate-400 font-mono">
              {h}h
            </div>
          ))}
        </div>

        {/* Grille */}
        <div className="space-y-1">
          {data.map((row) => (
            <div key={row.day} className="flex items-center">
              {/* Label Jour */}
              <div className="w-16 text-xs font-bold text-slate-600 uppercase">{row.day}</div>
              
              {/* Cellules */}
              {displayHours.map(h => {
                const val = row.hours[h] || 0;
                return (
                  <div key={h} className="flex-1 h-8 px-0.5 relative group">
                    <div 
                        className={`w-full h-full rounded-sm transition-colors ${getColor(val)}`}
                    ></div>
                    
                    {/* Tooltip au survol */}
                    {val > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {val} ventes
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Légende */}
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
           <span>Faible</span>
           <div className="flex gap-1">
              <div className="w-3 h-3 bg-indigo-100 rounded"></div>
              <div className="w-3 h-3 bg-indigo-300 rounded"></div>
              <div className="w-3 h-3 bg-indigo-500 rounded"></div>
              <div className="w-3 h-3 bg-indigo-700 rounded"></div>
              <div className="w-3 h-3 bg-indigo-900 rounded"></div>
           </div>
           <span>Forte Affluence</span>
        </div>
      </div>
    </div>
  );
}