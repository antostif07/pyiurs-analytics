// utils/stockCalculations.ts

import { POSOrderLine } from "../types/pos";

// Fonction pour calculer les ventes des 30 derniers jours à partir des POS order lines
export function calculateSalesLast30Days(posOrderLines: POSOrderLine[], productVariantIds: number[]): Map<number, number> {
  const salesMap = new Map<number, number>();
  
  // Initialiser tous les produits à 0
  productVariantIds.forEach(id => salesMap.set(id, 0));
  
  // Calculer la date il y a 30 jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Filtrer et compter les ventes des 30 derniers jours
  posOrderLines.forEach((line: POSOrderLine) => {
    const productId = line.product_id[0];
    const createDate = new Date(line.create_date);
    
    // Vérifier si la vente est dans les 30 derniers jours
    if (createDate >= thirtyDaysAgo) {
      const currentQty = salesMap.get(productId) || 0;
      salesMap.set(productId, currentQty + (line.qty || 0));
    }
  });
  
  return salesMap;
}

// Fonction pour calculer les métriques de réapprovisionnement
export function calculateReplenishmentMetrics(
  stockActuel: number,
  ventes30Jours: number
): {
  dailySalesRate: number;
  daysUntilOutOfStock: number;
  estimatedOutOfStockDate: Date | null;
  recommendedReorderDate: Date | null;
} {
  // Si pas de ventes sur 30 jours ou stock nul
  if (ventes30Jours === 0 || stockActuel === 0) {
    return {
      dailySalesRate: 0,
      daysUntilOutOfStock: 0,
      estimatedOutOfStockDate: null,
      recommendedReorderDate: null,
    };
  }

  // Calcul de la vitesse de vente quotidienne
  const dailySalesRate = ventes30Jours / 30;
  
  // Jours restants avant rupture (arrondi à l'entier supérieur)
  const daysUntilOutOfStock = Math.ceil(stockActuel / dailySalesRate);
  
  // Date de rupture estimée
  const today = new Date();
  const estimatedOutOfStockDate = new Date(today);
  estimatedOutOfStockDate.setDate(today.getDate() + daysUntilOutOfStock);
  
  // Date de commande recommandée (7 jours avant rupture)
  const recommendedReorderDate = new Date(estimatedOutOfStockDate);
  recommendedReorderDate.setDate(estimatedOutOfStockDate.getDate() - 7);

  return {
    dailySalesRate: Number(dailySalesRate.toFixed(3)),
    daysUntilOutOfStock,
    estimatedOutOfStockDate,
    recommendedReorderDate,
  };
}

export function calculateLastSaleDate(
  posOrderLines: POSOrderLine[], 
  productVariantIds: number[]
): Map<number, Date> {
  const lastSaleMap = new Map<number, Date>();
  
  // Trier les lignes par date (les plus récentes d'abord)
  const sortedLines = [...posOrderLines].sort((a, b) => 
    new Date(b.create_date).getTime() - new Date(a.create_date).getTime()
  );
  
  // Pour chaque produit, trouver la dernière vente
  productVariantIds.forEach(id => {
    const lastSale = sortedLines.find(line => line.product_id[0] === id);
    if (lastSale) {
      lastSaleMap.set(id, new Date(lastSale.create_date));
    }
  });
  
  return lastSaleMap;
}