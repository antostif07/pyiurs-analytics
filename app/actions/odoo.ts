"use server";
import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { ProductProduct } from "../types/product_template";
import { POSOrderLine } from "../types/pos";

// Récupérer la liste réelle des entrepôts/boutiques depuis Odoo
export async function getOdooWarehouses() {
  try {
    const warehouses = await odooClient.searchRead<{ id: number; name: string; code: string }>(
      "stock.warehouse",
      { fields: ["id", "name", "code"] }
    );
    return warehouses;
  } catch (error) {
    console.error("Failed to fetch warehouses:", error);
    return [];
  }
}

// Exemple de fonction pour récupérer l'état global (KPIs)
export async function getStockStatus(warehouseIds: number[]) {
  // Logique Odoo pour récupérer les stocks
  // Par exemple via stock.quant ou stock.valuation.layer
  return { lastSync: new Date().toISOString() };
}

export async function getInventoryMetadata() {
  try {
    // Récupère les boutiques/entrepôts
    const warehouses = await odooClient.searchRead<{ id: number; name: string; code: string }>(
      "stock.warehouse",
      {
        fields: ["id", "name", "code"],
        domain: [['id', 'in', [1,34,18,19,20,21,22,25,26]]]
      }
    );

    // Récupère les catégories de produits (Habillement, Cosmétique, etc.)
    const categories = await odooClient.searchRead<{ id: number; name: string }>(
      "product.category",
      { fields: ["id", "name"], domain: [['parent_id', '!=', false]] } // Filtre pour éviter la catégorie "All"
    );

    return { warehouses, categories };
  } catch (error) {
    console.error("Odoo Metadata Error:", error);
    return { warehouses: [], categories: [] };
  }
}

// Récupérer les produits avec pagination pour éviter les timeouts
export async function getProducts(filters: any): Promise<ProductProduct[]> {
  const pageSize = 5000;
  let offset = 0;
  let allProducts: ProductProduct[] = [];

  const domain: OdooDomain = [];
  while (true) {
    const batch = await odooClient.searchRead<ProductProduct>("product.product", {
      domain: domain,
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

export async function getSalesData({from, to, productIds}: {from: string, to: string, productIds: number[]}): Promise<POSOrderLine[]> {
  let domain: OdooDomain = [["order_id.state", "in", ["paid", "done", "invoiced"]]];

  if (from) {
    domain.push(["order_id.date_order", ">=", from]);
  }
  if (to) {
    domain.push(["order_id.date_order", "<=", to]);
  }

  if (productIds && productIds.length > 0) {
    // Batching des IDs produits pour ne pas casser l'URL
    const BATCH_SIZE = 2000;
    let allLines: POSOrderLine[] = [];
  
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batchIds = productIds.slice(i, i + BATCH_SIZE);
      const batch = await odooClient.searchRead<POSOrderLine>("pos.order.line", {
          domain: [
              ...domain,
              ["product_id", "in", batchIds]
          ],
          fields: ["id", "product_id", "qty", "price_subtotal_incl", "price_unit", "create_date", "order_id"],
      });
      allLines = allLines.concat(batch);
    }
    return allLines;
  }
  
  return await odooClient.searchRead<POSOrderLine>("pos.order.line", {
    domain,
    fields: ["id", "product_id", "qty", "price_subtotal_incl", "price_unit", "create_date"],
  });
}