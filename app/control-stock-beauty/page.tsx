import { ControlStockBeautyModel } from "../types/ControlStockBeautyModel";
import { POSOrderLine } from "../types/pos";
import { mapOdooProduct, Product } from "../types/product_template";
import { PurchaseOrderLine } from "../types/purchase";
import { controlStockBeautyColumns } from "./columns";
import { CompactFilters } from "./compact-filters";
import { DataTable } from "./data-table";
import { Suspense } from "react";
import { TableSkeleton } from "./table-skeleton";

export const dynamic = 'force-dynamic'

// Cache en mémoire avec invalidation après 5 minutes
let cachedData: {
  data: ControlStockBeautyModel[];
  brands: string[];
  colors: string[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getProducts() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id,x_studio_many2one_field_21bvh,x_studio_many2one_field_QyelN,x_studio_many2one_field_Arl5D,description_pickingin&domain=[[\"categ_id\",\"ilike\",\"beauty\"]]`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );
  
  if (!res.ok) {
    throw new Error("Erreur API Odoo - Produits");
  }

  return res.json();
}

async function getPurchaseOrderLines() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order.line?fields=id,product_id,product_qty,qty_received,price_unit&domain=[["partner_id", "not in", [24099, 23705, 1, 23706, 23707, 23708, 27862]]]`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Commandes d'achat");
  }

  return res.json();
}

async function getPOSOrderLines() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,qty`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Ventes POS");
  }

  return res.json();
}

// Fonction pour extraire la marque du nom du produit
function extractBrandFromProduct(product: Product): string {
  const brand = product.marque || 'Autres';
  return brand;
}

// Fonction pour extraire la couleur du produit
function extractColorFromProduct(product: Product): string {
  const color = product.couleur || 'Non spécifié';
  return color;
}

async function getControlStockData(): Promise<{
  data: ControlStockBeautyModel[];
  brands: string[];
  colors: string[];
}> {
  // Vérifier le cache en mémoire
  if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
    console.log("📦 Utilisation des données en cache");
    return cachedData;
  }

  console.log("🔄 Chargement des données fraîches...");
  
  const [products, purchaseOrderLines, posOrderLines] = await Promise.all([
    getProducts(),
    getPurchaseOrderLines(),
    getPOSOrderLines()
  ]);

  const data = products.records.map(mapOdooProduct);
  const groupedData: ControlStockBeautyModel[] = [];
  const groupedMap = new Map<string, Product[]>();
  const brandsSet = new Set<string>();
  const colorsSet = new Set<string>();

  data.forEach((product: Product) => {
    const key = product.hs_code || "UNKNOWN";
    if (!groupedMap.has(key)) groupedMap.set(key, []);
    groupedMap.get(key)!.push(product);
    
    // Extraire et ajouter la marque
    const brand = extractBrandFromProduct(product);
    brandsSet.add(brand);
    
    // Extraire et ajouter la couleur
    const color = extractColorFromProduct(product);
    colorsSet.add(color);
  });

  groupedMap.forEach((productsGroup, hs_code) => {
    const label = productsGroup[0].name;
    const cleanName = label.split("[").shift()?.trim();
    const brand = extractBrandFromProduct(productsGroup[0]);
    const color = extractColorFromProduct(productsGroup[0]);
    const name = `${cleanName} - ${hs_code} - (${productsGroup[0].listPrice}$)`;

    const relatedLines = purchaseOrderLines.records.filter(
      (line: PurchaseOrderLine) =>
        line.product_id &&
        productsGroup.some((p) => p.productVariantId === line.product_id[0])
    );

    const relatedPosLines = posOrderLines.records.filter(
      (line: POSOrderLine) =>
        line.product_id &&
        productsGroup.some((p) => p.productVariantId === line.product_id[0])
    );

    const product_qty = relatedLines.reduce(
      (sum: number, line: PurchaseOrderLine) => sum + (line.product_qty || 0),
      0
    );
    const qty_received = relatedLines.reduce(
      (sum: number, line: PurchaseOrderLine) => sum + (line.qty_received || 0),
      0
    );
    const not_received = product_qty - qty_received;
    const qty_sold = relatedPosLines.reduce(
      (sum: number, line: POSOrderLine) => sum + (line.qty || 0),
      0
    );
    const qty_available = qty_received - qty_sold;

    groupedData.push({
      hs_code,
      name,
      brand,
      color,
      product_qty,
      qty_received,
      not_received,
      qty_sold,
      qty_available
    });
  });

  const brands = Array.from(brandsSet).sort();
  const colors = Array.from(colorsSet).sort();

  // Mettre en cache
  cachedData = {
    data: groupedData,
    brands,
    colors,
    timestamp: Date.now()
  };

  return cachedData;
}

