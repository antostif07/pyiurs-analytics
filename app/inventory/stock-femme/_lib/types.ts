// app/inventory/stock-femme/_lib/types.ts

export interface BarcodeDetail {
    barcode: string;
    product_qty: number;
    qty_received: number;
    not_received: number;
    qty_sold: number;
    qty_available: number;
    /** Stock par boutique, indexé par `shops.name` */
    stockByShop: Record<string, number>;
    age: string;
    perf: number;
}

export interface ControlStockFemmeModel {
    name: string;
    brand: string;
    color: string;
    product_qty: number;
    qty_received: number;
    not_received: number;
    qty_sold: number;
    qty_available: number;
    imageUrl: string;
    age: string;
    /** Stock par boutique, indexé par `shops.name` */
    stockByShop: Record<string, number>;
    po_name: string;
    barcodes: string[];
    /** Barcodes avec stock > 0 par boutique */
    barcodesByShop: Record<string, string[]>;
    barcodeDetails: BarcodeDetail[];
}

export interface StockLevels {
    outOfStock: number;
    critical: number;
    low: number;
    good: number;
}

export interface FilterState {
    brand?: string;
    color?: string;
    stock?: string;
    partner?: string;
    purchase_order?: string;
    start_date?: string;
    end_date?: string;
}

export interface StockFemmeTotals {
    totalProducts: number;
    totalAvailable: number;
    totalSold: number;
}

export interface StockFemmeData {
    data: ControlStockFemmeModel[];
    brands: string[];
    colors: string[];
    partners: string[];
    orderNames: string[];
    /** Liste ordonnée des boutiques (générée depuis shop_locations) */
    shops: string[];
}