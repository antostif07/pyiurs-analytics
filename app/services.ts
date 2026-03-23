import { odooClient as odooJsonCLient } from "@/lib/odoo/odoo-json2-client";
import { POSOrderLine } from "./types/pos";

export async function getPOSOrderLines(productIds: number[]) {
  if (productIds.length === 0) {
    return { records: [] };
  }

  try {
    const CHUNK_SIZE = 1000;
    const chunks: number[][] = [];

    // 1️⃣ Découper les IDs en chunks
    for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
      chunks.push(productIds.slice(i, i + CHUNK_SIZE));
    }

    const allResults = [];

    for (const chunk of chunks) {
      const res = await odooJsonCLient.searchRead<POSOrderLine>('pos.order.line', {
        domain: [
          ["product_id", "in", chunk]
        ],
        fields: "id,qty,product_id".split(',')
      })
      
      allResults.push(...res);
    }
    return { records: allResults };
  } catch (e) {
    console.log(e);
  }
  return { records: []}
}