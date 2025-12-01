'use client'

import { useState } from 'react';
import { Search, X, Plus } from 'lucide-react';
import clsx from 'clsx';

interface RefItem {
  hs_code: string;
  name: string;
  total_stock: number;
}

export default function MultiRefSelector({ refs }: { refs: RefItem[] }) {
  const [selected, setSelected] = useState<RefItem[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filtrer les refs disponibles (exclure celles déjà sélectionnées)
  const available = refs
    .filter(r => !selected.find(s => s.hs_code === r.hs_code))
    .filter(r => 
        r.name.toLowerCase().includes(search.toLowerCase()) || 
        r.hs_code.toLowerCase().includes(search.toLowerCase())
    );

  const addRef = (ref: RefItem) => {
    setSelected([...selected, ref]);
    setSearch('');
    // On garde le focus ou on ferme ? Laissons ouvert pour enchainer
  };

  const removeRef = (hs_code: string) => {
    setSelected(selected.filter(s => s.hs_code !== hs_code));
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-bold text-gray-500 uppercase">
        Produits / Références ({selected.length})
      </label>

      {/* 1. ZONE DES TAGS SÉLECTIONNÉS */}
      <div className="flex flex-wrap gap-2 min-h-[40px]">
        {selected.map((item) => (
          <span key={item.hs_code} className="inline-flex items-center gap-1 bg-black text-white text-xs px-2 py-1.5 rounded-lg animate-in fade-in zoom-in-95">
             <span className="font-bold">{item.hs_code}</span>
             <span className="opacity-70 max-w-[80px] truncate hidden sm:inline"> - {item.name}</span>
             <button type="button" onClick={() => removeRef(item.hs_code)} className="hover:text-red-300 ml-1">
                <X size={14} />
             </button>
             {/* INPUT CACHÉ POUR ENVOYER AU SERVEUR */}
             <input type="hidden" name="hs_codes" value={item.hs_code} />
          </span>
        ))}
        {selected.length === 0 && <span className="text-sm text-gray-400 italic py-1">Aucune référence sélectionnée</span>}
      </div>

      {/* 2. BARRE DE RECHERCHE */}
      <div className="relative">
        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={18} className="text-gray-400" />
            <input 
                type="text"
                placeholder="Chercher une référence..." 
                className="w-full p-3 bg-transparent border-none outline-none text-sm"
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value); 
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
            />
        </div>

        {/* 3. LISTE DÉROULANTE DES RÉSULTATS */}
        {isOpen && search.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {available.length === 0 ? (
                    <div className="p-3 text-xs text-gray-400 text-center">Aucun résultat</div>
                ) : (
                    available.map(ref => (
                        <div 
                            key={ref.hs_code}
                            onClick={() => addRef(ref)}
                            className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0"
                        >
                            <div>
                                <div className="font-bold text-sm text-gray-800">{ref.hs_code}</div>
                                <div className="text-xs text-gray-500 truncate w-48">{ref.name}</div>
                            </div>
                            <div className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">
                                {ref.total_stock} pcs
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
        
        {/* Masquer la liste si on clique dehors (simple trick: backdrop transparent) */}
        {isOpen && (
            <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)}></div>
        )}
      </div>
    </div>
  );
}