export type PaymentBucket = "cash" | "bank" | "mobile" | "onl" | "other";

export interface ShopOption {
    id: number;
    name: string;
    companyId: number | null;
    companyName: string | null;
}

export interface ShopSegmentRow {
    shopId: number;
    shopName: string;
    femme: number;
    enfant: number;
    beauty: number;
    autres: number;
    total: number;
}

export interface ClosingSaleItem {
    id: number;
    name: string;
    dateOrder: string;
    amountTotal: number;
    partnerName: string;
    shopId: number;
    shopName: string;
    paymentBucket: PaymentBucket;
    paymentMethodLabel: string;
}

export interface ClosingExpenseItem {
    id: number;
    name: string;
    date: string;
    amount: number;
    companyId: number | null;
    productName: string;
    categoryName: string;
    isEpargne: boolean;
}

export interface ExistingClosureSummary {
    id: string;
    openingDate: string;
    closingDate: string;
    closureStatus: string;
    shopId: number;
    shopName: string | null;
}

export interface DailyClosingReport {
    date: string;
    shop: string; // 'all' ou ID string
    exchangeRate: number;
    shops: ShopOption[];
    kpis: {
        dailySalesTotal: number;
        totalOrders: number;
        expensesTotal: number;
        principalExpensesTotal: number;
        epargneExpensesTotal: number;
        expectedCash: number;
    };
    payments: {
        cash: { total: number; count: number };
        bank: { total: number; count: number };
        mobile: { total: number; count: number };
        onl: { total: number; count: number };
    };
    segmentTotals: {
        femme: number;
        enfant: number;
        beauty: number;
        autres: number;
        total: number;
    };
    shopMatrix: ShopSegmentRow[];
    sales: ClosingSaleItem[];
    expenses: ClosingExpenseItem[];
    existingClosure: ExistingClosureSummary | null;
}

export interface ClotureFilter {
    date: string; // yyyy-MM-dd
    shop: string; // 'all' ou POS ID
}