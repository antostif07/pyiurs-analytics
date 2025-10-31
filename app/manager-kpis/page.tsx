import { POSConfig, POSOrder, POSOrderLine } from "../types/pos";
import { mapOdooProduct, Product } from "../types/product_template";
import { isBeauty } from "@/lib/is_beauty";
import DailySalesClient from "./components/daily-sales.client";
import { getMonthDates } from "@/lib/date-utils";

// Types
export interface DailySaleData {
  id: string;
  date: string;
  boutique: string;
  totalSales: number;
  rentAmount: number;
  safeAmount: number;
  ceoAmount: number;
  beautyAmount: number;
  dailyGoal: number;
  progress: number;
}

interface PageProps {
  searchParams: Promise<{
    boutique?: string;
    month?: string;
    year?: string;
  }>;
}

async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name`,
    { 
      cache: 'no-store'
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Ventes POS");
  }

  return res.json();
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
      next: { 
        revalidate: 300 // 5 minutes
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Ventes POS");
  }

  return res.json();
}

async function getPOSOrderLines(boutiqueId?: string, month?: string, year?: string) {
    const { firstDay, lastDay } = getMonthDates(month, year);
    let domain = `[["create_date", ">", "${firstDay}"], ["create_date", "<=", "${lastDay}"]]`;
    if (boutiqueId) {
        const orders = await getPOSOrders(boutiqueId, month, year);
        const orderIds = orders.records.map((order: POSOrder) => order.id);
        
        if (orderIds.length === 0) {
          return { records: [] };
        }
        
        domain = `[["order_id", "in", [${orderIds.join(',')}]]]`;
    }
    
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,qty,create_date,price_unit,order_id&domain=${encodeURIComponent(domain)}`,
        { 
        next: { 
            revalidate: 300 // 5 minutes
        } 
        }
    );

  if (!res.ok) {
    console.log(res.statusText);
    
    throw new Error("Erreur API Odoo - Ventes POS");
  }

  return res.json();
}

async function getProductsFromPOSLines(posLines: POSOrderLine[]) {
    const productIds = [...new Set(posLines.map(line => line.product_id[0]))];
    
    if (productIds.length === 0) {
        return { records: [] };
    }

    const domain = `[["product_variant_ids", "in", [${productIds.join(',')}]]]`;

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id&domain=${encodeURIComponent(domain)}`,
        {
            next: { 
                revalidate: 300 // 5 minutes
            }
        }
    );

    if (!res.ok) {
        throw new Error("Erreur API Odoo - Produits POS");
    }

    return res.json();
}

async function getPOSDataWithProducts(boutiqueId?: string, month?: string, year?: string) {
  try {
    // Récupérer les lignes POS
    const [posData, posConfigData] = await Promise.all([
      getPOSOrderLines(boutiqueId, month, year),
      getPOSConfig()
    ]);
    const posLines = posData.records;
    const posConfigs = posConfigData.records;
    
    // Récupérer les produits associés
    const productsData = await getProductsFromPOSLines(posLines);
    const products = productsData.records.map(mapOdooProduct);
    
    const ordersData = await getPOSOrders(boutiqueId);
    const orders = ordersData.records;

    // Mapper les IDs de configuration aux noms de boutique
    const orderToBoutiqueMap = new Map();

    orders.forEach((order: POSOrder) => {
        const config = posConfigs.find((c: POSConfig) => c.id === order.config_id[0]);
        if (config) {
            orderToBoutiqueMap.set(order.id, {
                id: config.id,
                name: config.name
            });
        }
    })
    // Combiner les données
    const enrichedData = posLines.map((line: POSOrderLine) => {
        const product = products.find((p: Product) => p.productVariantId === line.product_id[0]);
        const boutiqueInfo = orderToBoutiqueMap.get(line.order_id[0]);

      return {
            ...line,
            product_name: product?.name || 'Produit inconnu',
            product_category: product?.categoryName || 'Non catégorisé',
            product_price: product?.price_unit || 0,
            total_amount: (line.qty * (line.price_unit || 0)),
            boutique_id: boutiqueInfo?.id || null,
            boutique_name: boutiqueInfo?.name || 'Inconnue'
        };
    });
    
    return enrichedData;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données POS:', error);
    throw error;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateDailySales(data: any[]): DailySaleData[] {
    const salesByDate: { [key: string]: DailySaleData } = {};
    
    data.forEach(item => {
        const date = item.create_date ? item.create_date.split(' ')[0] : new Date().toISOString().split('T')[0];

        if (!salesByDate[date]) {
            salesByDate[date] = {
                id: date,
                date: date,
                boutique: item.boutique_name || "Pyiurs",
                totalSales: 0,
                rentAmount: 0,
                safeAmount: 0,
                ceoAmount: 0,
                beautyAmount: 0,
                dailyGoal: 2000,
                progress: 0
            };
        }

        const beautyAmount = isBeauty(item.product_category) ? (item.total_amount || 0) : 0;
        
        // Ajouter au total des ventes
        salesByDate[date].totalSales += (item.total_amount) || 0;
        salesByDate[date].beautyAmount += beautyAmount;
        salesByDate[date].safeAmount += (item.total_amount - beautyAmount) / 2; // 50% du reste pour le coffre fort
    });

    // Calculer les épargnes pour chaque jour
    Object.values(salesByDate).forEach((day: DailySaleData) => {
        // Calcul des épargnes basé sur le total des ventes beauty
        day.rentAmount = day.totalSales * 0.25; // 25% pour le loyer
        day.ceoAmount = day.totalSales * 0.10; // 10% pour le CEO
        day.progress = (day.totalSales / day.dailyGoal) * 100;
    });

    // Trier par date (du plus récent au plus ancien)
    return Object.values(salesByDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as DailySaleData[];
}

export default async function DailySalesTablePage({searchParams}: PageProps) {
    const params = await searchParams;
    const boutiqueId = params.boutique || undefined;
    const month = params.month || undefined;
    const year = params.year || undefined;

    const posDataWithProducts = await getPOSDataWithProducts(boutiqueId, params.month, params.year);
    const salesData = calculateDailySales(posDataWithProducts);

    const posConfigData = await getPOSConfig();
    const boutiques = posConfigData.records.map((config: POSConfig) => ({
        id: config.id,
        name: config.name
    }));

  return (
    <DailySalesClient
      initialData={salesData}
      boutiques={boutiques}
      selectedBoutiqueId={boutiqueId}
      selectedMonth={month}
      selectedYear={year}
    />
  );
}