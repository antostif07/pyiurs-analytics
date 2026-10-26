// app/inventory/stock-beauty/_lib/types.ts

export interface IndividualProductModel {
    id: number;
    name: string;
    productVariantId: number;
    listPrice: number;
    brand: string;
    color: string;
    category: string;
    stockByShop: Record<string, number>;
    total_stock: number;
    sales_last_30_days: number;
    last_sale_date?: string;
    parent_hs_code: string;
}

export interface StockBeautyModel {
    hs_code: string;
    name: string;
    brand: string;
    color: string;
    supplier: string;
    category: string;

    qty_available: number;
    stockByShop: Record<string, number>;
    total_stock: number;

    sales_last_30_days: number;
    daily_sales_rate: number;
    days_until_out_of_stock: number;
    estimated_out_of_stock_date?: string;
    recommended_reorder_date?: string;
    last_sale_date?: string;

    product_qty: number;
    qty_received: number;
    not_received: number;
    qty_sold: number;

    individualProducts: IndividualProductModel[];
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
    category?: string;
    supplier?: string;
    stock?: string;
}

export interface StockBeautyTotals {
    totalProducts: number;
    totalAvailable: number;
    totalSold: number;
}

export interface StockBeautyData {
    data: StockBeautyModel[];
    brands: string[];
    colors: string[];
    categories: string[];
    suppliers: string[];
    shops: string[];
}