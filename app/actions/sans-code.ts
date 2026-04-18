"use server";

import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

interface FetchParams {
  from: string;
  to: string;
}

export async function getSansCodeSales({ from, to }: FetchParams) {
  // 1. Récupération des commandes avec les champs de remboursement
  const orderDomain: OdooDomain = [
    ["date_order", ">=", `2026-01-01 00:00:00`],
    ["date_order", "<=", `${to} 23:59:59`],
    ["state", "in", ["paid", "done", "invoiced"]],
  ];

  const orders = await odooClient.searchRead<any>("pos.order", {
    domain: orderDomain,
    // On ajoute 'refunded_order_id' pour détecter les retours
    fields: ["config_id", "date_order", "pos_reference", "partner_id", "amount_total", "refunded_order_id"],
  });

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  // 2. Récupération des lignes "Sans Code" (SCBTY, SCVF142)
  const lineDomain: OdooDomain = [
    ["order_id", "in", orderIds],
    ["product_id.barcode", "in", ["SCBTY", "SCVF142"]],
  ];

  const lines = await odooClient.searchRead<any>("pos.order.line", {
    domain: lineDomain,
    fields: ["order_id", "qty", "price_subtotal_incl"],
  });

  const orderLookup = new Map();
  orders.forEach((o) => orderLookup.set(o.id, o));

  // 3. Agrégation des données
  const invoiceMap = new Map();

  for (const line of lines) {
    const orderId = line.order_id[0];
    const orderInfo = orderLookup.get(orderId);
    if (!orderInfo) continue;

    if (!invoiceMap.has(orderId)) {
      invoiceMap.set(orderId, {
        id: orderId.toString(),
        posConfig: orderInfo.config_id[1],
        date: orderInfo.date_order.split(" ")[0],
        invoiceRef: orderInfo.pos_reference,
        clientName: orderInfo.partner_id ? orderInfo.partner_id[1] : "Client de passage",
        qtySansCode: 0,
        amountSansCode: 0,
        // Info sur le remboursement
        isRefund: orderInfo.amount_total < 0, // Si le montant total est négatif, c'est un retour
        refundLink: orderInfo.refunded_order_id ? orderInfo.refunded_order_id[1] : null, // Référence de la facture originale si c'est un retour
      });
    }

    const inv = invoiceMap.get(orderId);
    inv.qtySansCode += line.qty;
    inv.amountSansCode += line.price_subtotal_incl;
  }

  return Array.from(invoiceMap.values());
}