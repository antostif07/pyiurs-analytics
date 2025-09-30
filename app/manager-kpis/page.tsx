import { POSOrderLine } from "../types/pos";
import { mapOdooProduct, Product } from "../types/product_template";
import { isBeauty } from "@/lib/is_beauty";
import DailySalesClient from "./components/daily-sales.client";

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


async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name`,
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

// async function getPOSOrders() {
//   const res = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,config_id,create_date&domain=[["create_date", ">", "2025-09-01 00:00:01"], ["create_date", "<=", "2025-09-30 23:59:59"]]`,
//     { 
//       next: { 
//         revalidate: 300 // 5 minutes
//       } 
//     }
//   );

//   if (!res.ok) {
//     throw new Error("Erreur API Odoo - Ventes POS");
//   }

//   return res.json();
// }

async function getPOSOrderLines() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,qty,create_date,price_unit&domain=[["create_date", ">", "2025-09-01 00:00:01"], ["create_date", "<=", "2025-09-30 23:59:59"]]`,
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

async function getPOSDataWithProducts() {
  try {
    // Récupérer les lignes POS
    const [posData, posConfigData] = await Promise.all([
      getPOSOrderLines(),
      getPOSConfig()
    ]);
    const posLines = posData.records;
    const posConfigs = posConfigData.records;

    console.log(posConfigs);
    
    
    // Récupérer les produits associés
    const productsData = await getProductsFromPOSLines(posLines);
    const products = productsData.records.map(mapOdooProduct);
    
    // Combiner les données
    const enrichedData = posLines.map((line: POSOrderLine) => {
      const product = products.find((p: Product) => p.productVariantId === line.product_id[0]);

      return {
            ...line,
            product_name: product?.name || 'Produit inconnu',
            product_category: product?.categoryName || 'Non catégorisé',
            product_price: product?.price_unit || 0,
            total_amount: (line.qty * (line.price_unit || 0))
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
                boutique: "Pyiurs",
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
        day.safeAmount = day.totalSales * 0.15; // 15% pour le coffre fort
        day.ceoAmount = day.totalSales * 0.10; // 10% pour le CEO
        day.progress = (day.totalSales / day.dailyGoal) * 100;
    });

    // Trier par date (du plus récent au plus ancien)
    return Object.values(salesByDate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as DailySaleData[];
}

export default async function DailySalesTablePage() {
    const posDataWithProducts = await getPOSDataWithProducts();
    const salesData = calculateDailySales(posDataWithProducts);

  return (
    <DailySalesClient initialData={salesData} boutiques={[]} />
  );
}