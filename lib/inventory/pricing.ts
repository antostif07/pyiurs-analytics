// lib/inventory/pricing.ts

/**
 * Règle métier : prix de vente unitaire d'un produit.
 * - Beauty → list_price tel quel
 * - Autres segments → list_price × 1.25
 */
export function resolveSaleUnitPrice(
    listPrice: number,
    segment: string,
): number {
    if (!Number.isFinite(listPrice) || listPrice <= 0) return 0;
    if (segment.trim().toLowerCase() === "beauty") return listPrice;
    return listPrice * 1.25;
}

/**
 * Règle métier : prix de coût unitaire d'un produit.
 * - standard_price si > 0
 * - sinon list_price × 0.4
 */
export function resolveCostUnitPrice(
    standardPrice: number,
    listPrice: number,
): number {
    const std = Number(standardPrice);
    if (Number.isFinite(std) && std > 0) return std;
    const lp = Number(listPrice);
    if (Number.isFinite(lp) && lp > 0) return lp * 0.4;
    return 0;
}