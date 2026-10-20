// app/inventory/rebalancing/_lib/types.ts

/**
 * Compagnie disponible dans le sélecteur.
 * Source : table `shops` (Supabase).
 */
export interface RebalancingCompany {
    id: string;              // UUID Supabase
    name: string;            // "PB.24", "PB.KTM"…
    odooCompanyId: number;   // 1, 4, 5, 6, 8
}

export interface RebalancingRow {
    quantId: number;
    odooProductId: number;
    productName: string;
    barcode: string | null;
    locationId: number;
    locationName: string;
    shopId: string | null;
    shopName: string | null;
    quantity: number;
    unitCost: number;
    listPrice: number;
    value: number;
    /** Sources positives possibles (où le produit existe en stock) */
    sources: RebalancingSource[];
}

export interface RebalancingTotals {
    count: number;
    totalQty: number;
    totalValue: number;
    withSource: number;
    lostCount: number;
}

export interface RebalancingResponse {
    companyId: number;
    rows: RebalancingRow[];
    totals?: RebalancingTotals;
    shopsWithoutLocations: { id: string; name: string }[];
}

export interface RebalancingSource {
    quantId: number;
    locationId: number;
    locationName: string;
    locationCompleteName: string | null;
    companyId: number;
    companyName: string;
    shopId: string | null;
    shopName: string | null;
    quantity: number;
    /** true si la location fait partie d'une shop configurée */
    isConfigured: boolean;
}