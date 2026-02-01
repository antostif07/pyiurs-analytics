// components/SearchableSelect.tsx
'use client';
import { useState, useEffect, useRef } from 'react';

interface Option {
  id: number | string;
  name: string;
  sub?: string;
}

interface Props {
  loadOptions: (inputValue: string) => Promise<Option[]>; // Fonction de chargement API
  value: string | number;
  onChange: (val: string | number) => void;
  placeholder?: string;
  label?: string;
  defaultOptions?: Option[]; // Options initiales (facultatif)
}

export default function SearchableSelect({ loadOptions, value, onChange, placeholder, label, defaultOptions = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>(defaultOptions);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Pour afficher le nom de l'élément sélectionné même si la liste a changé
  const [selectedLabel, setSelectedLabel] = useState<string>('');

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Mettre à jour le label si la valeur change (pour l'affichage initial)
  useEffect(() => {
    if (value && defaultOptions.length > 0) {
        const found = defaultOptions.find(o => o.id == value);
        if (found) setSelectedLabel(found.name);
    }
  }, [value, defaultOptions]);

  // Logique de recherche avec "Debounce"
  useEffect(() => {
    if (!isOpen) return; // Ne pas chercher si fermé

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await loadOptions(search);
        setOptions(results);
      } catch (e) {
        console.error("Erreur recherche", e);
      } finally {
        setLoading(false);
      }
    }, 500); // Attend 500ms après la frappe

    return () => clearTimeout(timeoutId);
  }, [search, isOpen, loadOptions]);

  // Fermeture au clic dehors
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleSelect = (opt: Option) => {
      onChange(opt.id);
      setSelectedLabel(opt.name); // Mémoriser le nom affiché
      setIsOpen(false);
      setSearch(''); // Reset recherche
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {label && <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>}
      
      {/* Input Simulé */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border p-2 rounded text-sm bg-white cursor-pointer flex justify-between items-center shadow-sm hover:border-blue-400 min-h-[38px]"
      >
        <span className={selectedLabel || value ? 'text-gray-800' : 'text-gray-400'}>
          {selectedLabel || (value ? `ID: ${value}` : placeholder || "Sélectionner...")}
        </span>
        <span className="text-gray-400 text-xs">▼</span>
      </div>

      {/* Liste déroulante */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-white border mt-1 rounded shadow-lg max-h-60 overflow-auto">
          <input 
            type="text" 
            autoFocus
            className="w-full p-2 border-b text-sm focus:outline-none bg-gray-50 sticky top-0"
            placeholder="Tapez pour chercher dans Odoo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          
          {loading && (
             <div className="p-2 text-xs text-blue-500 text-center animate-pulse">Recherche en cours...</div>
          )}

          {!loading && options.length === 0 ? (
            <div className="p-2 text-xs text-gray-400 text-center">Aucun résultat trouvé</div>
          ) : (
            !loading && options.map(opt => (
              <div 
                key={opt.id}
                onClick={() => handleSelect(opt)}
                className={`p-2 text-sm cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0 ${opt.id == value ? 'bg-blue-100 font-bold' : ''}`}
              >
                <div>{opt.name}</div>
                {opt.sub && <div className="text-xs text-gray-400">{opt.sub}</div>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}