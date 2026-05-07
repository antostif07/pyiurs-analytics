"use server";

import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getClientProductHistory(partnerId: number) {
  try {
    // Récupérer les lignes de commande (POS) pour ce client
    const lines = await odooClient.searchRead<{
      product_id: [number, string];
      qty: number;
      price_unit: number;
      create_date: string;
    }>("pos.order.line", {
      domain: [["order_id.partner_id", "=", partnerId], ["order_id.state", "in", ["paid", "done"]]],
      fields: ["product_id", "qty", "price_unit", "create_date"],
      order: "create_date desc",
      limit: 50
    });

    if (!Array.isArray(lines)) return [];

    return lines
      .filter(l => Array.isArray(l.product_id))
      .map(l => ({
        id: l.product_id[0],
        name: l.product_id[1],
        qty: l.qty,
        price: l.price_unit,
        date: l.create_date
      }));
  } catch (error) {
    console.error("Erreur historique produits:", error);
    return [];
  }
}

export async function getRetentionAnalysis(monthOffset: number = 1) {
  try {
    const now = new Date();
    // Période de référence (ex: Mois dernier)
    const refStart = format(startOfMonth(subMonths(now, monthOffset)), "yyyy-MM-dd HH:mm:ss");
    const refEnd = format(endOfMonth(subMonths(now, monthOffset)), "yyyy-MM-dd HH:mm:ss");
    
    // Période actuelle (Mois en cours)
    const curStart = format(startOfMonth(now), "yyyy-MM-dd HH:mm:ss");

    // 1. Clients de la période de référence
    const refOrders = await odooClient.searchRead<{ partner_id: [number, string], amount_total: number }>("pos.order", {
      domain: [["date_order", ">=", refStart], ["date_order", "<=", refEnd], ["partner_id", "!=", false]],
      fields: ["partner_id", "amount_total"],
      limit: 15000 // Sécurité anti-crash si trop de données
    });

    // 2. Clients de la période actuelle
    const curOrders = await odooClient.searchRead<{ partner_id: [number, string], amount_total: number }>("pos.order", {
      domain: [["date_order", ">=", curStart], ["partner_id", "!=", false]],
      fields: ["partner_id", "amount_total"],
      limit: 15000 // Sécurité anti-crash
    });

    // 3. Construction des maps de comparaison
    const refMap = new Map();
    
    if (Array.isArray(refOrders)) {
      refOrders.forEach(o => {
        if (Array.isArray(o.partner_id)) {
          const [id, name] = o.partner_id;
          if (!refMap.has(id)) {
            refMap.set(id, { id, name, spentRef: 0, returned: false, spentCur: 0 });
          }
          refMap.get(id).spentRef += (o.amount_total || 0);
        }
      });
    }

    if (Array.isArray(curOrders)) {
      curOrders.forEach(o => {
        if (Array.isArray(o.partner_id)) {
          const [id] = o.partner_id;
          if (refMap.has(id)) {
            refMap.get(id).returned = true;
            refMap.get(id).spentCur += (o.amount_total || 0);
          }
        }
      });
    }

    const clients = Array.from(refMap.values());
    const totalRef = clients.length;
    const totalReturned = clients.filter(c => c.returned).length;
    const rate = totalRef > 0 ? Math.round((totalReturned / totalRef) * 100) : 0;

    return {
      clients: clients.sort((a, b) => b.spentRef - a.spentRef),
      stats: {
        totalRef,
        totalReturned,
        rate,
        target: 80,
        missingForTarget: Math.max(0, Math.ceil(totalRef * 0.8) - totalReturned)
      },
      periodName: format(subMonths(now, monthOffset), "MMMM yyyy")
    };
  } catch (error) {
    console.error("Erreur calcul rétention:", error);
    throw new Error("Erreur calcul rétention");
  }
}