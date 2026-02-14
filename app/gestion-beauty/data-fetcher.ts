'use server'
import { odooClient } from "@/lib/odoo/xmlrpc";
import { createClient } from "@/lib/supabase/server";

// types/odoo.ts ou directement dans data-fetcher.ts

export interface OdooProduct {
  id: number;
  name: string;
  lst_price: number;
  qty_available: number;
  default_code: string | false; // Odoo renvoie 'false' si le champ est vide
}

export interface GroupedProduct {
  hsCode: string;
  variantCount: number;
  totalStock: number;
}

export interface BeautyDashboardStats {
  totalProducts: number;
  lowStockCount: number;
  recentProducts: OdooProduct[];
  currentMonthRevenue: number;
}

export async function getBeautyDashboardStats() {
  const beautyDomain = [["x_studio_segment", "=", "Beauty"]];
  
  // 1. Nombre total de produits Beauty
  const stockData = await odooClient.execute("stock.quant", "read_group", [
    [
      ["product_id.x_studio_segment", "=", "Beauty"],
      ["location_id.usage", "=", "internal"]
    ],
    ["quantity"], // On somme le champ 'quantity'
    []            // Pas de regroupement (total global)
  ]) as any[];

  const totalQuantity = stockData[0]?.quantity || 0;

  // 2. Produits en stock faible (ex: < 10 unités)
  const lowStockDomain = [
    ["x_studio_segment", "=", "Beauty"],
    ["qty_available", "<", 10],
    ["type", "=", "product"]
  ];
  const lowStockCount = await odooClient.searchCount("product.product", lowStockDomain);

  // 3. Récupération des 5 derniers produits ajoutés ou modifiés
  const recentProducts = await odooClient.searchRead("product.product", {
    domain: beautyDomain,
    fields: ["name", "lst_price", "qty_available", "default_code"],
    limit: 5,
    order: "write_date desc"
  }) as OdooProduct[];

  // 4. Calcul du CA (Sale Order Lines)
  // Note: On filtre les lignes de commande dont le produit est "Beauty"
  const salesData = await odooClient.execute("pos.order.line", "read_group", [
    [["product_id.x_studio_segment", "=", "Beauty"], 
    // ["state", "in", ["paid", "done"]]
    ],
    ["price_subtotal_incl"],
    ["create_date:month"]
  ]) as any[];

  return {
    totalQuantity,
    lowStockCount,
    recentProducts,
    currentMonthRevenue: salesData[salesData.length - 1]?.price_subtotal_incl || 0,
  };
}

export async function getBeautyGroupedPerformance(page: number = 0, limit: number = 50): Promise<GroupedProduct[]> {
  const beautyDomain = [["x_studio_segment", "=", "Beauty"]];
  const offset = page * limit;

  try {
    // 1. On récupère les données brutes (Toujours tout pour calculer les sommes exactes)
    const allProducts = await odooClient.searchRead("product.product", {
      domain: beautyDomain,
      fields: ["hs_code", "qty_available"],
    }) as any[];

    if (!Array.isArray(allProducts)) return [];

    // 2. Groupement manuel (comme précédemment)
    const groupedMap = allProducts.reduce<Record<string, GroupedProduct>>((acc, product) => {
      let code = "Sans Code";
      if (typeof product.hs_code === "string") code = product.hs_code;
      else if (Array.isArray(product.hs_code)) code = product.hs_code[1];

      if (!acc[code]) {
        acc[code] = { hsCode: code, variantCount: 0, totalStock: 0 };
      }
      acc[code].variantCount += 1;
      acc[code].totalStock += (product.qty_available || 0);
      return acc;
    }, {});

    // 3. Conversion en tableau et Tri
    const sortedResult = Object.values(groupedMap).sort((a, b) => b.totalStock - a.totalStock);

    // 4. PAGINATION : On ne renvoie que la tranche demandée
    const paginatedResult = sortedResult.slice(offset, offset + limit);

    console.log(`Pagination: Page ${page}, renvoie ${paginatedResult.length} groupes sur ${sortedResult.length} au total`);
    
    return paginatedResult;

  } catch (error) {
    console.error("Erreur de groupement:", error);
    return [];
  }
}

export async function loadMoreProducts(page: number) {
  return await getBeautyGroupedPerformance(page, 50);
}

export async function getProductsByHSCode(hsCode: string): Promise<any[]> {
  console.log("Recherche des variantes pour :", hsCode);
    
  const domain = [
    ["x_studio_segment", "=", "Beauty"],
    ["hs_code", "=", hsCode === "Sans Code" ? false : hsCode]
  ];

  try {
    // 1. On retire le paramètre 'order' de l'appel Odoo
    const result = await odooClient.searchRead("product.product", {
      domain,
      fields: ["name", "default_code", "qty_available", "lst_price"], // Note: vérifiez si c'est lst_price ou list_price dans votre Odoo
    }) as any[];

    if (!Array.isArray(result)) return [];

    // 2. On effectue le tri en JavaScript ici
    // b - a pour un tri décroissant (plus gros stocks en haut)
    const sortedResult = result.sort((a, b) => {
      const stockA = a.qty_available || 0;
      const stockB = b.qty_available || 0;
      return stockB - stockA;
    });

    console.log(`${sortedResult.length} variantes trouvées et triées.`);
    return sortedResult;

  } catch (error) {
    console.error("Erreur Odoo Variantes:", error);
    return [];
  }
}

export async function getBeautySmartAlerts() {
  const supabase = createClient();
  
  // On récupère les produits qui ne sont pas en statut 'normal' 
  // ou ceux qui ont une date de rupture proche
  const { data: alerts, error } = await supabase
    .from('beauty_inventory_tracker')
    .select('*')
    .neq('status', 'normal')
    .order('last_total_stock', { ascending: true });

  if (error) return [];
  return alerts;
}