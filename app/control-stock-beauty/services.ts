import { unstable_cache } from "next/cache";
import { 
  extractBoutiqueCode, 
  extractBrandFromProduct, 
  extractColorFromProduct 
} from "@/lib/utils";
import { StockQuant } from "../types/stock";
import { POSOrderLine } from "../types/pos";
import { mapOdooProduct, Product } from "../types/product_template";
import { ControlStockBeautyModel, IndividualProductModel } from "../types/ControlStockBeautyModel";
import { PurchaseOrderLine } from "../types/purchase";
import { calculateSalesLast30Days, calculateLastSaleDate, calculateReplenishmentMetrics } from "../utils/stockCalculations";

// --- Fonctions d'appel API (Privées au module) ---

async function getStockQuantsForProducts(productIds: number[]): Promise<{ records: StockQuant[], success: boolean }> {
  if (productIds.length === 0) return { records: [], success: true };

  try {
    const BATCH_SIZE = 500;
    const batches = [];
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      batches.push(productIds.slice(i, i + BATCH_SIZE));
    }

    const allResults = [];
    for (const batch of batches) {
      const domain = JSON.stringify([
        ['product_id', 'in', batch],
        ['location_id', 'in', [8,58,62,89,99,100,105,107,121,160,169,170,180,225,226,231,232,244,245,259,261]],
      ]);
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/stock.quant?fields=id,product_id,product_tmpl_id,location_id,quantity&domain=${domain}`,
        { next: { revalidate: 300 } }
      );

      if (!res.ok) {
        console.error(`Erreur stock fetch: ${res.statusText}`);
        continue;
      }
      const batchResults = await res.json();
      allResults.push(...batchResults.records);
    }
    return { success: true, records: allResults };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des stocks quant:', error);
    return { records: [], success: false };
  }
}

async function getProducts() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id,x_studio_many2one_field_21bvh,x_studio_many2one_field_QyelN,x_studio_many2one_field_Arl5D,description_pickingin&domain=[[\"categ_id\",\"ilike\",\"beauty\"],[\"categ_id\",\"not ilike\",\"make-up\"],["active","=","true"],["available_in_pos","=","true"]]`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("Erreur API Odoo - Produits");
  return res.json();
}

async function getPurchaseOrderLines() {
  const domain = JSON.stringify([
    ['partner_id', 'not ilike','pb - bc'],
    ['partner_id', "not ilike",["pb - 24"]],
    ['partner_id', "not ilike",["pb - mto"]],
    ['partner_id', "not ilike",["pb - lmb"]],
    ['partner_id', "not ilike",["pb - ktm"]],
    ["partner_id", "not in", [24099, 23705, 1, 23706, 23707, 23708, 27862]]
  ]);
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order.line?fields=id,product_id,product_qty,qty_received,price_unit,order_id&domain=${domain}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("Erreur API Odoo - Commandes d'achat");
  return res.json();
}

async function getPOSOrderLines(productIds: number[]): Promise<{ records: POSOrderLine[]; success: boolean; }> {
  if (productIds.length === 0) return { records: [], success: true };

  try {
    const BATCH_SIZE = 500;
    const batches = [];
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      batches.push(productIds.slice(i, i + BATCH_SIZE));
    }

    const allResults = [];
    for (const batch of batches) {
      const domain = JSON.stringify([['product_id', 'in', batch]]);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,create_date&domain=${domain}`,
        { next: { revalidate: 300 } }
      );

      if (!res.ok) throw new Error(`Erreur POS fetch: ${res.statusText}`);
      const batchResults = await res.json();
      allResults.push(...batchResults.records);
    }
    return { success: true, records: allResults };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des ventes POS:', error);
    return { records: [], success: false };
  }
}

// --- Fonction Principale (Transformations) ---

// Fonction interne qui fait le gros travail
async function fetchAndProcessStockData() {
  
  const products = await getProducts();
  const data = products.records.map(mapOdooProduct);
  const allProductIds = data.map((product: Product) => product.productVariantId);

  const [purchaseOrderLines, posOrderLines, stockQuants] = await Promise.all([
    getPurchaseOrderLines(),
    getPOSOrderLines(allProductIds),
    getStockQuantsForProducts(allProductIds),
  ]);

  const salesLast30Days = calculateSalesLast30Days(posOrderLines.records, allProductIds);
  const lastSaleDates = calculateLastSaleDate(posOrderLines.records, allProductIds);

  // Map des stocks
  const stockByProductAndBoutique = new Map<number, any>();

  // Initialisation à 0
  allProductIds.forEach((productId: number) => {
    stockByProductAndBoutique.set(productId, {
      P24: 0, ktm: 0, mto: 0, lmb: 0, onl: 0, dc: 0, other: 0, total: 0
    });
  });

  // Remplissage avec les données réelles
  stockQuants.records.forEach((quant: StockQuant) => {
    const productId = quant.product_id[0];
    const locationName = quant.location_id[1];
    const quantity = quant.quantity;
    const boutiqueCode = extractBoutiqueCode(locationName);
    
    const currentStock = stockByProductAndBoutique.get(productId);
    if(currentStock) {
        if (['P24', 'ktm', 'mto', 'onl', 'dc'].includes(boutiqueCode)) {
            currentStock[boutiqueCode] += quantity;
        } else {
            currentStock.other += quantity;
        }
        currentStock.total += quantity;
    }
  });

  const groupedData: ControlStockBeautyModel[] = [];
  const groupedMap = new Map<string, Product[]>();
  const brandsSet = new Set<string>();
  const colorsSet = new Set<string>();

  data.forEach((product: Product) => {
    const key = product.hs_code || "UNKNOWN";
    if (!groupedMap.has(key)) groupedMap.set(key, []);
    groupedMap.get(key)!.push(product);
    brandsSet.add(extractBrandFromProduct(product));
    colorsSet.add(extractColorFromProduct(product));
  });

  groupedMap.forEach((productsGroup, hs_code) => {
    const label = productsGroup[0].name;
    const cleanName = label.split("[").shift()?.trim();
    const brand = extractBrandFromProduct(productsGroup[0]);
    const color = extractColorFromProduct(productsGroup[0]);
    const name = `${cleanName} - ${hs_code} - (${productsGroup[0].listPrice}$)`;

    const relatedLines = purchaseOrderLines.records.filter(
      (line: PurchaseOrderLine) =>
        line.product_id && productsGroup.some((p) => p.productVariantId === line.product_id[0])
    );
    const relatedPosLines = posOrderLines.records.filter(
      (line: POSOrderLine) =>
        line.product_id && productsGroup.some((p) => p.productVariantId === line.product_id[0])
    );

    const product_qty = relatedLines.reduce((sum: number, line: PurchaseOrderLine) => sum + (line.product_qty || 0), 0);
    const qty_received = relatedLines.reduce((sum: number, line: PurchaseOrderLine) => sum + (line.qty_received || 0), 0);
    const not_received = product_qty - qty_received;
    const qty_sold = relatedPosLines.reduce((sum: number, line: POSOrderLine) => sum + (line.qty || 0), 0);

    let groupStock = { P24: 0, ktm: 0, mto: 0, onl: 0, dc: 0, other: 0, total: 0 };

    const individualProducts: IndividualProductModel[] = productsGroup.map((product) => {
      const productStock = stockByProductAndBoutique.get(product.productVariantId!) || {
        P24: 0, ktm: 0, mto: 0, onl: 0, dc: 0, other: 0, total: 0, lmb: 0,
      };

      Object.keys(groupStock).forEach(k => groupStock[k as keyof typeof groupStock] += productStock[k as keyof typeof groupStock]);

      return {
        id: product.id,
        name: product.name,
        productVariantId: product.productVariantId!,
        listPrice: product.listPrice,
        brand: extractBrandFromProduct(product),
        color: extractColorFromProduct(product),
        stock_P24: productStock.P24,
        stock_ktm: productStock.ktm,
        stock_mto: productStock.mto,
        stock_onl: productStock.onl,
        stock_dc: productStock.dc,
        stock_lmb: productStock.lmb,
        stock_other: productStock.other,
        total_stock: productStock.total,
        sales_last_30_days: salesLast30Days.get(product.productVariantId!) || 0,
        last_sale_date: lastSaleDates.get(product.productVariantId!),
        parent_hs_code: hs_code
      };
    });

    const sales30Days = productsGroup.reduce((total, product) => total + (salesLast30Days.get(product.productVariantId!) || 0), 0);
    
    // Trouver la date de vente la plus récente
    let lastSaleDate: Date | null = null;
    productsGroup.forEach(p => {
        const d = lastSaleDates.get(p.productVariantId!);
        if (d && (!lastSaleDate || d > lastSaleDate)) lastSaleDate = d;
    });

    const replenishmentMetrics = calculateReplenishmentMetrics(groupStock.total, sales30Days);

    groupedData.push({
      hs_code,
      name,
      brand,
      color,
      product_qty,
      qty_received,
      not_received,
      qty_sold,
      qty_available: groupStock.total,
      stock_P24: groupStock.P24,
      stock_ktm: groupStock.ktm,
      stock_mto: groupStock.mto,
      stock_onl: groupStock.onl,
      stock_dc: groupStock.dc,
      stock_other: groupStock.other,
      total_stock: groupStock.total,
      sales_last_30_days: sales30Days,
      daily_sales_rate: replenishmentMetrics.dailySalesRate,
      days_until_out_of_stock: replenishmentMetrics.daysUntilOutOfStock,
      estimated_out_of_stock_date: replenishmentMetrics.estimatedOutOfStockDate || undefined,
      recommended_reorder_date: replenishmentMetrics.recommendedReorderDate || undefined,
      last_sale_date: lastSaleDate || undefined,
      individualProducts,
      isExpanded: false
    });
  });

  return {
    data: groupedData,
    brands: Array.from(brandsSet).sort(),
    colors: Array.from(colorsSet).sort(),
  };
}

// --- Export public avec Cache Next.js ---

// On utilise unstable_cache au lieu de 'let cachedData'
// Cela permet de mettre en cache le RÉSULTAT du calcul lourd, pas seulement les fetchs.
export const getControlStockData = unstable_cache(
  async () => {
    return await fetchAndProcessStockData();
  },
  ['control-stock-beauty-data'], // Key du cache
  {
    revalidate: 300, // Durée de vie du cache (5 minutes)
    tags: ['stock-beauty'] // Tag pour invalider manuellement si besoin
  }
);