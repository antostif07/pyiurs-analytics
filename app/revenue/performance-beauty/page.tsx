import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { endOfMonth, format, startOfMonth, subMonths, isAfter, isBefore, parseISO } from "date-fns";
import { Suspense } from "react";
import Loader from "@/components/loader";
import BeautySalesContent from "./beauty-sales-content";
import { ProductProduct } from "@/app/types/product_template";
import { odooClient as odooJsonCLient } from "@/lib/odoo/odoo-json2-client";
import { POSOrderLine } from "@/app/types/pos";

// --- TYPES ---

export interface GroupedProduct {
  hs_code: string;
  name: string;
  productIds: number[];
}

export interface EnrichedGroupedProduct extends GroupedProduct {
  monthlySales: Record<string, { revenue: number; qty: number }>;
  monthlyStockOpening: Record<string, number>; // Nouveau champ
  currentStock: number;                        // Nouveau champ
  totalRevenue: number;
}

// Types Odoo Stock
interface OdooStockQuant {
  product_id: [number, string];
  quantity: number;
}

interface OdooStockMove {
  date: string;
  product_id: [number, string];
  product_uom_qty: number; // ou qty_done selon votre version Odoo
  location_id: [number, string];      // Source
  location_dest_id: [number, string]; // Destination
}

interface OdooLocation {
    id: number;
    usage: string; // 'internal', 'customer', 'supplier', etc.
}

// --- HELPERS DE REGROUPEMENT ---

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
        name: product.name.split("[")[0],
        productIds: [product.id],
      });
    }
  }
  return Array.from(groupedMap.values());
}

/**
 * LOGIQUE CORE : Fusionne Ventes + Stock Actuel + Historique Mouvements
 */
