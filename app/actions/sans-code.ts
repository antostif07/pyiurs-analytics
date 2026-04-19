"use server";

import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

interface FetchParams {
  from: string;
  to: string;
}

export async function getSansCodeSales({ from, to }: FetchParams) {
  const orderDomain: OdooDomain = [
    ["date_order", ">=", `${from} 00:00:00`],
    ["date_order", "<=", `${to} 23:59:59`],
    ["state", "in", ["paid", "done", "invoiced"]],
  ];

  const orders = await odooClient.searchRead<any>("pos.order", {
    domain: orderDomain,
    fields: [
      "config_id",
      "date_order",
      "pos_reference",
      "partner_id",
      "refund_orders_count", // 🔥 important
    ],
  });

  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);

  const lines = await odooClient.searchRead<any>("pos.order.line", {
    domain: [
      ["order_id", "in", orderIds],
      ["product_id.barcode", "in", ["SCBTY", "SCVF142"]],
    ],
    fields: ["order_id", "qty", "price_subtotal_incl"],
  });

  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const invoiceMap = new Map();

  for (const line of lines) {
    // ✅ ON GARDE UNIQUEMENT LES VENTES (PAS LES RETOURS)
    if (line.qty <= 0) continue;

    const orderId = line.order_id[0];
    const order = orderMap.get(orderId);
    if (!order) continue;

    if (!invoiceMap.has(orderId)) {
      invoiceMap.set(orderId, {
        id: orderId.toString(),
        posConfig: order.config_id?.[1] || "N/A",
        date: order.date_order.split(" ")[0],
        invoiceRef: order.pos_reference,
        clientName: order.partner_id
          ? order.partner_id[1]
          : "Client de passage",
        qtySansCode: 0,
        amountSansCode: 0,

        // ✅ SEULE INFO IMPORTANTE
        isRefunded: order.refund_orders_count > 0,
      });
    }

    const inv = invoiceMap.get(orderId);

    inv.qtySansCode += line.qty;
    inv.amountSansCode += line.price_subtotal_incl;
  }

  return Array.from(invoiceMap.values());
}