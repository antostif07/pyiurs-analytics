// app/ceo-report/finance/_lib/types.ts

export interface FinanceKpis {
    invoicedOdoo: number;
    poCommitted: number;
    paid: number;
    remainingToPay: number;
    remainingCategory: string;
    landedCosts: number;
    landedCostsPercent: number;
    priceRequest: number;
    negotiatedSavings: number;
}

export interface PaymentComparisonRow {
    category: string;
    invoicedOdoo: number;
    paid: number;
    remaining: number;
}

export interface LandedCostRow {
    label: string;
    amount: number;
    percentPo: number;
}

export interface LandedCostTotal {
    amount: number;
    percentPo: number;
}

export type PaymentStatus = "Partiel" | "Total";

export interface PurchaseAuditRow {
    category: string;
    priceRequest: number;
    poAmount: number;
    receivedAmount: number;
    reliquatAmount: number;
    soldAmount: number;
    invoicedOdoo: number;
    paymentStatus: PaymentStatus;
    paidAmount: number;
}

export interface PurchaseAuditTotals {
    category: string;
    priceRequest: number;
    poAmount: number;
    receivedAmount: number;
    reliquatAmount: number;
    soldAmount: number;
    invoicedOdoo: number;
    status: string;
    paidAmount: number;
}

export interface FinanceResponse {
    kpis: FinanceKpis;
    paymentComparison: PaymentComparisonRow[];
    landedCosts: LandedCostRow[];
    landedCostsTotal: LandedCostTotal;
    auditRows: PurchaseAuditRow[];
    auditTotals: PurchaseAuditTotals;
}