import { isBeauty } from "@/lib/is_beauty";
import { POSConfig, POSOrder, POSOrderLine } from "../types/pos";
import { BeautyBrandsData, BrandData, mapOdooProduct, Product } from "../types/product_template";
import BeautyBrandsClient from "./control-revenue-beauty.client";
import { getMonthDates } from "@/lib/date-utils";

interface PageProps {
  searchParams: Promise<{
    boutique?: string;
    month?: string;
    year?: string;
  }>;
}

async function getPOSOrders(boutiqueId?: string, month?: string, year?: string) {
  const { firstDay, lastDay } = getMonthDates(month, year);
  
  let domain = `[["create_date", ">", "${firstDay}"], ["create_date", "<=", "${lastDay}"]]`;

  if (boutiqueId) {
    domain = `[["config_id", "=", ${boutiqueId}], ["create_date", ">", "${firstDay}"], ["create_date", "<=", "${lastDay}"]]`;
  }
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,config_id,create_date&domain=${encodeURIComponent(domain)}`,
    { 
      next: { revalidate: 300 }
    }
  );

  if (!res.ok) throw new Error("Erreur API Odoo - Commandes POS");
  return res.json();
}

async function getPOSOrderLines(boutiqueId?: string, month?: string, year?: string) {
  const { firstDay, lastDay } = getMonthDates(month, year);
  
  let domain = `[["create_date", ">", "${firstDay}"], ["create_date", "<=", "${lastDay}"]]`;
  
  if (boutiqueId) {
    const orders = await getPOSOrders(boutiqueId, month, year);
    const orderIds = orders.records.map((order: POSOrder) => order.id);
    
    if (orderIds.length === 0) return { records: [] };
    domain = `[["order_id", "in", [${orderIds.join(',')}]]]`;
  }
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,create_date,price_unit,order_id&domain=${encodeURIComponent(domain)}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) throw new Error("Erreur API Odoo - Lignes POS");
  return res.json();
}

async function getProductsFromPOSLines(posLines: POSOrderLine[]) {
  const productIds = [...new Set(posLines.map(line => line.product_id[0]))];
  
  if (productIds.length === 0) return { records: [] };

  const domain = `[["product_variant_ids", "in", [${productIds.join(',')}]]]`;

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id,x_studio_many2one_field_21bvh&domain=${encodeURIComponent(domain)}`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) throw new Error("Erreur API Odoo - Produits");
  return res.json();
}

async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) throw new Error("Erreur API Odoo - Configuration POS");
  return res.json();
}

async function getBeautyBrandsData(boutiqueId?: string, month?: string, year?: string): Promise<BeautyBrandsData> {
  try {
    const [posData, posConfigData] = await Promise.all([
      getPOSOrderLines(boutiqueId, month, year),
      getPOSConfig()
    ]);
    
    const posLines = posData.records;
    const posConfigs = posConfigData.records;
    
    const productsData = await getProductsFromPOSLines(posLines);
    const products = productsData.records.map(mapOdooProduct);
    
    const ordersData = await getPOSOrders(boutiqueId, month, year);
    const orders = ordersData.records;

    // Mapper les boutiques
    const orderToBoutiqueMap = new Map();
    orders.forEach((order: POSOrder) => {
      const config = posConfigs.find((c: POSConfig) => c.id === order.config_id[0]);
      if (config) {
        orderToBoutiqueMap.set(order.id, config.name);
      }
    });

    // Structurer les données
    const brandsMap = new Map<string, BrandData>();
    const productsMap = new Map<string, BrandData>();
    const dateSet = new Set<string>();

    posLines.forEach((line: POSOrderLine) => {
      const product: Product|undefined = products.find((p: Product) => p.productVariantId === line.product_id[0]);
      if (!product || !isBeauty(product.categoryName)) return;

      const brandName = product.marque || 'Autres';
      const date = line.create_date.split(' ')[0];
      dateSet.add(date);

      const amount = line.qty * (line.price_unit || 0);
      const quantity = line.qty;

      // Données pour la marque
      const brandId = `brand-${brandName}`;
      if (!brandsMap.has(brandId)) {
        brandsMap.set(brandId, {
          id: brandId,
          name: brandName,
          type: 'brand',
          dailySales: {},
          totalAmount: 0,
          totalQuantity: 0
        });
      }
      const brandData = brandsMap.get(brandId)!;
      if (!brandData.dailySales[date]) {
        brandData.dailySales[date] = { amount: 0, quantity: 0 };
      }
      brandData.dailySales[date].amount += amount;
      brandData.dailySales[date].quantity += quantity;
      brandData.totalAmount += amount;
      brandData.totalQuantity += quantity;

      // Données pour le produit
      const productId = `product-${product.id}`;
      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          id: productId,
          name: product.name,
          type: 'product',
          parentId: brandId,
          dailySales: {},
          totalAmount: 0,
          totalQuantity: 0
        });
      }
      const productData = productsMap.get(productId)!;
      if (!productData.dailySales[date]) {
        productData.dailySales[date] = { amount: 0, quantity: 0 };
      }
      productData.dailySales[date].amount += amount;
      productData.dailySales[date].quantity += quantity;
      productData.totalAmount += amount;
      productData.totalQuantity += quantity;
    });

    // Trier les dates
    const dateRange = Array.from(dateSet).sort();

    return {
      brands: Array.from(brandsMap.values()),
      products: Array.from(productsMap.values()),
      dateRange
    };
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données beauty:', error);
    throw error;
  }
}

export default async function ControlRevenueBeautyPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const boutiqueId = params.boutique;
    const month = params.month;
    const year = params.year;

    const beautyData = await getBeautyBrandsData(boutiqueId, month, year);
    
    const posConfigData = await getPOSConfig();
    const boutiques = posConfigData.records.map((config: POSConfig) => ({
        id: config.id,
        name: config.name
    } as POSConfig));

    return (
        <BeautyBrandsClient 
            initialData={beautyData} 
            boutiques={boutiques}
            selectedBoutiqueId={boutiqueId}
            selectedMonth={month}
            selectedYear={year}
        />
    )
}