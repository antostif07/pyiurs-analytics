export interface DailySaleMetric {
    amount: number;
    quantity: number;
}

export interface BeautyProductRow {
    id: string;
    name: string;
    totalAmount: number;
    totalQuantity: number;
    dailySales: Record<string, DailySaleMetric>;
}

export interface BeautyHsGroupRow {
    id: string;
    name: string;
    hsCode: string;
    totalAmount: number;
    totalQuantity: number;
    dailySales: Record<string, DailySaleMetric>;
    products: BeautyProductRow[];
}

export interface BeautyBrandRow {
    id: string;
    name: string;
    totalAmount: number;
    totalQuantity: number;
    dailySales: Record<string, DailySaleMetric>;
    hsGroups: BeautyHsGroupRow[];
}

export interface BeautyShopOption {
    id: number;
    name: string;
    companyId: number | null;
}

export interface BeautyBrandsFilter {
    boutique: string; // 'all' ou POS ID
    month: number;    // 1..12
    year: number;
}

export interface BeautyBrandsReportData {
    filters: BeautyBrandsFilter;
    boutiques: BeautyShopOption[];
    brands: BeautyBrandRow[];
    dateRange: string[];
    kpis: {
        totalAmount: number;
        totalQuantity: number;
        brandCount: number;
        productCount: number;
        averagePerBrand: number;
    };
}