import { ControlStockBeautyModel } from "../types/ControlStockBeautyModel";
import { POSOrderLine } from "../types/pos";
import { mapOdooProduct, OdooProductTemplate } from "../types/product_template";
import { PurchaseOrder, PurchaseOrderLine } from "../types/purchase";
import { controlStockBeautyColumns } from "./columns";
import { CompactFilters } from "./compact-filters";
import { DataTable } from "./data-table";
import { Suspense } from "react";
import { TableSkeleton } from "./table-skeleton";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const dynamic = 'force-dynamic'

export interface ControlStockFemmeModel {
  name: string;
  brand: string;
  color: string;
  product_qty: number;
  qty_received: number;
  not_received: number;
  qty_sold: number;
  qty_available: number;
}

// Cache en mémoire avec invalidation après 5 minutes
const cachedData: {
  data: ControlStockBeautyModel[];
  brands: string[];
  colors: string[];
  timestamp: number;
} | null = null;

// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getPurchaseOrders(startDate: string, endDate: string) {
  const domain = `[["partner_id", "ilike", "P.FEM"], ["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order?fields=id,create_date,partner_id,name&domain=${domain}`,
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

async function getProductsByIds(productIds: number[]) {
  if (productIds.length === 0) {
    return { records: [] };
  }

  const domain = `[["product_variant_ids", "in", [${productIds.join(',')}]]]`;
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id,x_studio_many2one_field_21bvh,x_studio_many2one_field_QyelN,x_studio_many2one_field_Arl5D&domain=${domain}`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );

  if (!res.ok) {
    console.log(res);
    
    throw new Error("Erreur API Odoo - Produits par IDs");
  }

  return res.json();
}

async function getPurchaseOrderLinesByIds(purchaseOrderIds: number[]) {
  if (purchaseOrderIds.length === 0) {
    return { records: [] };
  }

  const domain = `[["order_id", "in", [${purchaseOrderIds.join(',')}]]]`;
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order.line?fields=id,order_id,product_id,product_qty,qty_received,price_unit,product_uom&domain=${domain}`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Lignes de commandes d'achat");
  }

  return res.json();
}

// Fonction de transformation des données
async function transformToControlStockModel(
  purchaseOrders: PurchaseOrder[],
  purchaseOrderLines: PurchaseOrderLine[],
  products: OdooProductTemplate[],
  posOrderLines: POSOrderLine[]
): Promise<ControlStockFemmeModel[]> {
  
  // Créer un map des produits par ID pour un accès rapide
  const productsMap = new Map<number, OdooProductTemplate>();
  products.forEach(product => {
    const pId = product.product_variant_id ? product.product_variant_id[0] : 0
    productsMap.set(pId, product);
  });
  
  // Créer un map des ventes par product_id
  const salesByProductId = new Map<number, number>();
  posOrderLines.forEach((line: POSOrderLine) => {
    const productId = line.product_id?.[0];
    if (productId) {
      const currentQty = salesByProductId.get(productId) || 0;
      salesByProductId.set(productId, currentQty + (line.qty || 0));
    }
  });
  // Grouper les lignes de commande par hs_code
  const linesByHsCode = new Map<string, {
    lines: PurchaseOrderLine[];
    productNames: Set<string>;
    brands: Set<string>;
    colors: Set<string>;
  }>();

  purchaseOrderLines.forEach((line: PurchaseOrderLine) => {
    const productId = line.product_id?.[0];
    if (!productId) return;
    
    const product = productsMap.get(productId);
    
    if (!product) return;
    
    const hsCode = product.hs_code || 'UNKNOWN';
    
    if (!linesByHsCode.has(hsCode)) {
      linesByHsCode.set(hsCode, {
        lines: [],
        productNames: new Set<string>(),
        brands: new Set<string>(),
        colors: new Set<string>()
      });
    }

    const hsCodeGroup = linesByHsCode.get(hsCode)!;
    hsCodeGroup.lines.push(line);
    
    // Ajouter les informations du produit
    if (product.name) {
      hsCodeGroup.productNames.add(product.name);
    }
    
    const brand = product.x_studio_many2one_field_21bvh?.[1];
    if (brand) {
      hsCodeGroup.brands.add(brand);
    }
    
    const color = product.x_studio_many2one_field_QyelN?.[1];
    if (color) {
      hsCodeGroup.colors.add(color);
    }
  });

  // Transformer les données groupées par hs_code
  const result: ControlStockFemmeModel[] = [];

  linesByHsCode.forEach((group, hsCode) => {
    // Calculer les quantités totales pour ce hs_code
    const product_qty = group.lines.reduce((sum, line) => sum + (line.product_qty || 0), 0);
    const qty_received = group.lines.reduce((sum, line) => sum + (line.qty_received || 0), 0);
    const not_received = product_qty - qty_received;

    // Calculer les ventes totales pour tous les produits de ce hs_code
    let qty_sold = 0;
    group.lines.forEach(line => {
      const productId = line.product_id?.[0];
      if (productId) {
        qty_sold += salesByProductId.get(productId) || 0;
      }
    });

    const qty_available = qty_received - qty_sold;

    // Préparer les noms pour l'affichage
    const productNames = Array.from(group.productNames);
    const displayName = productNames.length > 0 
      ? `${productNames[0]}${productNames.length > 1 ? ` +${productNames.length - 1} autres` : ''}`
      : 'Produit sans nom';

    // Gérer les marques et couleurs multiples
    const brands = Array.from(group.brands);
    const colors = Array.from(group.colors);
    
    const brand = brands.length > 0 
      ? `${brands[0]}${brands.length > 1 ? `, +${brands.length - 1}` : ''}`
      : 'Autres';
    
    const color = colors.length > 0 
      ? `${colors[0]}${colors.length > 1 ? `, +${colors.length - 1}` : ''}`
      : 'Non spécifié';

    result.push({
      name: hsCode, // Utiliser le hs_code comme nom principal
      brand,
      color,
      product_qty,
      qty_received,
      not_received,
      qty_sold,
      qty_available,
    });
  });

  return result;
}

