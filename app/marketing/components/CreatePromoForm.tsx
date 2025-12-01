'use client'

import { useRef, useState } from 'react';
import { Tag, Loader2 } from 'lucide-react';
import MultiRefSelector from './MultiRefSelector';
import { createCustomPromo } from '../actions';

export default function CreatePromoForm({ refs }: { refs: any[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Tag size={20} className="text-black" /> Créer une Campagne
      </h2>

      <form 
        ref={formRef}
        action={async (formData) => {
          // Vérification client basique
          if(formData.getAll('hs_codes').length === 0) {
             alert("Veuillez sélectionner au moins une référence.");
             return;
          }

          setLoading(true);
          await createCustomPromo(formData);
          setLoading(false);
          formRef.current?.reset();
          // Idéalement, on devrait reset le state du MultiRefSelector aussi, 
          // mais pour faire simple on rechargera la page via le server action.
          window.location.reload(); 
        }}
        className="space-y-4"
      >
        {/* NOM CAMPAGNE */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Nom de la Campagne</label>
            <input 
                name="name" 
                type="text" 
                placeholder="Ex: Liquidation Robes & Tuniques" 
                className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                required
            />
        </div>

        {/* NOUVEAU SÉLECTEUR MULTIPLE */}
        <MultiRefSelector refs={refs} />

        {/* POURCENTAGE */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Réduction (%)</label>
            <div className="flex gap-3 mt-1">
                {[10, 20, 30, 50].map((p) => (
                    <label key={p} className="flex-1 cursor-pointer">
                        <input type="radio" name="discount" value={p} className="peer sr-only" required />
                        <div className="py-2 text-center bg-gray-50 border border-gray-100 rounded-lg peer-checked:bg-black peer-checked:text-white peer-checked:border-black transition-all font-bold text-sm">
                            -{p}%
                        </div>
                    </label>
                ))}
            </div>
        </div>

        <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-4"
        >
            {loading ? <Loader2 className="animate-spin" size={20}/> : "Lancer la Campagne"}
        </button>

      </form>
    </div>
  );
}