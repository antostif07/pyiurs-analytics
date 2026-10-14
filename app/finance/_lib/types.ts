// app/finance/cash-flow/_lib/types.ts

export type SalesMethodKey = "TOTAL" | "TMB" | "RAWBANK" | "MPESA" | "CASH";
export type ExpenseMethodKey = "TOTAL" | "E.PDV" | "E.BC" | "E.STK" | "AUTRES";

export interface CashflowCompany {
    id: number;
    name: string;      // "P.24", "P.LMB"…
    shopName: string;  // "PB.24"
}

/** Une ligne du tableau VENTE ou DEPENSE */
export interface CashflowMethodRow {
    key: string;                       // "TMB", "TOTAL", etc.
    label: string;                     // "TMB", "TOTAL"
    isTotal: boolean;                  // true = ligne TOTAL (gras)
    openingBalance: number;            // S.O.
    byCompany: Record<number, number>; // P.24, P.LMB…
    total: number;                     // Σ companies
    cumul: number;                     // S.O. + TOTAL (ou progressif)
}

export interface CashflowReportData {
    period: { from: string; to: string };
    companies: CashflowCompany[];
    sales: {
        rows: CashflowMethodRow[];
        grandTotal: number;   // Σ toutes méthodes + toutes companies
    };
    expenses: {
        rows: CashflowMethodRow[];
        grandTotal: number;
    };
}