async function getPOSOrderLines(startDate?: string, endDate?: string) {
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

async function getData(start_date?: string, end_date?: string): Promise<{
  data: ControlStockFemmeModel[];
  brands: string[];
  colors: string[];
}> {
  let startDate;
  let endDate;

  if(!start_date || !end_date) {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    startDate = format(currentMonthStart, 'yyyy-MM-dd');
    endDate = format(currentMonthEnd, 'yyyy-MM-dd');
  } else {
    startDate = start_date;
    endDate = end_date;
  }
  // 1. Récupérer les Purchase Orders
  const purchaseOrders = await getPurchaseOrders(startDate, endDate);

  // 2. Extraire tous les IDs des Purchase Orders
  const purchaseOrderIds = purchaseOrders.records.map((p: PurchaseOrder) => p.id);

  // 3. Récupérer les Purchase Order Lines avec les IDs des Purchase Orders
  const purchaseOrderLines = await getPurchaseOrderLinesByIds(purchaseOrderIds);

  // 4. Extraire tous les product_id des Purchase Order Lines
  const productIds = purchaseOrderLines.records
    .map((line: PurchaseOrderLine) => line.product_id?.[0])
    // .filter((id): id is number => id !== undefined && id !== null);

  // 5. Récupérer les produits correspondants
  const products = await getProductsByIds([productIds]);

  // 6. Récupérer les POS Order Lines pour les ventes
  const posOrderLines = await getPOSOrderLines(startDate, endDate);
  // console.log(`🛒 POS Order Lines récupérés: ${posOrderLines.records.length}`);

  // 7. Transformer les données en ControlStockFemmeModel
  const allData: ControlStockFemmeModel[] = await transformToControlStockModel(
    purchaseOrders.records,
    purchaseOrderLines.records,
    products.records,
    posOrderLines.records
  );

  // 8. Extraire les marques et couleurs
  const brandsSet = new Set<string>();
  const colorsSet = new Set<string>();

  allData.forEach(item => {
    if (item.brand) brandsSet.add(item.brand);
    if (item.color) colorsSet.add(item.color);
  });

  const brands = Array.from(brandsSet).sort();
  const colors = Array.from(colorsSet).sort();

  console.log(`✅ Données finales: ${allData.length} produits, ${brands.length} marques, ${colors.length} couleurs`);

  return {
    data: allData,
    brands,
    colors
  };
}

interface PageProps {
  searchParams: Promise<{
    brand?: string;
    color?: string;
    stock?: string;
    start_date?: string;
    end_date?: string;
  }>;
}

export default async function ControlStockBeautyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedBrand = params.brand;
  const selectedColor = params.color;
  const selectedStock = params.stock;
  const startDate = params.start_date;
  const endDate = params.end_date;
  
  const {data,} = await getData(startDate, endDate);
  
  // const { data: allData, brands, colors } = await getControlStockData();

  // Filtrer les données
  let filteredData: ControlStockBeautyModel[] = []; //allData;

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
                Control Stock Femme
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
            // brands={brands} 
            // colors={colors}
            brands={[]} colors={[]}
            selectedBrand={selectedBrand}
            selectedColor={selectedColor}
            selectedStock={selectedStock}
            stockLevels={stockLevels}
          />
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
              <DataTable columns={controlStockBeautyColumns} data={data} />
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