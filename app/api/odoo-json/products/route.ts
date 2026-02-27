// app/api/odoo/products/route.ts

import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { NextResponse } from "next/server";

type Many2One = [number, string] | false;

interface ProductTemplate {
  id: number;
  name: string;
  list_price: number;
  categ_id: Many2One;
  hs_code: string | false;
  product_variant_id: Many2One;
  x_studio_many2one_field_21bvh: Many2One;
  x_studio_many2one_field_QyelN: Many2One;
  x_studio_many2one_field_Arl5D: Many2One;
  description_pickingin: string | false;
}

/**
 * Cache mémoire simple
 */
let cacheData: ProductTemplate[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 60 secondes

async function fetchProducts(): Promise<ProductTemplate[]> {
  const domain: Array<[string, string, unknown]> = [
    ["categ_id.name", "ilike", "beauty"],
    ["categ_id.name", "not ilike", "make-up"],
    ["active", "=", true],
    ["available_in_pos", "=", true],
  ];

  return odooClient.searchRead<ProductTemplate>("product.template", {
    domain,
    fields: [
      "id",
      "name",
      "list_price",
      "categ_id",
      "hs_code",
      "product_variant_id",
      "x_studio_many2one_field_21bvh",
      "x_studio_many2one_field_QyelN",
      "x_studio_many2one_field_Arl5D",
      "description_pickingin",
    ],
    limit: 20,
    order: "id desc",
  });
}

export async function GET() {
  try {
    const now = Date.now();

    // ✅ Si cache valide → on renvoie
    if (cacheData && now - cacheTimestamp < CACHE_DURATION) {
      return NextResponse.json({
        source: "cache",
        count: cacheData.length,
        data: cacheData,
      });
    }

    // 🔁 Retry simple si 429
    let products: ProductTemplate[];
    try {
      products = await fetchProducts();
      
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("429")
      ) {
        await new Promise((r) => setTimeout(r, 3000));
        products = await fetchProducts();
      } else {
        throw error;
      }
    }

    // 🔄 On met à jour le cache
    cacheData = products;
    cacheTimestamp = now;

    return NextResponse.json({
      source: "odoo",
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.log(error);
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}