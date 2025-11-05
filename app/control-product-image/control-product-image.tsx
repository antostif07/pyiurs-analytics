'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from "next/link";
import { 
  useReactTable, 
  getCoreRowModel, 
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OdooProductTemplate } from '../types/product_template';

interface ProductsWithoutImagesClientProps {
  initialProducts: OdooProductTemplate[];
}

// Fonction pour obtenir les années et mois disponibles
function getAvailableDates(products: OdooProductTemplate[]) {
  const years = new Set<number>();
  const months = new Set<string>();
  
  products.forEach(product => {
    const date = new Date(product.create_date);
    const year = date.getFullYear();
    const month = date.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    
    years.add(year);
    months.add(month);
  });
  
  return {
    years: Array.from(years).sort((a, b) => b - a),
    months: Array.from(months).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  };
}

// Fonction pour formater la date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR');
}

// Composant pour les filtres de date
function DateFilters({ 
  years, 
  months, 
  selectedYear, 
  selectedMonth, 
  onYearChange, 
  onMonthChange 
}: {
  years: number[];
  months: string[];
  selectedYear: number | null;
  selectedMonth: string | null;
  onYearChange: (year: number | null) => void;
  onMonthChange: (month: string | null) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Filtre par année */}
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Année de création
        </label>
        <select
          value={selectedYear || ''}
          onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes les années</option>
          {years.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Filtre par mois */}
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mois de création
        </label>
        <select
          value={selectedMonth || ''}
          onChange={(e) => onMonthChange(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
          disabled={!selectedYear}
        >
          <option value="">Tous les mois</option>
          {months.map(month => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Composant pour le filtre par catégorie
function CategoryFilter({ 
  categories, 
  selectedCategories, 
  onCategoryChange 
}: {
  categories: string[];
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
}) {
  const toggleCategory = (category: string) => {
    const newSelected = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    onCategoryChange(newSelected);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Catégories
      </label>
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => toggleCategory(category)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategories.includes(category)
                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProductsWithoutImagesClient({ initialProducts }: ProductsWithoutImagesClientProps) {
  // États pour react-table
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'create_date', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  
  // États pour les filtres personnalisés
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Obtenir les dates et catégories disponibles
  const { years, months } = useMemo(() => 
    getAvailableDates(initialProducts), 
    [initialProducts]
  );

  const allCategories = useMemo(() => {
    const categories = new Set(initialProducts.map(p => p.categ_id[1]));
    return Array.from(categories).sort();
  }, [initialProducts]);

  // Préparer les données avec les filtres
  const filteredProducts = useMemo(() => {
    let filtered = initialProducts;

    // Filtre par année
    if (selectedYear) {
      filtered = filtered.filter(product => {
        const productYear = new Date(product.create_date).getFullYear();
        return productYear === selectedYear;
      });
    }

    // Filtre par mois (nécessite une année sélectionnée)
    if (selectedYear && selectedMonth) {
      filtered = filtered.filter(product => {
        const productDate = new Date(product.create_date);
        const productMonth = productDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
        return productMonth === selectedMonth;
      });
    }

    // Filtre par catégories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => 
        selectedCategories.includes(product.categ_id[1])
      );
    }

    // Filtre global (recherche texte)
    if (globalFilter) {
      const searchLower = globalFilter.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        // product.default_code?.toLowerCase().includes(searchLower) ||
        // product.x_studio_color?.toLowerCase().includes(searchLower) ||
        // product.x_studio_taille?.toLowerCase().includes(searchLower) ||
        product.categ_id[1].toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [initialProducts, selectedYear, selectedMonth, selectedCategories, globalFilter]);

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(() => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedCategories([]);
    setGlobalFilter('');
  }, []);

  // Export Excel
  const exportToExcel = useCallback(() => {
    const headers = [
      'ID Externe', 'Nom du Produit', 'Catégorie', 'Couleur', 'Taille', 
      'Lien Image', 'Date de Création', 'Statut Image'
    ];
    
    const csvData = filteredProducts.map(product => [
    //   product.default_code || 'N/A',
      `"${product.name}"`,
      `"${product.categ_id[1]}"`,
    //   product.x_studio_color || 'N/A',
    //   product.x_studio_taille || 'N/A',
    //   product.x_studio_lien_image || 'N/A',
    //   formatDate(product.create_date),
    //   product.image_1920 ? 'Avec image' : 'Sans image'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `produits_sans_images_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredProducts]);

  // Définition des colonnes
  const columns = useMemo<ColumnDef<OdooProductTemplate>[]>(() => [
    {
      accessorKey: 'default_code',
      header: 'ID Externe',
      cell: ({ row }) => (
        <div className="font-mono text-sm">
          {row.getValue('default_code') || (
            <span className="text-gray-400 italic">Non défini</span>
          )}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'name',
      header: 'Nom du Produit',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.getValue('name')}</p>
          <p className="text-sm text-gray-500">
            ID: {row.original.id}
          </p>
        </div>
      ),
      size: 300,
    },
    {
      accessorKey: 'categ_id',
      header: 'Catégorie',
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {row.original.categ_id[1]}
        </Badge>
      ),
      size: 150,
    },
    {
      accessorKey: 'x_studio_color',
      header: 'Couleur',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {/* {row.original.x_studio_color && (
            <>
              <div 
                className="w-4 h-4 rounded border"
                style={{ 
                  backgroundColor: row.original.x_studio_color,
                  borderColor: '#ccc'
                }}
              />
              <span>{row.original.x_studio_color}</span>
            </>
          )} */}
          {/* {!row.original.x_studio_color && (
            <span className="text-gray-400 italic">Non défini</span>
          )} */}
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: 'x_studio_taille',
      header: 'Taille',
      cell: ({ row }) => (
        <span className="font-medium">
          {/* {row.original.x_studio_taille || (
            <span className="text-gray-400 italic">Non définie</span>
          )} */}
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'x_studio_lien_image',
      header: 'Lien Image',
      cell: ({ row }) => (
        <div>
          {/* {row.original.x_studio_lien_image ? (
            <a 
              href={row.original.x_studio_lien_image}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
            >
              {row.original.x_studio_lien_image}
            </a>
          ) : (
            <span className="text-gray-400 italic">Aucun lien</span>
          )} */}
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'create_date',
      header: 'Date de Création',
      cell: ({ row }) => (
        <div className="text-right">
          <p className="text-gray-900">
            {formatDate(row.getValue('create_date'))}
          </p>
          <p className="text-sm text-gray-500">
            {new Date(row.getValue('create_date')).toLocaleDateString('fr-FR', { 
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'image_1920',
      header: 'Statut Image',
      cell: ({ row }) => (
        <Badge 
        //   variant={row.original.image_1920 ? "default" : "destructive"}
        //   className={row.original.image_1920 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
        >
          {/* {row.original.image_1920 ? '✅ Avec image' : '❌ Sans image'} */}
        </Badge>
      ),
      size: 120,
    },
  ], []);

  // Configuration de la table
  const table = useReactTable({
    data: filteredProducts,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  // Statistiques
  const stats = useMemo(() => {
    const productsByCategory: Record<string, number> = {};
    const productsByYear: Record<number, number> = {};
    
    initialProducts.forEach(product => {
      // Par catégorie
      const category = product.categ_id[1];
      productsByCategory[category] = (productsByCategory[category] || 0) + 1;
      
      // Par année
      const year = new Date(product.create_date).getFullYear();
      productsByYear[year] = (productsByYear[year] || 0) + 1;
    });

    return {
      totalProducts: initialProducts.length,
      productsWithoutImages: initialProducts.filter(p => !p.image_1920).length,
      productsByCategory,
      productsByYear,
      categoriesCount: Object.keys(productsByCategory).length
    };
  }, [initialProducts]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </Link>
              
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Produits sans Images
                </h1>
                <p className="text-gray-600 mt-2">
                  {stats.productsWithoutImages.toLocaleString()} produits sans image sur {stats.totalProducts.toLocaleString()} total • 
                  {stats.categoriesCount} catégories
                </p>
                <p className="text-sm text-gray-500">
                  Gestion des produits templates Odoo sans image
                </p>
              </div>
            </div>

            {/* Bouton d'export */}
            <div className="mt-4 lg:mt-0">
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exporter Excel ({filteredProducts.length.toLocaleString()})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Total Produits</p>
              <p className="text-2xl font-bold">{stats.totalProducts.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">
                {stats.categoriesCount} catégories
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Sans Images</p>
              <p className="text-2xl font-bold">{stats.productsWithoutImages.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">
                {((stats.productsWithoutImages / stats.totalProducts) * 100).toFixed(1)}% du total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Avec Images</p>
              <p className="text-2xl font-bold">{(stats.totalProducts - stats.productsWithoutImages).toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">
                {(((stats.totalProducts - stats.productsWithoutImages) / stats.totalProducts) * 100).toFixed(1)}% du total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Filtrés</p>
              <p className="text-2xl font-bold">{filteredProducts.length.toLocaleString()}</p>
              <p className="text-xs opacity-80 mt-1">
                {((filteredProducts.length / stats.totalProducts) * 100).toFixed(1)}% du total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              {/* En-tête des filtres */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Rechercher un produit, ID externe, couleur, taille..."
                    value={globalFilter ?? ''}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Bouton reset */}
                {(selectedYear || selectedMonth || selectedCategories.length > 0 || globalFilter) && (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
                  >
                    Réinitialiser
                  </button>
                )}

                <div className="text-sm text-gray-500">
                  {filteredProducts.length.toLocaleString()} résultats
                </div>
              </div>

              {/* Filtres par date */}
              <DateFilters
                years={years}
                months={months}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onYearChange={setSelectedYear}
                onMonthChange={setSelectedMonth}
              />

              {/* Filtre par catégorie */}
              <CategoryFilter
                categories={allCategories}
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
              />

              {/* Résumé des filtres actifs */}
              {(selectedYear || selectedMonth || selectedCategories.length > 0) && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Filtres actifs : 
                    {selectedYear && (
                      <span className="ml-2">
                        Année: {selectedYear}
                      </span>
                    )}
                    {selectedMonth && (
                      <span className="ml-2">
                        Mois: {selectedMonth}
                      </span>
                    )}
                    {selectedCategories.length > 0 && (
                      <span className="ml-2">
                        Catégories: {selectedCategories.slice(0, 3).join(', ')}
                        {selectedCategories.length > 3 && `... (+${selectedCategories.length - 3})`}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table React Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Liste des Produits sans Images</span>
              <span className="text-sm font-normal text-gray-500">
                Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount().toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                      {headerGroup.headers.map(header => (
                        <th 
                          key={header.id} 
                          className="text-left py-4 px-6 text-sm font-semibold text-gray-900"
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none flex items-center'
                                  : '',
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.original.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map(cell => (
                        <td 
                          key={cell.id} 
                          className="py-4 px-6"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination React Table */}
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Affichage de {table.getRowModel().rows.length} produits sur {table.getFilteredRowModel().rows.length.toLocaleString()}
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  
                  <span className="text-sm text-gray-500">
                    Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount().toLocaleString()}
                  </span>
                  
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}