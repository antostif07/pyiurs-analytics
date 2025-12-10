"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Filter, X } from "lucide-react";

type HSCodeOption = {
  code: string;
  count: number;
};

export default function HSCodeMultiSelect({ options }: { options: HSCodeOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Lecture de l'URL pour l'état initial (ex: ?hs_codes=6204.42,6109.10)
  const paramValue = searchParams.get("hs_codes");
  const initialSelected = paramValue ? paramValue.split(",") : [];

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Synchroniser avec l'URL quand on clique "Appliquer" ou qu'on change la sélection
  // Ici on applique directement au changement pour plus de fluidité, ou au bouton Appliquer
  const applyFilters = (newSelection: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newSelection.length > 0) {
      params.set("hs_codes", newSelection.join(","));
    } else {
      params.delete("hs_codes");
    }
    router.push(`?${params.toString()}`);
  };

  const toggleOption = (code: string) => {
    const newSelection = selected.includes(code)
      ? selected.filter(s => s !== code)
      : [...selected, code];
    
    setSelected(newSelection);
  };

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      
      {/* Bouton Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full sm:w-64 flex items-center justify-between px-3 py-2 text-sm border rounded-lg shadow-sm transition-colors ${
          selected.length > 0 
            ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-medium" 
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Filter className="w-4 h-4" />
          {selected.length === 0 
            ? "Filtrer par HS Code" 
            : `${selected.length} code(s) sélectionné(s)`}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full sm:w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 origin-top-left">
          
          <div className="p-3 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
             <span className="text-xs font-bold text-slate-500 uppercase">Codes disponibles ({options.length})</span>
             {selected.length > 0 && (
               <button 
                 onClick={() => { setSelected([]); applyFilters([]); }}
                 className="text-xs text-red-500 hover:text-red-700 font-medium"
               >
                 Tout effacer
               </button>
             )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.code);
              return (
                <label 
                  key={opt.code} 
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    isSelected ? "bg-indigo-50 text-indigo-900" : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                    }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-mono">{opt.code}</span>
                  </div>
                  <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                    {opt.count}
                  </span>
                  
                  {/* Hidden Checkbox real input */}
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={isSelected}
                    onChange={() => toggleOption(opt.code)}
                  />
                </label>
              );
            })}
            
            {options.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                    Aucun code HS trouvé pour cette période.
                </div>
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => { applyFilters(selected); setIsOpen(false); }}
              className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Appliquer le filtre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}