function enrichGroupsWithData(
  groups: GroupedProduct[], 
  salesLines: POSOrderLine[],
  currentStockMap: Map<number, number>,
  stockMoves: OdooStockMove[],
  internalLocationIds: Set<number>,
  monthsRange: string[]
): EnrichedGroupedProduct[] {
  
  // 1. Map Rapide ProductID -> GroupIndex
  const productToGroupIndex = new Map<number, number>();
  groups.forEach((group, index) => {
    group.productIds.forEach(pid => productToGroupIndex.set(pid, index));
  });

  // 2. Initialisation des résultats
  const results: EnrichedGroupedProduct[] = groups.map(g => ({
    ...g,
    monthlySales: {},
    monthlyStockOpening: {},
    currentStock: 0,
    totalRevenue: 0
  }));

  // --- A. TRAITEMENT DES VENTES ---
  for (const line of salesLines) {
    const productId = Array.isArray(line.product_id) ? line.product_id[0] : line.product_id;
    const groupIndex = productToGroupIndex.get(productId as number);

    if (groupIndex !== undefined) {
      const monthKey = format(new Date(line.create_date), "yyyy-MM");
      const amount = line.price_subtotal_incl || 0;
      const quantity = line.qty || 0;

      if (!results[groupIndex].monthlySales[monthKey]) {
        results[groupIndex].monthlySales[monthKey] = { revenue: 0, qty: 0 };
      }

      // Cumul Revenu ET Quantité
      results[groupIndex].monthlySales[monthKey].revenue += amount;
      results[groupIndex].monthlySales[monthKey].qty += quantity;
      
      results[groupIndex].totalRevenue += amount;
    }
  }

  // --- B. TRAITEMENT DU STOCK ACTUEL ---
  // On agrège le stock actuel des produits dans leurs groupes HS Code
  currentStockMap.forEach((qty, productId) => {
    const groupIndex = productToGroupIndex.get(productId);
    if (groupIndex !== undefined) {
      results[groupIndex].currentStock += qty;
    }
  });

  // --- C. CALCUL DU STOCK HISTORIQUE (REVERSE CALCULATION) ---
  // On part du stock actuel et on "rembobine" les mouvements
  
  // 1. Organiser les mouvements par Mois et par Groupe
  // Structure: movesByGroup[groupIndex][monthKey] = { in: 0, out: 0 }
  const movesByGroup: Record<number, Record<string, { in: number, out: number }>> = {};

  for (const move of stockMoves) {
    const productId = move.product_id[0];
    const groupIndex = productToGroupIndex.get(productId);
    
    if (groupIndex !== undefined) {
      const moveDate = parseISO(move.date);
      const monthKey = format(moveDate, "yyyy-MM");
      const qty = move.product_uom_qty || 0;

      // Déterminer le sens du mouvement (IN ou OUT du stock interne)
      const isSourceInternal = internalLocationIds.has(move.location_id[0]);
      const isDestInternal = internalLocationIds.has(move.location_dest_id[0]);

      let type: 'in' | 'out' | 'internal' = 'internal';
      if (!isSourceInternal && isDestInternal) type = 'in';      // Fournisseur -> Stock
      else if (isSourceInternal && !isDestInternal) type = 'out'; // Stock -> Client/Perte

      if (type !== 'internal') {
        if (!movesByGroup[groupIndex]) movesByGroup[groupIndex] = {};
        if (!movesByGroup[groupIndex][monthKey]) movesByGroup[groupIndex][monthKey] = { in: 0, out: 0 };
        
        if (type === 'in') movesByGroup[groupIndex][monthKey].in += qty;
        else movesByGroup[groupIndex][monthKey].out += qty;
      }
    }
  }

  // 2. Rembobinage pour calculer le stock d'ouverture
  // On part du stock actuel (supposons que c'est la fin du mois courant)
  // Stock Début M = Stock Fin M - Entrées M + Sorties M
  // Stock Fin M-1 = Stock Début M
  
  results.forEach((group, idx) => {
    let runningStock = group.currentStock; // On part de maintenant

    // On parcourt les mois du plus récent au plus ancien (reverse)
    // monthsRange est ["2023-10", "2023-11", ... "2024-03"]
    // On veut commencer par "2024-03" (le mois courant/récent)
    for (let i = monthsRange.length - 1; i >= 0; i--) {
      const monthKey = monthsRange[i];
      
      // Mouvements du mois
      const moves = movesByGroup[idx]?.[monthKey] || { in: 0, out: 0 };
      
      // Calcul du stock au DEBUT de ce mois
      // Stock Début = Stock Fin (runningStock) - Entrées + Sorties
      const openingStock = runningStock - moves.in + moves.out;
      
      group.monthlyStockOpening[monthKey] = Math.round(openingStock); // Arrondi pour propreté
      
      // Le stock de début de ce mois devient le "Stock de Fin" du mois précédent pour la prochaine itération
      runningStock = openingStock;
    }
  });

  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

// --- DATA FETCHING ---

// 1. Produits
async function getProducts(): Promise<ProductProduct[]> {
  const pageSize = 5000;
  let offset = 0;
  let allProducts: ProductProduct[] = [];
  while (true) {
    const batch = await odooJsonCLient.searchRead<ProductProduct>("product.product", {
      domain: [
        ["x_studio_segment", "ilike", "beauty"],
        ["categ_id", "not ilike", "make-up"],
        ["active", "=", true],
        ["available_in_pos", "=", true],
      ],
      fields: ["id", "name", "hs_code"],
      limit: pageSize,
      offset,
    });
    allProducts = allProducts.concat(batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return allProducts;
}

// 2. Ventes
async function getSalesData(month: string, year: string, productIds: number[]): Promise<POSOrderLine[]> {
    const refDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = endOfMonth(refDate);
    const startDate = startOfMonth(subMonths(endDate, 5));
    const strStart = format(startDate, "yyyy-MM-dd 00:00:00");
    const strEnd = format(endDate, "yyyy-MM-dd 23:59:59");

    // Batching des IDs produits pour ne pas casser l'URL
    const BATCH_SIZE = 2000;
    let allLines: POSOrderLine[] = [];
    
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batchIds = productIds.slice(i, i + BATCH_SIZE);
        const batch = await odooJsonCLient.searchRead<POSOrderLine>("pos.order.line", {
            domain: [
                ["order_id.date_order", ">=", strStart],
                ["order_id.date_order", "<=", strEnd],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["product_id", "in", batchIds]
            ],
            fields: ["id", "product_id", "qty", "price_subtotal_incl", "create_date"],
        });
        allLines = allLines.concat(batch);
    }
    return allLines;
}

// 3. Stock Actuel (Snapshot)
async function getCurrentStock(productIds: number[]): Promise<Map<number, number>> {
  const stockMap = new Map<number, number>();
  const BATCH_SIZE = 2000;

  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batchIds = productIds.slice(i, i + BATCH_SIZE);
    const quants = await odooJsonCLient.searchRead<OdooStockQuant>("stock.quant", {
      domain: [
        ["location_id.usage", "=", "internal"], // Seulement le stock physique réel
        ["product_id", "in", batchIds]
      ],
      fields: ["product_id", "quantity"]
    });

    for (const q of quants) {
      const pid = q.product_id[0];
      const current = stockMap.get(pid) || 0;
      stockMap.set(pid, current + q.quantity);
    }
  }
  return stockMap;
}

// 4. Mouvements de Stock (Historique)
async function getStockMoves(month: string, year: string, productIds: number[]): Promise<{ moves: OdooStockMove[], internalLocs: Set<number> }> {
    const refDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = endOfMonth(refDate); // Fin du mois sélectionné (donc "Maintenant" ou passé proche)
    const startDate = startOfMonth(subMonths(endDate, 5)); // Début de la période d'analyse
    
    // On veut les mouvements depuis le début de la période d'analyse jusqu'à "demain" 
    // (pour être sûr de capter les mouvements récents si on analyse le mois courant)
    const strStart = format(startDate, "yyyy-MM-dd 00:00:00");
    
    // Récupérer les IDs des emplacements internes (pour savoir si c'est IN ou OUT)
    const locations = await odooJsonCLient.searchRead<OdooLocation>("stock.location", {
        domain: [["usage", "=", "internal"]],
        fields: ["id", "usage"]
    });
    const internalLocIds = new Set(locations.map(l => l.id));

    // Récupérer les mouvements
    const BATCH_SIZE = 2000;
    let allMoves: OdooStockMove[] = [];

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batchIds = productIds.slice(i, i + BATCH_SIZE);
        const batch = await odooJsonCLient.searchRead<OdooStockMove>("stock.move", {
            domain: [
                ["date", ">=", strStart], // Depuis le début de notre analyse
                ["state", "=", "done"],   // Seulement les mouvements terminés
                ["product_id", "in", batchIds]
            ],
            fields: ["date", "product_id", "product_uom_qty", "location_id", "location_dest_id"]
        });
        allMoves = allMoves.concat(batch);
    }

    return { moves: allMoves, internalLocs: internalLocIds };
}

