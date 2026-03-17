// app/analyse-beauty/by-product/ProductListManager.tsx
'use client'

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { GroupedProduct, loadMoreProducts } from '../data-fetcher';
import GroupedProductTable from './ProductTable';

export default function ProductListManager({ initialData }: { initialData: GroupedProduct[] }) {
  const [data, setData] = useState<GroupedProduct[]>(initialData);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length === 50);

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const newData = await loadMoreProducts(page);
      if (newData.length < 50) {
        setHasMore(false);
      }
      setData([...data, ...newData]);
      setPage(page + 1);
    } catch (error) {
      console.error("Erreur chargement:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* On réutilise votre tableau accordéon */}
      <GroupedProductTable initialData={data} />

      {hasMore && (
        <div className="flex justify-center py-8">
          <button 
            onClick={handleLoadMore}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-pink-300 transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Chargement...
              </>
            ) : (
              "Charger plus de modèles"
            )}
          </button>
        </div>
      )}
      
      {!hasMore && data.length > 0 && (
        <p className="text-center text-gray-400 text-xs italic py-8">
          Tous les modèles ont été chargés.
        </p>
      )}
    </div>
  );
}