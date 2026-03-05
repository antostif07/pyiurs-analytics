import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { Suspense } from "react";
import Loader from "@/components/loader";
import BeautySalesContent from "./beauty-sales-content";
import { OdooProductTemplate, ProductProduct } from "@/app/types/product_template";
import { odooClient as odooJsonCLient } from "@/lib/odoo/odoo-json2-client";
import { POSOrderLine } from "@/app/types/pos";

// --- TYPES ---

export interface GroupedProduct {
  hs_code: string;
  name: string;      
  productIds: number[];
}

// Nouvelle interface enrichie avec les données de ventes
export interface EnrichedGroupedProduct extends GroupedProduct {
  monthlySales: Record<string, number>; // ex: { "2023-10": 150.00, "2023-11": 200.00 }
  totalRevenue: number;                 // Total sur la période (pour le tri)
}

// --- HELPERS ---

function groupProductsByHsCode(products: ProductProduct[]): GroupedProduct[] {
  const groupedMap = new Map<string, GroupedProduct>();

  for (const product of products) {
    const rawHsCode = product.hs_code;

    if (!rawHsCode || typeof rawHsCode !== 'string') continue;

    const cleanHsCode = rawHsCode.trim();
    if (cleanHsCode === "") continue;

    const existingGroup = groupedMap.get(cleanHsCode);

    if (existingGroup) {
      existingGroup.productIds.push(product.id);
    } else {
      groupedMap.set(cleanHsCode, {
        hs_code: cleanHsCode,
        name: product.name,
        productIds: [product.id],
      });
    }
  }

  return Array.from(groupedMap.values());
}

/**
 * C'est ici que la magie opère : on associe les ventes aux groupes
 */
function mergeSalesIntoGroups(
  groups: GroupedProduct[], 
  salesLines: POSOrderLine[]
): EnrichedGroupedProduct[] {
  
  // 1. Création d'une Map de correspondance rapide : ProductID -> Index du Groupe dans le tableau
  // Cela évite de parcourir le tableau des groupes pour chaque ligne de vente (Gain de perf énorme)
  const productToGroupIndex = new Map<number, number>();
  
  groups.forEach((group, index) => {
    group.productIds.forEach(pid => {
      productToGroupIndex.set(pid, index);
    });
  });

  // 2. Initialisation des résultats avec les champs vides
  const results: EnrichedGroupedProduct[] = groups.map(g => ({
    ...g,
    monthlySales: {},
    totalRevenue: 0
  }));

  // 3. Agrégation des ventes
  for (const line of salesLines) {
    const productId = Array.isArray(line.product_id) ? line.product_id[0] : line.product_id;
    const groupIndex = productToGroupIndex.get(productId as number);

    // Si le produit appartient à un de nos groupes HS Code
    if (groupIndex !== undefined) {
      // On utilise create_date. Pour plus de précision comptable, utilisez order_id.date_order si disponible dans vos champs
      const date = new Date(line.create_date);
      const monthKey = format(date, "yyyy-MM"); // Clé de regroupement : "2024-02"

      const amount = line.price_subtotal_incl || 0;

      // Initialisation du mois si inexistant
      if (!results[groupIndex].monthlySales[monthKey]) {
        results[groupIndex].monthlySales[monthKey] = 0;
      }

      // Cumul
      results[groupIndex].monthlySales[monthKey] += amount;
      results[groupIndex].totalRevenue += amount;
    }
  }

  // Optionnel : Trier par chiffre d'affaires total décroissant
  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// --- DATA FETCHING ---

async function getProducts(): Promise<ProductProduct[]> {
  const pageSize = 5000;
  let offset = 0;
  let allProducts: ProductProduct[] = [];

  while (true) {
    const batch = await odooJsonCLient.searchRead<ProductProduct>(
      "product.product",
      {
        domain: [
          ["x_studio_segment", "ilike", "beauty"],
          ["categ_id", "not ilike", "make-up"],
          ["active", "=", true],
          ["available_in_pos", "=", true],
        ],
        fields: ["id", "name", "hs_code"], // Optimisation : on ne prend que ce qu'on utilise
        limit: pageSize,
        offset,
        order: "id desc",
      }
    );

    allProducts = allProducts.concat(batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return allProducts;
}

async function getSalesData(month: string, year: string): Promise<POSOrderLine[]> {
    const refDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = endOfMonth(refDate);
    const startDate = startOfMonth(subMonths(endDate, 5));

    const strStart = format(startDate, "yyyy-MM-dd 00:00:00");
    const strEnd = format(endDate, "yyyy-MM-dd 23:59:59");

    const pageSize = 5000;
    let offset = 0;
    let allLines: POSOrderLine[] = []
    
    while(true) {
        const batch = await odooJsonCLient.searchRead<POSOrderLine>("pos.order.line", {
            domain: [
                ["order_id.date_order", ">=", strStart],
                ["order_id.date_order", "<=", strEnd],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ['product_id.x_studio_segment', "ilike", "Beauty"]
            ],
            fields: [
                "id", 
                "product_id", 
                "qty", 
                "price_subtotal_incl", 
                "create_date" 
            ],
            limit: pageSize, // CORRECTION : Ajout de la limite
            offset: offset   // CORRECTION : Ajout de l'offset (sinon boucle infinie sur les mêmes données)
        });

        allLines = allLines.concat(batch)
        
        if (batch.length < pageSize) break;
        offset += pageSize;
    }

    return allLines;
}

async function getData(month: string, year: string) {
    // 1. Récupération parallèle pour gagner du temps
    const [products, salesLines] = await Promise.all([
        getProducts(),
        getSalesData(month, year)
    ]);

    // 2. Regroupement par HS Code
    const groupedProducts = groupProductsByHsCode(products);

    // 3. Fusion des données : on injecte les ventes dans les groupes
    const enrichedData = mergeSalesIntoGroups(groupedProducts, salesLines);
    
    return enrichedData;
}

// --- PAGE COMPONENT ---

export default async function BeautySalesTrendPage({ searchParams }: any) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

    // Récupération des données enrichies
    const data = await getData(month, year);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="flex-1 w-full space-y-4">
                    <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Trend <span className="text-rose-600">Beauty</span> 6 Mois
                    </h1>
                </div>
                <RevenueDateFilter />
            </div>
            
            <Suspense key={`${month}-${year}`} fallback={<Loader placeholder="Calcul des tendances..." />}>
                {/* On passe maintenant 'data' qui est de type EnrichedGroupedProduct[] */}
                <BeautySalesContent 
                    data={data} 
                    month={month} 
                    year={year} 
                />
            </Suspense>
        </div>
    );
}