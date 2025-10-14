"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Filter, X, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

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
  filteredBrands?: string[]; // Marques filtrées selon les autres filtres
  filteredColors?: string[]; // Couleurs filtrées selon les autres filtres
}

export function CompactFilters({ 
  brands, 
  colors, 
  selectedBrand, 
  selectedColor, 
  selectedStock,
  stockLevels,
  filteredBrands = brands,
  filteredColors = colors
}: CompactFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

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

  const activeFiltersCount = [
    selectedBrand && selectedBrand !== 'all',
    selectedColor && selectedColor !== 'all', 
    selectedStock && selectedStock !== 'all'
  ].filter(Boolean).length;

  // Fonctions pour formater l'affichage des valeurs sélectionnées
  const getBrandDisplayValue = () => {
    if (!selectedBrand || selectedBrand === 'all') return "Toutes les marques";
    return selectedBrand;
  };

  const getColorDisplayValue = () => {
    if (!selectedColor || selectedColor === 'all') return "Toutes les gammes";
    return selectedColor;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* En-tête avec badge et actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filtres</h3>
          </div>
          
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {activeFiltersCount} actif{activeFiltersCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4 mr-1" />
              Tout effacer
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Plus de filtres
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filtres principaux - Design carte avec Combobox */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Carte Marque avec Combobox */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Marque
          </label>
          <Popover open={brandOpen} onOpenChange={setBrandOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={brandOpen}
                className="w-full justify-between bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                <span className="truncate">{getBrandDisplayValue()}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher une marque..." />
                <CommandList>
                  <CommandEmpty>Aucune marque trouvée.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        updateFilter('brand', 'all');
                        setBrandOpen(false);
                      }}
                    >
                      <span>Toutes les marques</span>
                      <Badge variant="outline" className="ml-2">
                        {filteredBrands.length}
                      </Badge>
                    </CommandItem>
                    {filteredBrands.map((brand) => (
                      <CommandItem
                        key={brand}
                        value={brand}
                        onSelect={() => {
                          updateFilter('brand', brand);
                          setBrandOpen(false);
                        }}
                      >
                        <span>{brand}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {filteredBrands.length} marque{filteredBrands.length > 1 ? 's' : ''} disponible{filteredBrands.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Carte Gamme avec Combobox */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Gamme
          </label>
          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={colorOpen}
                className="w-full justify-between bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                <span className="truncate">{getColorDisplayValue()}</span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher une gamme..." />
                <CommandList>
                  <CommandEmpty>Aucune gamme trouvée.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => {
                        updateFilter('color', 'all');
                        setColorOpen(false);
                      }}
                    >
                      <span>Toutes les gammes</span>
                      <Badge variant="outline" className="ml-2">
                        {filteredColors.length}
                      </Badge>
                    </CommandItem>
                    {filteredColors.map((color) => (
                      <CommandItem
                        key={color}
                        value={color}
                        onSelect={() => {
                          updateFilter('color', color);
                          setColorOpen(false);
                        }}
                      >
                        <span>{color}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {filteredColors.length} gamme{filteredColors.length > 1 ? 's' : ''} disponible{filteredColors.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Carte Stock (reste en select classique) */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Niveau de stock
          </label>
          <select 
            className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            value={selectedStock || 'all'}
            onChange={(e) => updateFilter('stock', e.target.value)}
          >
            <option value="all">Tous les stocks</option>
            <option value="out_of_stock" className="text-red-600">🔄 Rupture ({stockLevels.outOfStock})</option>
            <option value="critical" className="text-orange-600">⚠️ Critique ({stockLevels.critical})</option>
            <option value="low" className="text-yellow-600">📉 Faible ({stockLevels.low})</option>
            <option value="good" className="text-green-600">✅ Bon ({stockLevels.good})</option>
            <option value="over_5">{`📦 > 5 unités`}</option>
            <option value="over_10">{`📦 > 10 unités`}</option>
            <option value="over_20">{`📦 > 20 unités`}</option>
          </select>
        </div>
      </div>

      {/* Filtres étendus avec animation */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600 animate-in fade-in-50 duration-300">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtres avancés
          </h4>
          
          {/* Filtres rapides de stock */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Filtres rapides de stock
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'out_of_stock', label: 'Rupture', count: stockLevels.outOfStock, color: 'red' },
                { value: 'critical', label: 'Critique', count: stockLevels.critical, color: 'orange' },
                { value: 'low', label: 'Faible', count: stockLevels.low, color: 'yellow' },
                { value: 'good', label: 'Bon', count: stockLevels.good, color: 'green' },
              ].map(({ value, label, count, color }) => (
                <Button
                  key={value}
                  variant={selectedStock === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter('stock', value)}
                  className={
                    selectedStock === value 
                      ? `bg-${color}-100 text-${color}-800 dark:bg-${color}-900 dark:text-${color}-200 border-${color}-300 dark:border-${color}-700 hover:bg-${color}-200 dark:hover:bg-${color}-800`
                      : ''
                  }
                >
                  <span>{label}</span>
                  <Badge 
                    variant="secondary" 
                    className={`ml-2 ${
                      selectedStock === value 
                        ? `bg-${color}-200 dark:bg-${color}-800` 
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stockLevels.outOfStock}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">En rupture</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stockLevels.critical}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Critique</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stockLevels.low}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Faible</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stockLevels.good}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Bon</div>
            </div>
          </div>
        </div>
      )}

      {/* Indicateur visuel des filtres actifs */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filtres appliqués :</span>
            
            {selectedBrand && selectedBrand !== 'all' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Marque: {selectedBrand}
                <button 
                  onClick={() => updateFilter('brand', 'all')}
                  className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {selectedColor && selectedColor !== 'all' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Gamme: {selectedColor}
                <button 
                  onClick={() => updateFilter('color', 'all')}
                  className="ml-1 hover:text-green-900 dark:hover:text-green-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {selectedStock && selectedStock !== 'all' && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Stock: {selectedStock.replace('_', ' ')}
                <button 
                  onClick={() => updateFilter('stock', 'all')}
                  className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}