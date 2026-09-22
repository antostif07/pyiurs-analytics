import { odooClient } from "@/lib/odoo/odoo-json2-client";

export interface QuantRecord {
    product_id: [number, string];
    quantity: number;
    location_id: [number, string];
}

interface ProductRecord {
    id: number;
    standard_price: number;
    x_studio_segment: "Femme" | "Beauty" | "Enfant" | false;
    x_studio_many2one_field_QyelN: [number, string] | false;
}

/**
 * Cartographie des emplacements internes par point de vente / entité
 */
export const STORE_LOCATIONS = {
    PB_BC: [226, 200, 220, 232],  // Emplacements Magasin Central (P.BC)
    PB_MTO: [180],                // Emplacement Boutique MTO
    PB_KTM: [245, 300, 170],      // Emplacements Boutique KTM
    PB_LMB: [293, 244, 160],      // Emplacements Boutique LMB
    P24: [89],                    // Emplacement Boutique 24
} as const;

/**
 * Liste aplatie de tous les IDs d'emplacements pour le domain Odoo global
 */
export const TARGET_LOCATION_IDS: number[] = Object.values(STORE_LOCATIONS).flat();

export async function fetchAllInternalQuants(): Promise<QuantRecord[]> {
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;
    const allQuants: QuantRecord[] = [];

    while (hasMore) {
        const batch = await odooClient.searchRead<QuantRecord>("stock.quant", {
            domain: [
                ["location_id", "in", TARGET_LOCATION_IDS],
                ["quantity", "!=", 0], // ✅ Capture le stock positif ET négatif
            ],
            fields: ["product_id", "quantity", "location_id"],
            limit: BATCH_SIZE,
            offset: offset,
            order: "id asc",
        });

        allQuants.push(...batch);

        // Si on a reçu moins que le BATCH_SIZE, on a atteint la fin de la table
        if (batch.length < BATCH_SIZE) {
            hasMore = false;
        } else {
            offset += BATCH_SIZE;
        }
    }

    return allQuants;
}

export async function fetchAllQuantsProducts(productIds: number[]): Promise<ProductRecord[]> {
    const PRODUCT_BATCH_SIZE = 500;
    const products: ProductRecord[] = [];

    // 1. Découpage et exécution séquentielle par paquets de 500 IDs
    for (let i = 0; i < productIds.length; i += PRODUCT_BATCH_SIZE) {
        const chunkIds = productIds.slice(i, i + PRODUCT_BATCH_SIZE);

        const chunkProducts = await odooClient.searchRead<ProductRecord>("product.product", {
            domain: [["id", "in", chunkIds]],
            fields: ["id", "standard_price", "x_studio_segment", "x_studio_many2one_field_QyelN",],
            limit: chunkIds.length,
        });

        products.push(...chunkProducts);
    }

    return products;
}