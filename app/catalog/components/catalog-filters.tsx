"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Barcode, Hash, FolderTree, Tags, RotateCcw } from "lucide-react";
import { PosCategory, ProductCategory } from "../services";

interface CatalogFiltersProps {
  posCategories: PosCategory[];
  productCategories: ProductCategory[]; // ✅ NOUVEAU
  activePosCategoryId: string;
}

export default function CatalogFilters({ posCategories, productCategories, activePosCategoryId }: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("query") || "");
  const[posCategory, setPosCategory] = useState(activePosCategoryId);
  const [categoryId, setCategoryId] = useState(searchParams.get("categoryId") || ""); // ✅ NOUVEAU
  const [hsCode, setHsCode] = useState(searchParams.get("hsCode") || "");
  const [barcode, setBarcode] = useState(searchParams.get("barcode") || "");
  const [color, setColor] = useState(searchParams.get("color") || "");
  const [size, setSize] = useState(searchParams.get("size") || "");

  const handleReset = () => {
    setQuery("");
    setCategoryId("");
    setHsCode("");
    setBarcode("");
    setColor("");
    setSize("");
    if (posCategories.length > 0) setPosCategory(posCategories[0].id.toString());
    router.push(pathname);
  };

  // ✅ PRO UX: Gérer le changement de Catégorie POS
  const handlePosCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPosCategory(e.target.value);
    setCategoryId(""); // On vide la sous-catégorie car elle n'existe peut-être pas dans ce nouveau parent
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (query) params.set("query", query); else params.delete("query");
      if (posCategory) params.set("posCategory", posCategory); else params.delete("posCategory");
      // ✅ AJOUT DANS L'URL
      if (categoryId) params.set("categoryId", categoryId); else params.delete("categoryId");
      if (hsCode) params.set("hsCode", hsCode); else params.delete("hsCode");
      if (barcode) params.set("barcode", barcode); else params.delete("barcode");
      if (color) params.set("color", color); else params.delete("color");
      if (size) params.set("size", size); else params.delete("size");

      const newUrl = `?${params.toString()}`;
      if (`?${searchParams.toString()}` !== newUrl) {
        router.push(newUrl);
      }
    }, 500);

    return () => clearTimeout(timer);
  },[query, posCategory, categoryId, hsCode, barcode, color, size, router, searchParams]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
          Filtres Rapides
        </div>
        {(query || categoryId || hsCode || barcode || color || size) && (
          <button onClick={handleReset} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50">
            <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
         <div className="relative col-span-1 lg:col-span-2">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input type="text" placeholder="Rechercher un modèle..." value={query} onChange={e => setQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
         </div>
         
         {/* 1er Menu (Catégorie POS) */}
         <div className="relative">
           <FolderTree className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
           <select 
             value={posCategory} 
             onChange={handlePosCategoryChange} 
             className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white font-medium"
           >
             {posCategories.map(c => (
               <option key={c.id} value={c.id.toString()}>{c.name}</option>
             ))}
           </select>
         </div>

         {/* ✅ NOUVEAU: 2ème Menu (Sous-catégorie) dépendant du premier */}
         <div className="relative">
           <Tags className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
           <select 
             value={categoryId} 
             onChange={e => setCategoryId(e.target.value)} 
             className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
           >
             <option value="">Toutes les sous-catégories</option>
             {productCategories.map(c => (
               <option key={c.id} value={c.id.toString()}>{c.name}</option>
             ))}
           </select>
         </div>

         <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="HS Code..." value={hsCode} onChange={e => setHsCode(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div>
         <input type="text" placeholder="Couleur..." value={color} onChange={e => setColor(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
         <input type="text" placeholder="Taille..." value={size} onChange={e => setSize(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
      </div>
    </div>
  );
}