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
  if (productsRaw.length === 0) return { data: [], allPurchaseOrders: [] };

  const variantIds = productsRaw.map(p => p.product_variant_id[0]);
  const posLines = await getPOSOrderLines(variantIds);
  
  // MODIFICATION : On s'assure de récupérer 'order_id'
  const purchaseLines = await getPurchasePriceLines(variantIds);

  const purchaseMetricsMap = new Map<number, any>();
  const allPoSet = new Set<string>(); // Pour la liste globale des filtres

  purchaseLines.forEach(line => {    
    const prodId = line.product_id[0];
    const poName = line.order_id[1]; // Exemple: "PO00123"
    allPoSet.add(poName);

    const priceInUSD = convertToUSD(line.price_unit, line.currency_id);
    
    if (!purchaseMetricsMap.has(prodId)) {
      purchaseMetricsMap.set(prodId, { 
        unitCostUSD: priceInUSD, 
        totalQtyPurchased: line.product_qty,
        totalQtyReceived: line.qty_received || 0,
        associatedPos: [poName] // On stocke les PO associés à ce produit
      });
    } else {
      const current = purchaseMetricsMap.get(prodId)!;
      current.totalQtyPurchased += line.product_qty;
      current.totalQtyReceived += (line.qty_received || 0);
      if (!current.associatedPos.includes(poName)) current.associatedPos.push(poName);
    }
  });

  const salesMap = new Map<number, number>();
  posLines.records.forEach(line => {
    salesMap.set(line.product_id[0], (salesMap.get(line.product_id[0]) || 0) + line.qty);
  });

  const pologGroups = new Map<string, any>();

  productsRaw.forEach(product => {
    const polog = product.description_pickingin;
    const variantId = product.product_variant_id[0];
    const metrics = purchaseMetricsMap.get(variantId);
    
    const qtySold = salesMap.get(variantId) || 0;
    const unitCost = metrics?.unitCostUSD || product.standard_price || 0;
    const unitPrice = product.list_price || 0;

    if (!pologGroups.has(polog)) {
      pologGroups.set(polog, {
        polog,
        productCount: 0,
        qtyPurchased: 0,
        qtyReceived: 0,
        qtySold: 0,
        totalCostSold: 0,
        totalPurchaseValue: 0,
        totalRevenue: 0,
        purchaseOrders: new Set<string>(), // Liste des PO pour ce POLOG
      });
    }

    const group = pologGroups.get(polog);
    group.productCount += 1;
    group.qtyPurchased += metrics?.totalQtyPurchased || 0;
    group.qtyReceived += metrics?.totalQtyReceived || 0;
    group.qtySold += qtySold;
    group.totalCostSold += (qtySold * unitCost);
    group.totalPurchaseValue += ((metrics?.totalQtyPurchased || 0) * unitCost);
    group.totalRevenue += (qtySold * unitPrice);
    
    // On ajoute les PO de ce produit au groupe POLOG
    metrics?.associatedPos.forEach((po: string) => group.purchaseOrders.add(po));
  });

  const data = Array.from(pologGroups.values()).map(group => ({
    ...group,
    purchaseOrders: Array.from(group.purchaseOrders), // Conversion en array pour le client
    netProfit: group.totalRevenue - group.totalCostSold,
    roi: group.totalPurchaseValue > 0 ? (group.totalRevenue / group.totalPurchaseValue) * 100 : 0,
    margin: group.totalRevenue > 0 ? parseFloat(((group.totalRevenue - group.totalCostSold) / group.totalRevenue * 100).toFixed(2)) : 0
  })).sort((a, b) => b.netProfit - a.netProfit);

  return {
    data,
    allPurchaseOrders: Array.from(allPoSet).sort()
  };
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
        ['state', 'in', ['purchase', 'done']],
        ['partner_id', "not in", [24099, 1, ]]
      ],
      fields: [
        'product_id', 'price_unit', 'currency_id', 'product_qty', 'date_order', "qty_received",
        "order_id"
      ],
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

