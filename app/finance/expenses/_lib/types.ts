export const EXPENSE_STATES = [
    "draft",
    "submitted",
    "approved",
    "posted",
    "in_payment",
    "paid",
    "refused",
] as const;

export type ExpenseState = (typeof EXPENSE_STATES)[number];

export interface ExpenseRow {
    odooExpenseId: number;
    name: string;
    date: string;
    employeeName: string;
    categoryId: number;
    categoryName: string;
    companyId: number | null;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    currency: string;
    state: ExpenseState;

    isValidated: boolean;
    hasValidationPhoto: boolean;
    hasProofPhoto: boolean;
    validationNotes: string | null;
    validatedAt: string | null;
    validatedBy: string | null;
}

export interface ExpenseCategory {
    id: number;
    name: string;
}

export interface CurrencyTotals {
    currency: string;
    totalAmount: number;
    validatedAmount: number;
    pendingAmount: number;
}

export interface ExpensesKpis {
    totalCount: number;
    validatedCount: number;
    pendingCount: number;
    byCurrency: CurrencyTotals[];
}

export interface ExpenseCompany {
    id: number;
    name: string;
}

export interface ExpensesFilter {
    from: string;
    to: string;
    categoryIds: number[];
    companyId: number | null;
    state: ExpenseState | null;
}

export interface ExpensesReportData {
    kpis: ExpensesKpis;
    expenses: ExpenseRow[];
    categories: ExpenseCategory[];
    companies: ExpenseCompany[];
}

export interface ValidationMutationResult {
    success: true;
    odooExpenseId: number;
    isValidated: boolean;
    hasValidationPhoto: boolean;
    hasProofPhoto: boolean;
    validationNotes: string | null;
    validatedAt: string | null;
    validatedBy: string | null;
}