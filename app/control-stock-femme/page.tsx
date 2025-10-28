import { POSOrderLine } from "../types/pos";
import { OdooProductTemplate } from "../types/product_template";
import { PurchaseOrder, PurchaseOrderLine } from "../types/purchase";
import { controlStockBeautyColumns } from "./columns";
import { CompactFilters } from "./compact-filters";
import { DataTable } from "./data-table";
import { Suspense } from "react";
import { TableSkeleton } from "./table-skeleton";
import { endOfMonth, format, isBefore, startOfMonth } from "date-fns";
import Link from "next/link";
import { formatTimeShort } from "@/lib/format-time-short";
import { StockQuant } from "../types/stock";
import { extractBoutiqueCode } from "@/lib/utils";

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
  imageUrl: string;
  age: string,
  stock_24: number;
  stock_ktm: number;
  stock_lmb: number;
  stock_mto: number;
  stock_onl: number;
  stock_dc: number;
  stock_other: number;
}

// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// async function getStockLocations() {
//   const res = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/stock.location?fields=id,name,complete_name,active`,
//     { 
//       next: { 
//         revalidate: 300
//       } 
//     }
//   );

//   if (!res.ok) {
//     throw new Error("Erreur API Odoo - Stock Location");
//   }

//   return res.json();
// }