// --- ORCHESTRATION ---

async function getData(month: string, year: string) {
    const products = await getProducts();
    const groupedProducts = groupProductsByHsCode(products);
    const allProductIds = groupedProducts.flatMap(g => g.productIds);

    if (allProductIds.length === 0) return [];

    // Lancement parallèle des requêtes lourdes
    const [salesLines, stockMap, { moves, internalLocs }] = await Promise.all([
        getSalesData(month, year, allProductIds),
        getCurrentStock(allProductIds),
        getStockMoves(month, year, allProductIds)
    ]);

    // Génération de la liste des mois clés pour l'algo de reverse calculation
    const monthsRange: string[] = [];
    const refDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    for (let i = 5; i >= 0; i--) {
        monthsRange.push(format(subMonths(refDate, i), 'yyyy-MM'));
    }

    // Fusion et calculs
    const enrichedData = enrichGroupsWithData(
        groupedProducts, 
        salesLines, 
        stockMap, 
        moves, 
        internalLocs, 
        monthsRange
    );
    
    return enrichedData;
}

export default async function BeautySalesTrendPage({ searchParams }: any) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

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
            
            <Suspense key={`${month}-${year}`} fallback={<Loader placeholder="Analyse des stocks et ventes..." />}>
                <BeautySalesContent 
                    data={data} 
                    month={month} 
                    year={year} 
                />
            </Suspense>
        </div>
    );
}