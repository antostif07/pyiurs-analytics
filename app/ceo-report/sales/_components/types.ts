// app/ceo-report/sales/_components/types.ts

export interface StoreColumn {
    id: string;      // ex: 'p24'
    code: string;    // ex: 'P24 ($)'
    name: string;    // ex: 'Boutique P24'
}

export interface CategoryMatrixRow {
    categoryId: string;
    categoryName: string; // 'Femme', 'Kids', 'Beauty'
    storeValues: Record<string, number>; // { p24: 12500, p_mto: 9800, ... }
    totalRealized: number; // 50 000 $
    budgetTarget: number;  // 47 500 $
    varianceAmount: number; // +2 500 $
    variancePercent: number; // +5.3 %
}

export interface SalesMatrixData {
    periodLabel: string;
    stores: StoreColumn[];
    rows: CategoryMatrixRow[];
    totals: {
        totalRealizedByStore: Record<string, number>;
        totalRealizedGlobal: number;
        varianceAmountByStore: Record<string, number>;
        totalVarianceGlobal: number;
        totalVariancePercentGlobal: number;
    };
}