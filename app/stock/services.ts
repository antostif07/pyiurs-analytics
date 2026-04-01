import { odooClient as odooJsonCLient } from "@/lib/odoo/odoo-json2-client";

const BATCH_SIZE = 2500;

export async function getStockFlowData(startDate: string, endDate: string) {
  const now = new Date().toISOString();

  // 1. Récupérer les catégories POS
  const categories = await odooJsonCLient.searchRead<any>("pos.category", {
    fields: ["id", "name"],
  });

  return categories;
  // 2. Récupérer tous les produits POS
  const products = await odooJsonCLient.searchRead<any>("product.product", {
    domain: [["available_in_pos", "=", true]],
    fields: ["id", "name", "pos_categ_ids", "qty_available"],
  });

  const productIds = products.map((p: any) => p.id);

  // 3. Récupérer les données par batch de 2500
  // On récupère tout en séquentiel pour ne pas bloquer Odoo
  const salesDuring = await getPOSLinesBatched(productIds, startDate, endDate);
  const salesAfter = await getPOSLinesBatched(productIds, endDate, now);
  const inboundDuring = await getInboundMovesBatched(productIds, startDate, endDate);
  const inboundAfter = await getInboundMovesBatched(productIds, endDate, now);

  // 4. Indexer les données par Product ID pour un accès ultra-rapide (O(1))
  const statsByProduct = new Map<number, { sDuring: number; sAfter: number; iDuring: number; iAfter: number }>();

  // Initialisation de la map
  productIds.forEach(id => statsByProduct.set(id, { sDuring: 0, sAfter: 0, iDuring: 0, iAfter: 0 }));

  // Remplissage des stats
  salesDuring.forEach(s => {
    const entry = statsByProduct.get(s.product_id[0]);
    if (entry) entry.sDuring += s.qty;
  });
  salesAfter.forEach(s => {
    const entry = statsByProduct.get(s.product_id[0]);
    if (entry) entry.sAfter += s.qty;
  });
  inboundDuring.forEach(m => {
    const entry = statsByProduct.get(m.product_id[0]);
    if (entry) entry.iDuring += m.product_uom_qty;
  });
  inboundAfter.forEach(m => {
    const entry = statsByProduct.get(m.product_id[0]);
    if (entry) entry.iAfter += m.product_uom_qty;
  });

  // 5. Agrégation par catégorie
  const flowMap = new Map<number, any>();
  categories.forEach(cat => {
    flowMap.set(cat.id, {
      id: cat.id,
      categoryName: cat.name,
      openingStock: 0,
      inboundStock: 0,
      soldStock: 0,
      closingStock: 0,
    });
  });

  products.forEach(p => {
    const catId = p.pos_categ_id?.[0];
    if (!catId || !flowMap.has(catId)) return;

    const stats = flowMap.get(catId);
    const pData = statsByProduct.get(p.id);
    if (!pData) return;

    // --- LOGIQUE DE BACKTRACKING ---
    // Stock à la date de fin = Stock Actuel - Entrées depuis + Ventes depuis
    const stockAtEnd = p.qty_available - pData.iAfter + pData.sAfter;
    // Stock à la date de début = Stock à la fin - Entrées période + Ventes période
    const stockAtStart = stockAtEnd - pData.iDuring + pData.sDuring;

    stats.openingStock += stockAtStart;
    stats.inboundStock += pData.iDuring;
    stats.soldStock += pData.sDuring;
    stats.closingStock += stockAtEnd;
  });

  return Array.from(flowMap.values())
    .filter(f => f.openingStock !== 0 || f.inboundStock !== 0 || f.soldStock !== 0)
    .sort((a, b) => b.soldStock - a.soldStock);
}

/**
 * Helper pour découper les IDs et appeler Odoo par batch pour les ventes POS
 */
async function getPOSLinesBatched(productIds: number[], start: string, end: string) {
    const allResults: any[] = [];
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);
        const res = await odooJsonCLient.searchRead<any>("pos.order.line", {
        domain: [
            ["product_id", "in", batch],
            ["create_date", ">=", start],
            ["create_date", "<=", end]
        ],
        fields: ["product_id", "qty"]
        });
        allResults.push(...res);
    }
    return allResults;
}

/**
 * Helper pour découper les IDs et appeler Odoo par batch pour les mouvements de stock
 */
async function getInboundMovesBatched(productIds: number[], start: string, end: string) {
  const allResults: any[] = [];
  for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
    const batch = productIds.slice(i, i + BATCH_SIZE);
    const res = await odooJsonCLient.searchRead<any>("stock.move", {
      domain: [
        ["product_id", "in", batch],
        ["state", "=", "done"],
        ["location_dest_id", "in", [8, 58, 62, 89, 99, 100, 105, 107, 121, 160, 169, 170, 180, 225, 226, 231, 232, 244, 245, 259, 261, 293]],
        ["location_id", "=", 4], // 4 est généralement l'ID de "Partners/Vendors" (Entrées fournisseurs)
        ["date", ">=", start],
        ["date", "<=", end]
      ],
      fields: ["product_id", "product_uom_qty"]
    });
    allResults.push(...res);
  }
  return allResults;
}