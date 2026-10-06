// app/finance/expenses/_lib/types.ts

export type ExpenseState =
    | "draft"      // Brouillon
    | "submitted"   // Soumis / en attente d'approbation
    | "approved"   // Approuvé par le manager
    | "posted"       // Payé / remboursé
    | "in_payment"
    | "paid"
    | "refused";   // Refusé

/**
 * Ligne `hr.expense` Odoo enrichie de la validation Supabase.
 * Toutes les données Odoo sont en lecture seule côté app.
 */
export interface ExpenseRow {
    odooExpenseId: number;
    name: string;
    date: string;
    employeeName: string;
    categoryId: number;
    categoryName: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    currency: string;
    /** Statut Odoo — typé strictement */
    state: ExpenseState;

    isValidated: boolean;
    validationPhotoUrl: string | null;
    proofPhotoUrl: string | null;
    validationNotes: string | null;
    validatedAt: string | null;
    validatedBy: string | null;
}

/** Liste des catégories (= product_id distincts) pour le filtre */
export interface ExpenseCategory {
    id: number;
    name: string;
}

export interface ExpensesKpis {
    totalCount: number;
    totalAmount: number;
    validatedCount: number;
    pendingCount: number;
    validatedAmount: number;
    pendingAmount: number;
}

/** Réponse d'upload photo */
export interface ValidateExpensePayload {
    odooExpenseId: number;
    notes?: string;
}

/** Société Odoo (résolue depuis shops.odoo_company_id) */
export interface ExpenseCompany {
    id: number;
    name: string;
}

export interface ExpensesFilter {
    from: string;
    to: string;
    categoryIds: number[];
    companyId: number | null;
    /** null = tous les statuts */
    state: ExpenseState | null;
}

export interface ExpensesReportData {
    kpis: ExpensesKpis;
    expenses: ExpenseRow[];
    categories: ExpenseCategory[];
    companies: ExpenseCompany[];
}