async function getStockQuantsForProducts(productIds: number[]): Promise<{ records: StockQuant[], success: boolean }> {
  if (productIds.length === 0) return { records: [], success: true };;

  try {
    // Diviser en lots plus petits si nécessaire pour éviter les limites de taille
    const BATCH_SIZE = 500;
    const batches = [];
    
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      batches.push(productIds.slice(i, i + BATCH_SIZE));
    }

    const allResults = [];
    
    for (const batch of batches) {
      const domain = JSON.stringify([
        ['product_id', 'in', batch],
        ['location_id', 'not in', [5,4]],
      ])
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/stock.quant?fields=id,product_id,product_tmpl_id,location_id,quantity&domain=${domain}`,
        { 
          next: { 
            revalidate: 300
          } 
        }
      );

      if (!res.ok) {
        throw new Error(`Erreur lors de la récupération des stocks: ${res.statusText}`);
      }

      const batchResults = await res.json();
      
      allResults.push(...batchResults.records);
    }
    return {success: true, records: allResults};

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stocks quant:', error);
    return {records: [], success: false};
  }
}

async function getPurchaseOrders(startDate: string, endDate: string, partnerFilter?: string, orderNameFilter?: string) {
  let domain = `[["partner_id", "ilike", "P.FEM"], ["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
  
  // Ajouter les filtres optionnels
  if (partnerFilter) {
    domain = `[["partner_id", "ilike", "${partnerFilter}"], ["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
  }
  
  if (orderNameFilter) {
    domain = `[["name", "ilike", "${orderNameFilter}"], ["partner_id", "ilike", "P.FEM"], ["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
  }

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
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order.line?fields=id,order_id,product_id,product_qty,qty_received,price_unit,product_uom,write_date&domain=${domain}`,
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
  posOrderLines: POSOrderLine[],
  stockQuants: StockQuant[]
): Promise<ControlStockFemmeModel[]> {
  const allProductIds = products.map((product: OdooProductTemplate) => product.product_variant_id ? product.product_variant_id[0] : 0);

  // Créer une map des stocks par produit et par boutique
  const stockByProductAndBoutique = new Map<number, {
    P24: number;
    ktm: number;
    mto: number;
    lmb: number;
    onl: number;
    dc: number;
    other: number;
    total: number;
  }>();

  allProductIds.forEach((productId: number) => {
    stockByProductAndBoutique.set(productId, {
      P24: 0,
      ktm: 0,
      mto: 0,
      lmb: 0,
      onl: 0,
      dc: 0,
      other: 0,
      total: 0
    });
  });

  stockQuants.forEach((quant: StockQuant) => {
    const productId = quant.product_id[0];
    const locationName = quant.location_id[1];
    const quantity = quant.quantity;

    const boutiqueCode = extractBoutiqueCode(locationName);

    const currentStock = stockByProductAndBoutique.get(productId) || {
      P24: 0, ktm: 0, mto: 0, onl: 0, dc: 0, other: 0, total: 0, lmb: 0,
    };

    switch (boutiqueCode) {
      case 'P24':
        currentStock.P24 += quantity;
        break;
      case 'ktm':
        currentStock.ktm += quantity;
        break;
      case 'mto':
        currentStock.mto += quantity;
        break;
      case 'onl':
        currentStock.onl += quantity;
        break;
      case 'dc':
        currentStock.dc += quantity;
        break;
      default:
        currentStock.other += quantity;
        break;
    }

    currentStock.total += quantity;
    // console.log(locationName, boutiqueCode, quant.location_id[0], quant, currentStock);
    
    stockByProductAndBoutique.set(productId, currentStock);
  })
  
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
    category: string;
    price: string;
    imageUrl: string;
    age: string;
    stock: Array<{
      P24: number;
      ktm: number;
      mto: number;
      lmb: number;
      onl: number;
      dc: number;
      other: number;
      total: number;
    }>,
  }>();

  purchaseOrderLines.forEach((line: PurchaseOrderLine) => {
    let age = "";
    let lastdate;
    const productId = line.product_id?.[0];
    if (!productId) return;
    
    const product = productsMap.get(productId);
    
    if (!product) return;
    
    if(line.qty_received > 0) {
      if (lastdate) {
        const old = isBefore(new Date(lastdate), new Date(line.write_date))
        if(old) {
          age = formatTimeShort(lastdate)
        }
      } else {
        age = formatTimeShort(line.write_date)
      }
    }
    const hsCode = product.hs_code || 'UNKNOWN';
    const categ_id = product?.categ_id?.[1] ?? "";
    const category = categ_id.split("/").pop()?.trim() ?? "";
    const price = product.list_price;
    const imageUrl = `https://images.pyiurs.com/images/${hsCode}_${product.x_studio_many2one_field_Arl5D![1]}.jpg`;
    
    const stock = stockByProductAndBoutique.get(productId)
    
    if (!linesByHsCode.has(hsCode)) {
      linesByHsCode.set(hsCode, {
        lines: [],
        productNames: new Set<string>(),
        brands: new Set<string>(),
        colors: new Set<string>(),
        category: category,
        price: `${price} $`,
        imageUrl: imageUrl,
        age,
        stock: stock ? [stock] : []
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
    
    const color = product.x_studio_many2one_field_Arl5D?.[1];
    if (color) {
      hsCodeGroup.colors.add(color);
    }

    // Ajouter le stock
    if(stock) {
      hsCodeGroup.stock.push(stock)
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
      name: `${group.category} - ${hsCode} (${group.price})`, // Utiliser le hs_code comme nom principal
      brand,
      color,
      product_qty,
      qty_received,
      not_received,
      qty_sold,
      qty_available,
      imageUrl: group.imageUrl,
      age: group.age,
      stock_24: group.stock.reduce((acc, val) => {
        return acc + val.P24
      }, 0),
      stock_ktm: group.stock.reduce((acc, val) => {
        return acc + val.ktm
      }, 0),
      stock_dc: group.stock.reduce((acc, val) => {
        return acc + val.dc
      }, 0),
      stock_lmb: group.stock.reduce((acc, val) => {
        return acc + val.lmb
      }, 0),
      stock_mto: group.stock.reduce((acc, val) => {
        return acc + val.mto
      }, 0),
      stock_onl: group.stock.reduce((acc, val) => {
        return acc + val.onl
      }, 0),
      stock_other: 0,
    });
  });

  return result;
}

async function getPOSOrderLines(productIds: number[]) {
  if (productIds.length === 0) {
    return { records: [] };
  }

  const domain = `[["product_id", "in", [${productIds.join(',')}]]]`;
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,qty&domain=${domain}`,
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

async function getData(
  start_date?: string, 
  end_date?: string,
  partnerFilter?: string,
  orderNameFilter?: string
): Promise<{
  data: ControlStockFemmeModel[];
  brands: string[];
  colors: string[];
  partners: string[]; // Nouveau
  orderNames: string[]; // Nouveau
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

  // 1. Récupérer les Purchase Orders avec les nouveaux filtres
  const purchaseOrders = await getPurchaseOrders(startDate, endDate, partnerFilter, orderNameFilter);

  // 2. Extraire tous les IDs des Purchase Orders
  const purchaseOrderIds = purchaseOrders.records.map((p: PurchaseOrder) => p.id);

  // 3. Récupérer les Purchase Order Lines avec les IDs des Purchase Orders
  const purchaseOrderLines = await getPurchaseOrderLinesByIds(purchaseOrderIds);

  // 4. Extraire tous les product_id des Purchase Order Lines
  const productIds = purchaseOrderLines.records
    .map((line: PurchaseOrderLine) => line.product_id?.[0])
    .filter((id: number): id is number => id !== undefined && id !== null);

  // 5. Récupérer les produits correspondants
  const products = await getProductsByIds(productIds);

  // 6. Récupérer les POS Order Lines pour les ventes
  const posOrderLines = await getPOSOrderLines(productIds);

  // 7. Récupérer les stocks disponibles pour les produits
  const stockQuantsResponse = await getStockQuantsForProducts(productIds);

  if (!stockQuantsResponse.success) {
    console.error('❌ Échec de la récupération des stocks. Les quantités disponibles seront définies à 0.');
  }

  const stockQuants = stockQuantsResponse.records;

  // 8. Transformer les données en ControlStockFemmeModel
  const allData: ControlStockFemmeModel[] =
  await transformToControlStockModel(
    purchaseOrders.records,
    purchaseOrderLines.records,
    products.records,
    posOrderLines.records,
    stockQuants
  );
  

  // 8. Extraire les marques, couleurs, partenaires et noms de commande
  const brandsSet = new Set<string>();
  const colorsSet = new Set<string>();
  const partnersSet = new Set<string>();
  const orderNamesSet = new Set<string>();

  allData.forEach(item => {
    if (item.brand) brandsSet.add(item.brand);
    if (item.color) colorsSet.add(item.color);
  });

  // Extraire les partenaires et noms de commande des purchase orders
  // purchaseOrders.records.forEach((order: PurchaseOrder) => {
  //   if (order.partner_id && order.partner_id[1]) {
  //     partnersSet.add(order.partner_id[1]);
  //   }
  //   if (order.name) {
  //     orderNamesSet.add(order.name);
  //   }
  // });

  const brands = Array.from(brandsSet).sort();
  const colors = Array.from(colorsSet).sort();
  const partners = Array.from(partnersSet).sort();
  const orderNames = Array.from(orderNamesSet).sort();

  console.log(`✅ Données finales: ${allData.length} produits, ${brands.length} marques, ${colors.length} couleurs, ${partners.length} partenaires, ${orderNames.length} commandes`);

  return {
    data: allData,
    brands,
    colors,
    partners,
    orderNames
  };
}

interface PageProps {
  searchParams: Promise<{
    brand?: string;
    color?: string;
    stock?: string;
    start_date?: string;
    end_date?: string;
    purchase_order?: string; // Nouveau filtre
    partner?: string;
  }>;
}

export default async function ControlStockFemmePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedBrand = params.brand;
  const selectedColor = params.color;
  const selectedStock = params.stock;
  const startDate = params.start_date;
  const endDate = params.end_date;
  const selectedPartner = params.partner; // Nouveau
  const selectedPurchaseOrder = params.purchase_order;
  
  const {data,brands, colors, partners, orderNames} = await getData(startDate, endDate,selectedPartner, selectedPurchaseOrder);
  // const stockLocations = await getStockLocations();
  
  // const { data: allData, brands, colors } = await getControlStockData();

  // Filtrer les données
  let filteredData: ControlStockFemmeModel[] = data; //allData;

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
  if (selectedPartner && selectedPartner !== 'all') activeFilters.push(`Fournisseur: ${selectedPartner}`);
  if (selectedPurchaseOrder && selectedPurchaseOrder !== 'all') activeFilters.push(`Commande: ${selectedPurchaseOrder}`);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* <code>{JSON.stringify(stockLocations.records,null,2)}</code> */}
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
                <Link 
                  href="/"
                  className="inline-flex items-center px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
                >
                  ← Retour
                </Link>

                <div className="flex items-center space-x-3">
                  <div className="px-2">
                    <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  Control Stock Femme
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm truncate">
                  {activeFilters.length > 0 ? `Filtres: ${activeFilters.join(' • ')}` : 'Tous les produits'}
                </p>
                  </div>
                </div>
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
            partners={partners} // Nouveau
            orderNames={orderNames} // Nouveau
            selectedBrand={selectedBrand}
            selectedColor={selectedColor}
            selectedStock={selectedStock}
            selectedPartner={selectedPartner} // Nouveau
            selectedPurchaseOrder={selectedPurchaseOrder} // Nouveau
            startDate={startDate}
            endDate={endDate}
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