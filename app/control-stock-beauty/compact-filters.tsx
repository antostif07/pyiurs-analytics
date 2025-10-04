"use client"

import { useState } from "react"

interface CompactFiltersProps {
  brands: string[];
  colors: string[];
  selectedBrand?: string;
  selectedColor?: string;
  selectedStock?: string;
  stockLevels: {
    outOfStock: number;
    critical: number;
    low: number;
    good: number;
  };
}

export function CompactFilters({ 
  brands, 
  colors, 
  selectedBrand, 
  selectedColor, 
  selectedStock,
  stockLevels 
}: CompactFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (type: 'brand' | 'color' | 'stock', value: string) => {
    const url = new URL(window.location.href);
    
    if (value === 'all') {
      url.searchParams.delete(type);
    } else {
      url.searchParams.set(type, value);
    }
    
    window.location.href = url.toString();
  };

  const clearAllFilters = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('brand');
    url.searchParams.delete('color');
    url.searchParams.delete('stock');
    window.location.href = url.toString();
  };

  const hasActiveFilters = selectedBrand && selectedBrand !== 'all' || 
                          selectedColor && selectedColor !== 'all' || 
                          selectedStock && selectedStock !== 'all';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      {/* En-tête compact */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Filtres</h3>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Tout effacer
            </button>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {isExpanded ? 'Réduire' : 'Étendre'}
        </button>
      </div>

      {/* Filtres principaux toujours visibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Marque */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Marque
          </label>
          <select 
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700"
            value={selectedBrand || 'all'}
            onChange={(e) => updateFilter('brand', e.target.value)}
          >
            <option value="all">Toutes</option>
            {brands.slice(0, 10).map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        {/* Couleur */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gamme
          </label>
          <select 
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700"
            value={selectedColor || 'all'}
            onChange={(e) => updateFilter('color', e.target.value)}
          >
            <option value="all">Toutes</option>
            {colors.slice(0, 10).map(color => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
        </div>

        {/* Stock */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stock
          </label>
          <select 
            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700"
            value={selectedStock || 'all'}
            onChange={(e) => updateFilter('stock', e.target.value)}
          >
            <option value="all">Tous</option>
            <option value="out_of_stock">Rupture ({stockLevels.outOfStock})</option>
            <option value="critical">Critique ({stockLevels.critical})</option>
            <option value="low">Faible ({stockLevels.low})</option>
            <option value="good">Bon ({stockLevels.good})</option>
            <option value="over_5">{`> 5`}</option>
            <option value="over_10">{`> 10`}</option>
            <option value="over_20">{`> 20`}</option>
          </select>
        </div>
      </div>

      {/* Filtres étendus */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Marques étendues */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Toutes les marques
              </label>
              <div className="max-h-32 overflow-y-auto">
                <select 
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700"
                  value={selectedBrand || 'all'}
                  onChange={(e) => updateFilter('brand', e.target.value)}
                  size={5}
                >
                  <option value="all">Toutes les marques</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Couleurs étendues */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Toutes les couleurs
              </label>
              <div className="max-h-32 overflow-y-auto">
                <select 
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-slate-700"
                  value={selectedColor || 'all'}
                  onChange={(e) => updateFilter('color', e.target.value)}
                  size={5}
                >
                  <option value="all">Toutes les Gammes</option>
                  {colors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}