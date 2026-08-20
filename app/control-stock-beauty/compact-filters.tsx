"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Filter, X, SlidersHorizontal, Tag, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"

interface CompactFiltersProps {
  brands: string[];
  colors: string[];
  categories: string[];
  suppliers: string[]; // ✅ NOUVEAU
  selectedBrand?: string;
  selectedColor?: string;
  selectedStock?: string;
  selectedCategory?: string;
  selectedSupplier?: string; // ✅ NOUVEAU
  stockLevels: {
    outOfStock: number;
    critical: number;
    low: number;
    good: number;
  };
  filteredBrands?: string[];
  filteredColors?: string[];
  filteredCategories?: string[];
  filteredSuppliers?: string[]; // ✅ NOUVEAU
}

export function CompactFilters({
  brands,
  colors,
  categories,
  suppliers = [],
  selectedBrand,
  selectedColor,
  selectedStock,
  selectedCategory,
  selectedSupplier,
  stockLevels,
  filteredBrands = brands,
  filteredColors = colors,
  filteredCategories = categories,
  filteredSuppliers = suppliers
}: CompactFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false); // ✅ Popover state

  const updateFilter = (type: 'brand' | 'color' | 'category' | 'supplier' | 'stock', value: string) => {
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
    ['brand', 'color', 'category', 'supplier', 'stock'].forEach(param => url.searchParams.delete(param));
    window.location.href = url.toString();
  };

  const hasActiveFilters = (selectedBrand && selectedBrand !== 'all') ||
    (selectedColor && selectedColor !== 'all') ||
    (selectedCategory && selectedCategory !== 'all') ||
    (selectedSupplier && selectedSupplier !== 'all') ||
    (selectedStock && selectedStock !== 'all');

  const activeFiltersCount = [
    selectedBrand && selectedBrand !== 'all',
    selectedColor && selectedColor !== 'all',
    selectedCategory && selectedCategory !== 'all',
    selectedSupplier && selectedSupplier !== 'all', // ✅
    selectedStock && selectedStock !== 'all'
  ].filter(Boolean).length;

  const getBrandDisplayValue = () => (!selectedBrand || selectedBrand === 'all' ? "Toutes les marques" : selectedBrand);
  const getColorDisplayValue = () => (!selectedColor || selectedColor === 'all' ? "Toutes les gammes" : selectedColor);
  const getCategoryDisplayValue = () => (!selectedCategory || selectedCategory === 'all' ? "Toutes les catégories" : selectedCategory);
  const getSupplierDisplayValue = () => (!selectedSupplier || selectedSupplier === 'all' ? "Tous les fournisseurs" : selectedSupplier);

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

      {/* Grid dynamique 5 colonnes pour grands écrans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">

        {/* 1. Carte Catégorie */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3.5 border border-gray-200 dark:border-slate-600">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-blue-500" /> Catégorie
          </label>
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between bg-white dark:bg-slate-700 text-xs h-9">
                <span className="truncate">{getCategoryDisplayValue()}</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher catégorie..." />
                <CommandList>
                  <CommandEmpty>Aucune catégorie trouvée.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="all" onSelect={() => { updateFilter('category', 'all'); setCategoryOpen(false); }}>
                      Toutes les catégories
                    </CommandItem>
                    {filteredCategories.map((cat) => (
                      <CommandItem key={cat} value={cat} onSelect={() => { updateFilter('category', cat); setCategoryOpen(false); }}>
                        {cat}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* 2. Carte Fournisseur (NOUVEAU) */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3.5 border border-gray-200 dark:border-slate-600">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-purple-500" /> Fournisseur
          </label>
          <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between bg-white dark:bg-slate-700 text-xs h-9">
                <span className="truncate">{getSupplierDisplayValue()}</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher fournisseur..." />
                <CommandList>
                  <CommandEmpty>Aucun fournisseur trouvé.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="all" onSelect={() => { updateFilter('supplier', 'all'); setSupplierOpen(false); }}>
                      Tous les fournisseurs
                    </CommandItem>
                    {filteredSuppliers.map((sup) => (
                      <CommandItem key={sup} value={sup} onSelect={() => { updateFilter('supplier', sup); setSupplierOpen(false); }}>
                        {sup}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* 3. Carte Marque */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3.5 border border-gray-200 dark:border-slate-600">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Marque
          </label>
          <Popover open={brandOpen} onOpenChange={setBrandOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between bg-white dark:bg-slate-700 text-xs h-9">
                <span className="truncate">{getBrandDisplayValue()}</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher une marque..." />
                <CommandList>
                  <CommandEmpty>Aucune marque trouvée.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="all" onSelect={() => { updateFilter('brand', 'all'); setBrandOpen(false); }}>
                      Toutes les marques
                    </CommandItem>
                    {filteredBrands.map((brand) => (
                      <CommandItem key={brand} value={brand} onSelect={() => { updateFilter('brand', brand); setBrandOpen(false); }}>
                        {brand}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* 4. Carte Gamme */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3.5 border border-gray-200 dark:border-slate-600">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Gamme
          </label>
          <Popover open={colorOpen} onOpenChange={setColorOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between bg-white dark:bg-slate-700 text-xs h-9">
                <span className="truncate">{getColorDisplayValue()}</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher une gamme..." />
                <CommandList>
                  <CommandEmpty>Aucune gamme trouvée.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem value="all" onSelect={() => { updateFilter('color', 'all'); setColorOpen(false); }}>
                      Toutes les gammes
                    </CommandItem>
                    {filteredColors.map((color) => (
                      <CommandItem key={color} value={color} onSelect={() => { updateFilter('color', color); setColorOpen(false); }}>
                        {color}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* 5. Carte Niveau de Stock */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3.5 border border-gray-200 dark:border-slate-600">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Niveau de stock
          </label>
          <select
            className="w-full px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 h-9"
            value={selectedStock || 'all'}
            onChange={(e) => updateFilter('stock', e.target.value)}
          >
            <option value="all">Tous les stocks</option>
            <option value="out_of_stock">🔄 Rupture ({stockLevels.outOfStock})</option>
            <option value="critical">⚠️ Critique ({stockLevels.critical})</option>
            <option value="low">📉 Faible ({stockLevels.low})</option>
            <option value="good">✅ Bon ({stockLevels.good})</option>
            <option value="over_5">{`📦 > 5 unités`}</option>
            <option value="over_10">{`📦 > 10 unités`}</option>
            <option value="over_20">{`📦 > 20 unités`}</option>
          </select>
        </div>
      </div>

      {/* Indicateur visuel des filtres actifs avec Badge Fournisseur */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Filtres appliqués :</span>
            {selectedCategory && selectedCategory !== 'all' && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                Catégorie: {selectedCategory}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('category', 'all')} />
              </Badge>
            )}
            {selectedSupplier && selectedSupplier !== 'all' && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Fournisseur: {selectedSupplier}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('supplier', 'all')} />
              </Badge>
            )}
            {selectedBrand && selectedBrand !== 'all' && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Marque: {selectedBrand}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('brand', 'all')} />
              </Badge>
            )}
            {selectedColor && selectedColor !== 'all' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Gamme: {selectedColor}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('color', 'all')} />
              </Badge>
            )}
            {selectedStock && selectedStock !== 'all' && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                Stock: {selectedStock.replace('_', ' ')}
                <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => updateFilter('stock', 'all')} />
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}