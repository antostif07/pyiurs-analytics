"use client";

import { useState } from "react";
import { Settings, Loader2 } from "lucide-react";
import { updateSalesTarget } from "../actions/targets";

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
  const [value, setValue] = useState(currentTarget.toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    await updateSalesTarget(Number(value), currentMonth, currentYear);
    
    setIsLoading(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Bouton Déclencheur (Petit engrenage discret) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="p-1.5 text-indigo-200 hover:text-white hover:bg-indigo-800 rounded-full transition-colors"
        title="Modifier l'objectif"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Modale */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Objectif Mensuel</h3>
              <p className="text-xs text-slate-500">Définissez le CA cible pour ce mois.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant ($)
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg font-bold text-slate-900"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 disabled:opacity-70"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}