export async function getPologDetailData(pologId: string) {
  const products = await odooJsonCLient.searchRead<any>("product.template", {
    domain: [["description_pickingin", "=", pologId]],
    fields: [
      "id", 
      "name", 
      "list_price", 
      "standard_price", 
      "hs_code", 
      "product_variant_id",
      "x_studio_segment",
      "x_studio_many2one_field_21bvh", // brand
      "x_studio_many2one_field_Arl5D"  // color/gamme
    ],
  });

  if (products.length === 0) return null;

  const variantIds = products.map(p => p.product_variant_id[0]);
  const posLines = await getPOSOrderLines(variantIds);
  const purchaseLines = await getPurchasePriceLines(variantIds);

  // Maps pour calculs (Ventes et Achats)
  const salesMap = new Map();
  posLines.records.forEach(l => salesMap.set(l.product_id[0], (salesMap.get(l.product_id[0]) || 0) + l.qty));

  const purchaseMap = new Map();
  purchaseLines.forEach(l => {
    const pid = l.product_id[0];
    const cost = convertToUSD(l.price_unit, l.currency_id);
    if (!purchaseMap.has(pid)) {
      purchaseMap.set(pid, { 
        cost, 
        qtyOrdered: l.product_qty, 
        qtyReceived: l.qty_received // Récupération de la quantité reçue
      });
    } else {
      const entry = purchaseMap.get(pid);
      entry.qtyOrdered += l.product_qty;
      entry.qtyReceived += l.qty_received;
    }
  });

  // Groupement par HS_CODE + COULEUR
  const groupsMap = new Map<string, any>();

  products.forEach(p => {
    const vId = p.product_variant_id[0];
    const hsCode = p.hs_code || "SANS_CODE";
    const color = p.x_studio_many2one_field_Arl5D?.[1] || "SANS_COULEUR";
    const groupKey = `${hsCode}-${color}`;

    const sales = salesMap.get(vId) || 0;
    const purchase = purchaseMap.get(vId) || { cost: p.standard_price || 0, qty: 0 };
    
    const revenue = sales * p.list_price;
    const profit = revenue - (sales * purchase.cost);

    const productDetail = {
      id: p.id,
      name: p.name,
      qtyOrdered: purchase.qtyOrdered,
      qtyReceived: purchase.qtyReceived, // Nouveau
      qtySold: sales,
      revenue,
      profit,
      stock: purchase.qtyReceived  - sales,
      image: `${hsCode}_${p.x_studio_segment === "Femme" ? color : ""}.jpg` 
    };

    if (!groupsMap.has(groupKey)) {
      // Nettoyage du nom du premier produit pour le titre du groupe
      const trimmedName = p.x_studio_segment === "Beauty" 
        ? `${p.name.split("[").shift()} - (${p.list_price}$)` : 
      `${p.name.split("[")[0].split("-")[1]} - ${hsCode} - (${p.list_price}$)`;
      
      groupsMap.set(groupKey, {
        groupKey,
        hsCode,
        color,
        displayName: trimmedName,
        brand: p.x_studio_many2one_field_21bvh?.[1] || "N/A",
        image: `${hsCode}_${p.x_studio_segment === "Femme" ? color : ""}.jpg`,
        qtyOrdered: 0,
        qtyReceived: 0,
        qtySold: 0,
        revenue: 0,
        profit: 0,
        subRows: [] // Les produits individuels
      });
    }

    const group = groupsMap.get(groupKey);
    group.qtyOrdered += productDetail.qtyOrdered;
    group.qtyReceived += productDetail.qtyReceived;
    group.qtySold += productDetail.qtySold;
    group.revenue += productDetail.revenue;
    group.profit += productDetail.profit;
    group.subRows.push(productDetail);
  });

  const finalGroups = Array.from(groupsMap.values());

  return {
    pologId,
    groups: finalGroups,
    summary: {
      totalRevenue: Array.from(groupsMap.values()).reduce((a, b) => a + b.revenue, 0),
      totalProfit: Array.from(groupsMap.values()).reduce((a, b) => a + b.profit, 0),
      totalReceived: Array.from(groupsMap.values()).reduce((a, b) => a + b.qtyReceived, 0),
      totalSold: Array.from(groupsMap.values()).reduce((a, b) => a + b.qtySold, 0)
    }
  };
}