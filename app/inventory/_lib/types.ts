export interface WarehouseItem {
    id: number;
    name: string;
    code?: string;
}

export interface CategoryItem {
    id: number | string;
    name: string;
}

export interface InventoryItem {
    warehouses: WarehouseItem[];
    categories: CategoryItem[];
}

// app/inventory/_lib/types.ts — ajouts

export type InventorySegment = "Tous" | "Femme" | "Beauty" | "Enfant";

export interface InventoryOverviewTotals {
    /** Nombre de produits distincts en stock */
    productCount: number;
    /** Nombre total d'unités (somme des quantités) */
    totalUnits: number;
    /** Valeur de vente ($) */
    saleValue: number;
    /** Valeur coût ($) */
    costValue: number;
    /** Marge implicite = saleValue - costValue */
    marginValue: number;
    /** Taux de marge = marginValue / saleValue × 100 */
    marginRate: number;
}

export interface InventoryOverviewCompanyRow {
    companyId: number;
    companyName: string;
    opening: InventoryStockSnapshot;
    closing: InventoryStockSnapshot;
    movements: InventoryMovements;
}

export interface InventoryOverviewData {
    period: { from: string; to: string };
    opening: InventoryStockSnapshot;
    closing: InventoryStockSnapshot;
    movements: InventoryMovements;
    byCompany: InventoryOverviewCompanyRow[];
}

export interface InventoryStockSnapshot {
    /** Nombre d'unités (somme des quantités) */
    totalUnits: number;
    /** Nombre de produits distincts présents */
    productCount: number;
    /** Valeur vente ($) */
    saleValue: number;
    /** Valeur coût ($) */
    costValue: number;
    /** Marge = saleValue - costValue */
    marginValue: number;
    /** Taux de marge (%) */
    marginRate: number;
}

export interface InventoryMovements {
    /** Total entrées dans la période */
    receivedUnits: number;
    /** Total sorties dans la période */
    soldUnits: number;
    /** Variation nette = received - sold */
    netVariation: number;
}

export interface InventoryFlowPoint {
    label: string;
    incoming: number;
    outgoing: number;
    cumulative: number;
}

export interface InventoryShopDistribution {
    name: string;
    value: number;
    color: string;
    /** Index signature pour compatibilité Recharts (ChartDataInput) */
    [key: string]: string | number;
}

export interface InventoryHeatmapCell {
    week: string;    // "S-3", "S-2", "S-1", "S-0"
    day: string;     // "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"
    value: number;
}

export interface InventoryAnalyticsData {
    flowSeries: InventoryFlowPoint[];
    shopDistribution: InventoryShopDistribution[];
    heatmapData: InventoryHeatmapCell[];
}

// app/inventory/_lib/types.ts — ajouts

export interface InventoryItemRow {
    productId: number;
    productName: string;
    barcode: string | null;
    brand: string | null;
    color: string | null;
    segment: string | null;
    quantity: number;
    saleUnit: number;
    costUnit: number;
    saleValue: number;
    costValue: number;
    marginValue: number;
}

export type InventoryItemSortKey =
    | "saleValue_desc"
    | "saleValue_asc"
    | "quantity_desc"
    | "quantity_asc"
    | "marginValue_desc"
    | "marginValue_asc"
    | "productName_asc"
    | "productName_desc";

export interface InventoryItemsResponse {
    items: InventoryItemRow[];
    total: number;
    page: number;
    pageSize: number;
    sort: InventoryItemSortKey;
}