'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';

const SEGMENT_FIELD = 'product_id.product_tmpl_id.x_studio_segment';
const SEGMENT_VALUE = 'femme';

export type ReturnStat = {
  productId: number;
  productName: string;
  qtySold: number;
  qtyReturned: number;
  returnRate: number; // %
  lostRevenue: number;
};

export type RecentTransaction = {
  id: number;
  orderRef: string;
  date: string;
  product: string;
  qty: number;
  amount: number;
  type: 'SALE' | 'RETURN';
  salesperson: string;
};

export async function getOrdersAnalysis() {
  try {
    // Période : 90 derniers jours pour avoir une tendance fiable
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);
    const fmtDate = startDate.toISOString().split('T')[0];

    const domain = [
      [SEGMENT_FIELD, 'ilike', SEGMENT_VALUE],
      ['order_id.date_order', '>=', fmtDate],
      ['order_id.state', 'in', ['paid', 'done', 'invoiced']]
    ];

    // On récupère les lignes
    const lines = await odooClient('pos.order.line', 'search_read', [domain], {
      fields: ['product_id', 'qty', 'price_subtotal', 'order_id', 'create_date', 'display_name'],
      limit: 2000,
      order: 'create_date desc'
    }) as any[];

    // --- ANALYSE ---
    
    // 1. Stats Globales & Par Produit
    let totalSalesQty = 0;
    let totalReturnsQty = 0;
    let totalLostRevenue = 0;

    const productStats = new Map<number, { name: string, sold: number, returned: number, lost: number }>();

    // 2. Liste des Transactions Récentes (Formatée)
    const recentTransactions: RecentTransaction[] = [];

    lines.forEach((line) => {
      const pId = line.product_id[0];
      const pName = line.product_id[1];
      const qty = line.qty;
      const amount = line.price_subtotal;

      // Aggregation par Produit
      const current = productStats.get(pId) || { name: pName, sold: 0, returned: 0, lost: 0 };

      if (qty >= 0) {
        // VENTE
        totalSalesQty += qty;
        current.sold += qty;
      } else {
        // RETOUR (Quantité Négative)
        const absQty = Math.abs(qty);
        totalReturnsQty += absQty;
        totalLostRevenue += Math.abs(amount);
        
        current.returned += absQty;
        current.lost += Math.abs(amount);
      }
      productStats.set(pId, current);

      // Construction liste transactions (Top 50 seulement)
      if (recentTransactions.length < 50) {
        recentTransactions.push({
          id: line.id,
          orderRef: line.order_id[1], // ex: "Order 00123-001"
          date: line.create_date.split(' ')[0],
          product: pName,
          qty: qty,
          amount: amount,
          type: qty < 0 ? 'RETURN' : 'SALE',
          salesperson: 'Magasin' // On pourrait chercher le vendeur via order_id -> user_id
        });
      }
    });

    // 3. Calcul du Top Flops (Produits les plus retournés)
    // On ne garde que ceux qui ont > 0 retour
    const returnsBreakdown: ReturnStat[] = Array.from(productStats.values())
      .filter(p => p.returned > 0)
      .map(p => ({
        productId: 0, // Pas besoin ici
        productName: p.name,
        qtySold: p.sold,
        qtyReturned: p.returned,
        returnRate: p.sold > 0 ? Math.round((p.returned / (p.sold + p.returned)) * 100) : 100,
        lostRevenue: p.lost
      }))
      .sort((a, b) => b.qtyReturned - a.qtyReturned) // Tri par volume de retour
      .slice(0, 10); // Top 10

    // KPI Global
    const globalReturnRate = totalSalesQty > 0 
      ? ((totalReturnsQty / (totalSalesQty + totalReturnsQty)) * 100).toFixed(1) 
      : "0";

    return {
      kpi: {
        returnRate: globalReturnRate,
        totalReturns: totalReturnsQty,
        lostRevenue: totalLostRevenue
      },
      topReturns: returnsBreakdown,
      transactions: recentTransactions
    };

  } catch (error) {
    console.error("Orders Error:", error);
    return {
        kpi: { returnRate: "0", totalReturns: 0, lostRevenue: 0 },
        topReturns: [],
        transactions: []
    };
  }
}