interface PageProps {
  searchParams: Promise<{
    brand?: string;
    color?: string;
    stock?: string;
  }>;
}

export default async function ControlStockBeautyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedBrand = params.brand;
  const selectedColor = params.color;
  const selectedStock = params.stock;
  
  const { data: allData, brands, colors } = await getControlStockData();

  // Filtrer les données
  let filteredData = allData;

  // Filtre par marque
  if (selectedBrand && selectedBrand !== 'all') {
    filteredData = filteredData.filter(item => item.brand === selectedBrand);
  }

  // Filtre par couleur
  if (selectedColor && selectedColor !== 'all') {
    filteredData = filteredData.filter(item => item.color === selectedColor);
  }

  // Filtre par stock disponible
  if (selectedStock && selectedStock !== 'all') {
    switch (selectedStock) {
      case 'out_of_stock':
        filteredData = filteredData.filter(item => item.qty_available <= 0);
        break;
      case 'critical':
        filteredData = filteredData.filter(item => item.qty_available >= 1 && item.qty_available <= 5);
        break;
      case 'low':
        filteredData = filteredData.filter(item => item.qty_available >= 6 && item.qty_available <= 11);
        break;
      case 'good':
        filteredData = filteredData.filter(item => item.qty_available >= 12);
        break;
      case 'over_5':
        filteredData = filteredData.filter(item => item.qty_available > 5);
        break;
      case 'over_10':
        filteredData = filteredData.filter(item => item.qty_available > 10);
        break;
      case 'over_20':
        filteredData = filteredData.filter(item => item.qty_available > 20);
        break;
    }
  }

  // Calcul des métriques globales
  const totalProducts = filteredData.length;
  const totalAvailable = filteredData.reduce((sum, item) => sum + item.qty_available, 0);
  const totalSold = filteredData.reduce((sum, item) => sum + item.qty_sold, 0);

  // Statistiques par niveau de stock
  const stockLevels = {
    outOfStock: filteredData.filter(item => item.qty_available <= 0).length,
    critical: filteredData.filter(item => item.qty_available >= 1 && item.qty_available <= 5).length,
    low: filteredData.filter(item => item.qty_available >= 6 && item.qty_available <= 11).length,
    good: filteredData.filter(item => item.qty_available >= 12).length,
  };

  // Texte descriptif des filtres actifs
  const activeFilters = [];
  if (selectedBrand && selectedBrand !== 'all') activeFilters.push(selectedBrand);
  if (selectedColor && selectedColor !== 'all') activeFilters.push(selectedColor);
  if (selectedStock && selectedStock !== 'all') {
    const stockLabels = {
      'out_of_stock': 'Rupture',
      'critical': 'Critique',
      'low': 'Faible', 
      'good': 'Bon',
      'over_5': '> 5',
      'over_10': '> 10',
      'over_20': '> 20'
    };
    activeFilters.push(stockLabels[selectedStock as keyof typeof stockLabels]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                Control Stock Beauty
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm truncate">
                {activeFilters.length > 0 ? `Filtres: ${activeFilters.join(' • ')}` : 'Tous les produits'}
              </p>
            </div>
            
            {/* Stats principales compactes */}
            <div className="flex gap-3 mt-4 lg:mt-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalProducts}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Produits</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalAvailable}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dispo</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalSold}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Vendus</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Filtres compacts */}
        <div className="mb-6">
          <CompactFilters 
            brands={brands} 
            colors={colors}
            selectedBrand={selectedBrand}
            selectedColor={selectedColor}
            selectedStock={selectedStock}
            stockLevels={stockLevels}
          />
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Niveaux de Stock</h3>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 bg-gray-100 dark:bg-slate-700 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{stockLevels.outOfStock}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Rupture</div>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="text-lg font-bold text-red-700 dark:text-red-300">{stockLevels.critical}</div>
                <div className="text-xs text-red-600 dark:text-red-400">Critique</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">{stockLevels.low}</div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400">Faible</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-lg font-bold text-green-700 dark:text-green-300">{stockLevels.good}</div>
                <div className="text-xs text-green-600 dark:text-green-400">Bon</div>
              </div>
            </div>
          </div>

        {/* Table Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          {/* Table Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2 sm:mb-0">
                Inventaire des Produits
              </h2>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Données en temps réel</span>
              </div>
            </div>
          </div>

          {/* Table avec Suspense pour le loading */}
          <Suspense fallback={<TableSkeleton />}>
            <div className="p-4">
              <DataTable columns={controlStockBeautyColumns} data={filteredData} />
            </div>
          </Suspense>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {filteredData.length} produits • MAJ: {new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>

        {/* Légende compacte */}
        <div className="mt-4 bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-black rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Rupture</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Critique</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Faible</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Bon</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}