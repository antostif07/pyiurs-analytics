"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductImage from "@/app/marketing/components/ProductImage";
import { CatalogProduct } from "../services";

interface CatalogGridClientProps {
  products: CatalogProduct[];
  initialPage: number;
}

export default function CatalogGridClient({ products, initialPage }: CatalogGridClientProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 24;

  // ✅ ASTUCE PRO : Si le serveur nous envoie de nouveaux produits (changement de filtre), on remet la page à 1
  useEffect(() => {
    setCurrentPage(1);
  },[products]);

  // Calcul instantané des produits à afficher
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;
  const currentProducts = products.slice(offset, offset + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    window.history.replaceState(null, '', `?${params.toString()}`);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
        <p className="text-slate-500">Aucun produit ne correspond à ces filtres.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 text-sm font-medium text-slate-500">
        {products.length} référence(s) trouvé(s)
      </div>

      {/* LA GRILLE (Affiche seulement les 24 du slice) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {currentProducts.map(product => (
          <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
            <div className="aspect-square bg-slate-50 relative overflow-hidden border-b border-slate-100 p-4">
              <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-300">
                <ProductImage src={product.imageUrl} alt={product.name} />
              </div>
              <div className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-bold rounded-lg shadow-sm backdrop-blur-md ${
                product.stockAvailable > 5 ? 'bg-emerald-500/90 text-white' : 
                product.stockAvailable > 0 ? 'bg-orange-500/90 text-white' : 'bg-red-500/90 text-white'
              }`}>
                {product.stockAvailable > 0 ? `${product.stockAvailable} en stock` : 'Rupture'}
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-bold text-slate-900 text-sm line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                {product.name}
              </h3>
              <div className="text-xs text-slate-500 space-y-1 mb-4 flex-1">
                <div className="flex justify-between"><span>Modèle:</span> <span className="font-mono text-slate-700">{product.hsCode}</span></div>
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100">
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{product.color}</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 line-clamp-1">
                    Tailles: {product.sizes.sort().join(', ')}
                  </span>
                </div>
              </div>
              <div className="mt-auto pt-3 border-t border-slate-100">
                <div className="text-lg font-black text-slate-900">
                  {product.price.toLocaleString('fr-FR', { style: 'currency', currency: 'USD' })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* LA PAGINATION CLIENT (Affichée seulement si > 1 page) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 bg-white border border-slate-200 rounded-xl mt-8 shadow-sm">
          <div className="text-sm text-slate-500 font-medium">
            Page <span className="text-slate-900">{currentPage}</span> sur <span className="text-slate-900">{totalPages}</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors text-sm font-medium"
            >
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}