"use server";

import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { POSOrder, POSOrderLine } from "../types/pos";
import { OdooProductTemplate, ProductProduct } from "../types/product_template";
import { getProducts, getSalesData } from "./odoo";

export async function getInventoryKpis(warehouseIds: number[], dateRange: { from: Date; to: Date }) {
  try {
    const start = dateRange.from.toISOString().replace('T', ' ').split('.')[0];
    const end = dateRange.to.toISOString().replace('T', ' ').split('.')[0];
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    const products = await getProducts({});
    const allProductIds = products.map(p => p.id);

    if(allProductIds.length === 0) {
      return { openingStock: 0, qtyReceived: 0, qtySold: 0, closingStock: 0, receivedSpark: [], salesSpark: [] };
    }

    const salesLines = await getSalesData({ from: start, to: end, productIds: allProductIds });

    // On agrège les ventes par jour pour le sparkline
    const salesByDay: Record<string, number> = {};
    salesLines.filter(line => line.product_id[0] !== 325965 && line.product_id[0] !== 514458).forEach(line => {
      const dateKey = line.create_date.split(" ")[0];
      
        salesByDay[dateKey] = (salesByDay[dateKey] || 0) + ((line.qty) || 0);
    });

    const sales = Object.entries(salesByDay).map(([date, qty]) => ({ date, v: qty }));

    console.log("Sales Spark Data:", sales);
    const qtySold = sales.reduce((acc, curr) => acc + (curr.v || 0), 0);
    
    
    // --- ÉTAPE 1 : RÉCUPÉRER LES IDS DES EMPLACEMENTS PAR USAGE ---
    // On fait cela en amont pour éviter l'erreur de "property field"
    const [supplierLocs,] = await Promise.all([
      odooClient.searchRead("stock.location", { domain: [["usage", "=", "supplier"]], fields: ["id"] })
    ]);

    const supplierLocIds = supplierLocs.map((l: any) => l.id);

    // --- ÉTAPE 2 : IDENTIFIER LES ENTREPÔTS BC/DC ---
    const bcWarehouses = await odooClient.searchRead("stock.warehouse", {
      domain: ["|", ["code", "ilike", "BC"], ["code", "ilike", "DC"]] as any,
      fields: ["id"]
    });
    const bcIds = bcWarehouses.map((w: any) => w.id);

    // --- ÉTAPE 3 : STOCK ACTUEL (QUANTITÉ EN MAIN) ---
    const currentQuant = await odooClient.readGroup<{ inventory_quantity: number }>("stock.quant", {
      domain: [["warehouse_id", "in", warehouseIds], ["location_id.usage", "=", "internal"]],
      fields: ["inventory_quantity"],
      groupby: [],
    });
    const stockNow = currentQuant[0]?.inventory_quantity || 0;

    // --- ÉTAPE 4 : RÉCEPTIONS FOURNISSEURS (Vers BC) ---
    // On utilise les IDs récupérés à l'étape 1
    const supplierReceptions = await odooClient.readGroup<{ product_uom_qty: number }>("stock.move", {
      domain: [
        ["state", "=", "done"],
        ["date", ">=", start],
        ["date", "<=", end],
        ["location_id", "in", supplierLocIds], // Source = ID FOURNISSEUR
        ["warehouse_id", "in", bcIds]          // Dest = Entrepot BC
      ],
      fields: ["product_uom_qty"],
      groupby: ["date:day"],
    });
    const qtyReceived = supplierReceptions.reduce((acc, curr) => acc + (curr.product_uom_qty || 0), 0);

    // --- ÉTAPE 6 : CALCUL DU STOCK INITIAL (OUVERTURE) ---
    // Flux net = Entrées - Sorties depuis le début de la période
    const netChange = await odooClient.readGroup<{ product_uom_qty: number }>("stock.move", {
      domain: [
        ["state", "=", "done"],
        ["date", ">=", start],
        ["date", "<=", now],
        ["warehouse_id", "in", warehouseIds]
      ],
      fields: ["product_uom_qty"],
      groupby: ["location_id", "location_dest_id"], // On ne peut pas mettre .usage ici
      lazy: false
    });

    // Note: Dans une version simplifiée, on calcule le delta des mouvements
    // Pour une précision 100%, il faudrait vérifier si location_id ou location_dest_id 
    // appartient à l'un des warehouseIds.
    let totalIn = 0;
    let totalOut = 0;
    // Logique simplifiée du flux net pour l'exemple
    netChange.forEach((m: any) => {
        totalIn += m.product_uom_qty;
    });

    const openingStock = stockNow - (qtyReceived - qtySold); // Version simplifiée
    const closingStock = openingStock + qtyReceived - qtySold;

    return {
      openingStock: Math.max(0, openingStock),
      qtyReceived,
      qtySold,
      closingStock: Math.max(0, closingStock),
      receivedSpark: supplierReceptions.map(m => ({ v: m.product_uom_qty })),
      salesSpark: sales,
    };
  } catch (error) {
    console.error("Kpi Error:", error);
    return { openingStock: 0, qtyReceived: 0, qtySold: 0, closingStock: 0, receivedSpark: [], salesSpark: [] };
  }
}