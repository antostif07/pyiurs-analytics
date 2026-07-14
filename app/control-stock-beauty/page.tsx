import { controlStockBeautyColumns } from "./columns";
import { CompactFilters } from "./compact-filters";
import { Suspense } from "react";
import { TableSkeleton } from "./table-skeleton";
import Link from "next/link";
import { ExpandableDataTable } from "./data-table";
import { fetchAndProcessStockData, } from "./services";
import { Legend } from "./components/legend";
import { LevelCard } from "./components/level-card";
import { ExportExcelButton } from "./components/export-excel-button";

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    brand?: string;
    color?: string;
    category?: string; // Ajouté
    stock?: string;
  }>;
}

export default async function ControlStockBeautyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedBrand = params.brand;
  const selectedColor = params.color;
  const selectedCategory = params.category; // Ajouté
  const selectedStock = params.stock;

  const { data: allData, brands, colors, categories } = await fetchAndProcessStockData();

  let filteredData = allData;

  if (selectedBrand && selectedBrand !== 'all') {
    filteredData = filteredData.filter(item => item.brand === selectedBrand);
  }

  if (selectedColor && selectedColor !== 'all') {
    filteredData = filteredData.filter(item => item.color === selectedColor);
  }

  // Nouveau filtre catégorie
  if (selectedCategory && selectedCategory !== 'all') {
    filteredData = filteredData.filter(item => item.category === selectedCategory);
  }

  if (selectedStock && selectedStock !== 'all') {
    switch (selectedStock) {
      case 'out_of_stock': filteredData = filteredData.filter(item => item.qty_available <= 0); break;
      case 'critical': filteredData = filteredData.filter(item => item.qty_available >= 1 && item.qty_available <= 5); break;
      case 'low': filteredData = filteredData.filter(item => item.qty_available >= 6 && item.qty_available <= 11); break;
      case 'good': filteredData = filteredData.filter(item => item.qty_available >= 12); break;
      case 'over_5': filteredData = filteredData.filter(item => item.qty_available > 5); break;
      case 'over_10': filteredData = filteredData.filter(item => item.qty_available > 10); break;
      case 'over_20': filteredData = filteredData.filter(item => item.qty_available > 20); break;
    }
  }

  // Calcul des options filtrées (Cross-filtering)
  const getFilteredOptions = () => {
    let dataForBrands = allData;
    let dataForColors = allData;
    let dataForCategories = allData;

    // Pour les marques : on filtre par couleur et catégorie
    if (selectedColor && selectedColor !== 'all') dataForBrands = dataForBrands.filter(item => item.color === selectedColor);
    if (selectedCategory && selectedCategory !== 'all') dataForBrands = dataForBrands.filter(item => item.category === selectedCategory);

    // Pour les couleurs : on filtre par marque et catégorie
    if (selectedBrand && selectedBrand !== 'all') dataForColors = dataForColors.filter(item => item.brand === selectedBrand);
    if (selectedCategory && selectedCategory !== 'all') dataForColors = dataForColors.filter(item => item.category === selectedCategory);

    // Pour les catégories : on filtre par marque et couleur
    if (selectedBrand && selectedBrand !== 'all') dataForCategories = dataForCategories.filter(item => item.brand === selectedBrand);
    if (selectedColor && selectedColor !== 'all') dataForCategories = dataForCategories.filter(item => item.color === selectedColor);

    return {
      filteredBrands: [...new Set(dataForBrands.map(item => item.brand))].sort(),
      filteredColors: [...new Set(dataForColors.map(item => item.color))].sort(),
      filteredCategories: [...new Set(dataForCategories.map(item => item.category))].sort()
    };
  };

  const { filteredBrands, filteredColors, filteredCategories } = getFilteredOptions();

  // Metrics UI
  const totalProducts = filteredData.length;
  const totalAvailable = filteredData.reduce((sum, item) => sum + item.qty_available, 0);
  const totalSold = filteredData.reduce((sum, item) => sum + item.qty_sold, 0);

  const stockLevels = {
    outOfStock: filteredData.filter(item => item.qty_available <= 0).length,
    critical: filteredData.filter(item => item.qty_available >= 1 && item.qty_available <= 5).length,
    low: filteredData.filter(item => item.qty_available >= 6 && item.qty_available <= 11).length,
    good: filteredData.filter(item => item.qty_available >= 12).length,
  };

  const activeFilters = [];
  if (selectedCategory && selectedCategory !== 'all') activeFilters.push(selectedCategory);
  if (selectedBrand && selectedBrand !== 'all') activeFilters.push(selectedBrand);
  if (selectedColor && selectedColor !== 'all') activeFilters.push(selectedColor);
  if (selectedStock && selectedStock !== 'all') activeFilters.push(selectedStock);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 flex min-w-0">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                ← Retour
              </Link>
              <div className="flex-1 min-w-0 ml-4">
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  Control Stock Beauty
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm truncate">
                  {activeFilters.length > 0 ? `Filtres: ${activeFilters.join(' • ')}` : 'Tous les produits'}
                </p>
              </div>
            </div>

            <div className="flex gap-6 mt-4 lg:mt-0">
              <StatBadge label="Produits" value={totalProducts} colorClass="text-blue-600 dark:text-blue-400" />
              <StatBadge label="Dispo" value={totalAvailable} colorClass="text-green-600 dark:text-green-400" />
              <StatBadge label="Vendus" value={totalSold} colorClass="text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <CompactFilters
            brands={brands}
            colors={colors}
            categories={categories} // Ajouté
            selectedBrand={selectedBrand}
            selectedColor={selectedColor}
            selectedCategory={selectedCategory} // Ajouté
            selectedStock={selectedStock}
            stockLevels={stockLevels}
            filteredBrands={filteredBrands}
            filteredColors={filteredColors}
            filteredCategories={filteredCategories} // Ajouté
          />
        </div>

        <StockLevelGrid stockLevels={stockLevels} />

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden mt-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Inventaire des Produits
            </h2>
            <ExportExcelButton data={filteredData} />
          </div>

          <Suspense fallback={<TableSkeleton />}>
            <div className="p-4">
              <ExpandableDataTable columns={controlStockBeautyColumns} data={filteredData} />
            </div>
          </Suspense>

          <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {filteredData.length} produits affichés
            </p>
          </div>
        </div>

        <Legend />
      </div>
    </main>
  );
}

// --- Composants UI internes ---

function StatBadge({ label, value, colorClass }: { label: string, value: number, colorClass: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${colorClass}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function StockLevelGrid({ stockLevels }: { stockLevels: any }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Aperçu rapide des stocks</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LevelCard value={stockLevels.outOfStock} label="Rupture" bg="bg-gray-100 dark:bg-slate-700" text="text-gray-900 dark:text-gray-100" />
        <LevelCard value={stockLevels.critical} label="Critique" bg="bg-red-50 dark:bg-red-900/20" text="text-red-700 dark:text-red-300" />
        <LevelCard value={stockLevels.low} label="Faible" bg="bg-yellow-50 dark:bg-yellow-900/20" text="text-yellow-700 dark:text-yellow-300" />
        <LevelCard value={stockLevels.good} label="Bon" bg="bg-green-50 dark:bg-green-900/20" text="text-green-700 dark:text-green-300" />
      </div>
    </div>
  );
}