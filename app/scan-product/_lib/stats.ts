import type { Product } from './types';

export function getProductStats(product: Product) {
    let totalStock = 0;
    const variantKeys = new Set<string>();

    for (const store of product.stores) {
        for (const v of store.variants) {
            totalStock += v.quantity;
            variantKeys.add(`${v.size}-${v.color}`);
        }
    }

    return {
        storeCount: product.stores.length,
        totalStock,
        variantCount: variantKeys.size,
    };
}