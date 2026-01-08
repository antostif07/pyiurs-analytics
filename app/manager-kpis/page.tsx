// app/manager-kpis/page.tsx
import { POSConfig, POSOrder, POSOrderLine } from "../types/pos";
import { OdooProductTemplate, } from "../types/product_template";
import { isBeauty } from "@/lib/is_beauty";
import DailySalesClient from "./daily-sales.client";
import { getMonthDates } from "@/lib/date-utils";
import { EnrichedPOSLine } from "../types/daily-sales";
import { getServerAuth, } from "@/lib/supabase/server";

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

// Configuration pour les requêtes API
const API_CONFIG = {
  revalidate: 300, // 5 minutes
  next: {
    tags: ['pos-data'] // Pour la revalidation par tag si nécessaire
  }
};

async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name`,
    { 
      next: { revalidate: 3600 } // 1 heure - les configs changent rarement
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Configuration POS");
  }

  return res.json();
}

async function getPOSOrders(boutiqueId?: string, month?: string, year?: string) {
  const { firstDay, lastDay } = getMonthDates(month, year);
  
  let domain = `[
    ["create_date", ">", "${firstDay}"], 
    ["create_date", "<=", "${lastDay}"],
    ["state", "in", ["paid", "done", "invoiced"]]
  ]`;

  if (boutiqueId) {
    domain = `[
      ["config_id", "=", ${boutiqueId}], 
      ["create_date", ">", "${firstDay}"], 
      ["create_date", "<=", "${lastDay}"],
      ["state", "in", ["paid", "done", "invoiced"]]
    ]`;
  }
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,config_id,create_date,amount_total,state&domain=${encodeURIComponent(domain)}`,
    API_CONFIG
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Commandes POS");
  }

  return res.json();
}

async function getPOSOrderLines(boutiqueId?: string, month?: string, year?: string) {
  const { firstDay, lastDay } = getMonthDates(month, year);
  let domain = `[
    ["create_date", ">", "${firstDay}"], 
    ["create_date", "<=", "${lastDay}"]
  ]`;
  
  if (boutiqueId) {
    const orders = await getPOSOrders(boutiqueId, month, year);
    const orderIds = orders.records.map((order: POSOrder) => order.id);
    
    if (orderIds.length === 0) {
      return { records: [] };
    }
    
    domain = `[["order_id", "in", [${orderIds.join(',')}]]]`;
  }
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,product_id,create_date,price_unit,order_id,price_subtotal&domain=${encodeURIComponent(domain)}`,
    API_CONFIG
  );

  if (!res.ok) {
    console.error("Erreur API Odoo - Lignes de commande:", res.statusText);
    throw new Error("Erreur API Odoo - Lignes de commande POS");
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
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.template?fields=id,name,list_price,categ_id,hs_code,product_variant_id,categ_id&domain=${encodeURIComponent(domain)}`,
    {
      next: { revalidate: 900 } // Cache plus long pour les produits
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Produits");
  }

  return res.json();
}

async function getPOSDataWithProducts(boutiqueId?: string, month?: string, year?: string) {
  try {
    // Récupérer les données en parallèle quand possible
    const [posLinesData, posConfigData, ordersData] = await Promise.all([
      getPOSOrderLines(boutiqueId, month, year),
      getPOSConfig(),
      getPOSOrders(boutiqueId, month, year)
    ]);

    const posLines = posLinesData.records;
    const posConfigs = posConfigData.records;
    const orders = ordersData.records;

    if (posLines.length === 0) {
      return [];
    }

    // Récupérer les produits associés
    const productsData = await getProductsFromPOSLines(posLines);

    // Créer un map pour les relations order -> boutique
    const orderToBoutiqueMap = new Map();
    orders.forEach((order: POSOrder) => {
      const config = posConfigs.find((c: POSConfig) => c.id === order.config_id[0]);
      if (config) {
        orderToBoutiqueMap.set(order.id, {
          id: config.id,
          name: config.name
        });
      }
    });

    // Enrichir les données
    const enrichedData = posLines.map((line: POSOrderLine) => {
      const product = productsData.records?.find((p: OdooProductTemplate) => p.product_variant_id?.[0] === line.product_id?.[0]);
      const boutiqueInfo = orderToBoutiqueMap.get(line.order_id?.[0]);

      return {
        ...line,
        product_name: product?.name || 'Produit inconnu',
        product_category: product?.categ_id?.[1] || 'Non catégorisé',
        product_price: product?.list_price || line.price_unit || 0,
        total_amount: line.price_subtotal || (line.qty * (line.price_unit || 0)),
        boutique_id: boutiqueInfo?.id || null,
        boutique_name: boutiqueInfo?.name || 'Inconnue'
      }
    })

    return enrichedData;

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données POS:', error);
    throw error;
  }
}

function calculateDailySales(data: EnrichedPOSLine[]): DailySaleData[] {
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
    salesByDate[date].totalSales += item.total_amount || 0;
    salesByDate[date].beautyAmount += beautyAmount;
    
    // Calcul du safe amount (50% du reste après beauty)
    const nonBeautyAmount = item.total_amount - beautyAmount;
    salesByDate[date].safeAmount += nonBeautyAmount * 0.5;
  });

  // Calculer les épargnes pour chaque jour
  Object.values(salesByDate).forEach((day: DailySaleData) => {
    day.rentAmount = day.totalSales * 0.25; // 25% pour le loyer
    day.ceoAmount = day.totalSales * 0.10;  // 10% pour le CEO
    day.progress = (day.totalSales / day.dailyGoal) * 100;
  });

  // Trier par date (du plus récent au plus ancien)
  return Object.values(salesByDate)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export default async function DailySalesTablePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const boutiqueId = params.boutique || undefined;
  const month = params.month || undefined;
  const year = params.year || undefined;
  const {profile} = await getServerAuth();
  

  try {
    let posDataWithProducts: EnrichedPOSLine[] = [];
    if(profile?.role === 'manager' && profile?.assigned_shops?.length === 1) {
      posDataWithProducts = await getPOSDataWithProducts(profile?.assigned_shops[0], month, year);
    } else {
      posDataWithProducts = await getPOSDataWithProducts(profile?.assigned_shops[0], month, year);
    }
    
    const salesData = calculateDailySales(posDataWithProducts);

    const posConfigData = await getPOSConfig();
    let boutiques = posConfigData.records.map((config: POSConfig) => ({
      id: config.id,
      name: config.name
    }))

    if(profile == null) {
      throw new Error("Utilisateur non authentifié");
    }
    
    if(profile.shop_access_type === 'specific') {
      boutiques = boutiques.filter((boutique: { id: number; name: string }) => profile?.assigned_shops?.includes(boutique.id.toString()));
    }

    return (
      <DailySalesClient
        initialData={salesData}
        boutiques={boutiques}
        selectedBoutiqueId={boutiqueId}
        selectedMonth={month}
        selectedYear={year}
        profile={profile}
      />
    );
  } catch (error) {
    console.error('Error in page component:', error);
    
    // Vous pourriez retourner une page d'erreur ici
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Erreur de chargement
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Impossible de charger les données. Veuillez réessayer.
          </p>
        </div>
      </div>
    );
  }
}