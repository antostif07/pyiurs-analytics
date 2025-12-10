"use client";

import { useState, useEffect } from "react";
import { Settings, Loader2, Calendar } from "lucide-react";
import { getSalesTarget, updateSalesTarget } from "../actions/targets";

export default function TargetEditor({ 
  currentTarget, 
  currentMonth, 
  currentYear 
}: { 
  currentTarget: number, 
  currentMonth: number, 
  currentYear: number 
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // États
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [value, setValue] = useState<string>("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
      // Sécurité : on s'assure que c'est une string, même si currentTarget est 0 ou undefined
      setValue(String(currentTarget ?? "")); 
    }
  }, [isOpen, currentMonth, currentYear, currentTarget]);

  // --- EFFET 2 : Fetch quand on change la date DANS la modale ---
  useEffect(() => {
    if (!isOpen) return;

    // Si on est sur la date par défaut, on ne fetch pas, on a déjà la prop
    if (selectedMonth === currentMonth && selectedYear === currentYear) {
      setValue(String(currentTarget ?? ""));
      return;
    }

    const fetchTarget = async () => {
      setIsFetching(true);
      try {
        const amount = await getSalesTarget(selectedMonth, selectedYear);
        setValue(String(amount ?? ""));
      } catch (e) {
        setValue("0");
      } finally {
        setIsFetching(false);
      }
    };

    fetchTarget();
  }, [selectedMonth, selectedYear, isOpen, currentMonth, currentYear, currentTarget]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // On convertit la string en nombre, ou 0 si vide
    const numValue = value === "" ? 0 : Number(value);
    await updateSalesTarget(numValue, selectedMonth, selectedYear);
    setIsLoading(false);
    setIsOpen(false);
  };

  const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-full transition-colors"
        title="Gérer les objectifs"
      >
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600"/>
              <div>
                <h3 className="font-bold text-slate-900">Gestion des Objectifs</h3>
                <p className="text-xs text-slate-500">Définissez le budget par période.</p>
              </div>
            </div>
            
            {/* key={isOpen} force React à recréer le formulaire quand on ouvre */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5" key={isOpen ? 'open' : 'closed'}>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mois</label>
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {months.map((m, idx) => (
                            <option key={idx} value={idx + 1}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Année</label>
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-black focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {years.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Objectif CA ($)
                </label>
                <div className="relative">
                    <input
                        type="number"
                        // SECURITE ICI : On s'assure que value n'est jamais undefined ou null
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        disabled={isFetching}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg font-bold text-slate-900 disabled:opacity-50"
                    />
                    {isFetching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-slate-400"/>
                        </div>
                    )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={isLoading || isFetching}
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 disabled:opacity-70"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}