// services.ts
import { odooClient as odooJsonCLient } from "@/lib/odoo/odoo-json2-client";
import { getPOSOrderLines } from "@/app/services";

const EXCHANGE_RATES: Record<string, number> = {
  "EUR": 1.09,    // 1 Euro = 1.09 USD
  "CDF": 0.00036, // Exemple Franc Congolais vers USD
  "GBP": 1.27,
  // Ajoutez d'autres devises ici
};

function convertToUSD(price: number, currencyM2O: any): number {
  if (!currencyM2O || !Array.isArray(currencyM2O)) return price;
  
  const currencyLabel = currencyM2O[1];

  if (currencyLabel.includes("USD") || currencyLabel.includes("$")) {
    return price;
  }

  const code = currencyLabel.substring(0, 3).toUpperCase();
  const rate = EXCHANGE_RATES[code];

  if (rate) {
    return price * rate;
  }

  console.warn(`⚠️ Taux de change non trouvé pour ${currencyLabel}, utilisation du prix tel quel.`);
  return price;
}

export async function getPologPerformanceData(startDate: string, endDate: string) {
  const productsRaw = await getProductsCreatedBetween(startDate, endDate);
  if (productsRaw.length === 0) return [];

  const variantIds = productsRaw.map(p => p.product_variant_id[0]);
  const posLines = await getPOSOrderLines(variantIds);
  const purchaseLines = await getPurchasePriceLines(variantIds);

  const purchaseMetricsMap = new Map<number, { unitCostUSD: number, totalQtyPurchased: number }>();

  purchaseLines.forEach(line => {
    const prodId = line.product_id[0];
    const priceInUSD = convertToUSD(line.price_unit, line.currency_id);
    
    if (!purchaseMetricsMap.has(prodId)) {
      purchaseMetricsMap.set(prodId, { 
        unitCostUSD: priceInUSD, 
        totalQtyPurchased: line.product_qty
      });
    } else {
      const current = purchaseMetricsMap.get(prodId)!;
      current.totalQtyPurchased += line.product_qty;
    }
  });

  const salesMap = new Map<number, number>();
  posLines.records.forEach(line => {
    const productId = line.product_id[0];
    salesMap.set(productId, (salesMap.get(productId) || 0) + line.qty);
  });

  const pologGroups = new Map<string, any>();

  productsRaw.forEach(product => {
    const polog = product.description_pickingin;
    const variantId = product.product_variant_id[0];

    const metrics = purchaseMetricsMap.get(variantId);
    const unitCost = metrics?.unitCostUSD || product.standard_price || 0;
    const qtyPurchased = metrics?.totalQtyPurchased || 0;
    const qtySold = salesMap.get(variantId) || 0;
    const unitPrice = product.list_price || 0;

    if (!pologGroups.has(polog)) {
      pologGroups.set(polog, {
        polog,
        productCount: 0,
        qtySold: 0,
        totalCostSold: 0,
        totalPurchaseValue: 0,
        totalRevenue: 0,
      });
    }

    const group = pologGroups.get(polog);
    group.productCount += 1;
    group.qtySold += qtySold;
    group.totalCostSold += (qtySold * unitCost);
    group.totalPurchaseValue += (qtyPurchased * unitCost); // Calcul de l'investissement total
    group.totalRevenue += (qtySold * unitPrice);
  });

  return Array.from(pologGroups.values()).map(group => ({
    ...group,
    netProfit: group.totalRevenue - group.totalCostSold,
    // Pourcentage de récupération de l'investissement
    roi: group.totalPurchaseValue > 0 ? (group.totalRevenue / group.totalPurchaseValue) * 100 : 0,
    margin: group.totalRevenue > 0 ? parseFloat(((group.totalRevenue - group.totalCostSold) / group.totalRevenue * 100).toFixed(2)) : 0
  })).sort((a, b) => b.netProfit - a.netProfit);
}

/**
 * Récupère les lignes d'achat pour obtenir le prix unitaire réel
 */
async function getPurchasePriceLines(variantIds: number[]) {
  const BATCH_SIZE = 500;
  const allResults = [];
  
  for (let i = 0; i < variantIds.length; i += BATCH_SIZE) {
    const batch = variantIds.slice(i, i + BATCH_SIZE);
    const res = await odooJsonCLient.searchRead('purchase.order.line', {
      domain: [
        ['product_id', 'in', batch],
        ['state', 'in', ['purchase', 'done']] // Uniquement les commandes confirmées
      ],
      fields: ['product_id', 'price_unit', 'currency_id', 'product_qty', 'date_order'],
      order: 'date_order desc' // La plus récente en premier
    });
    allResults.push(...(res as any[]));
  }
  return allResults;
}

/**
 * Fonction utilitaire pour récupérer les produits par date (déjà définie précédemment)
 */
async function getProductsCreatedBetween(start: string, end: string) {
    const pageSize = 1000;
    let offset = 0;
    let results: any[] = [];
  
    while (true) {
      const batch = await odooJsonCLient.searchRead<any>("product.template", {
        domain: [
          ["create_date", ">=", start + " 00:00:00"],
          ["create_date", "<=", end + " 23:59:59"],
          ["description_pickingin", "!=", false]
        ],
        fields: ["id", "name", "list_price", "standard_price", "description_pickingin", "product_variant_id"],
        limit: pageSize,
        offset,
      });
      results = results.concat(batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    return results;
}