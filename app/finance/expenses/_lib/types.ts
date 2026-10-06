// app/finance/expenses/_lib/types.ts

/**
 * Ligne `hr.expense` Odoo enrichie de la validation Supabase.
 * Toutes les données Odoo sont en lecture seule côté app.
 */
export interface ExpenseRow {
    // ── Odoo hr.expense ────────────────────────────────────────────────
    odooExpenseId: number;
    name: string;                    // libellé / description
    date: string;                    // ISO yyyy-MM-dd
    employeeName: string;            // hr.employee.name
    categoryId: number;              // product_id (id)
    categoryName: string;            // product_id.name (affichée comme catégorie)
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    currency: string;                // "USD" / "CDF"
    state: string;                   // draft | reported | approved | done | refused

    // ── Supabase expense_validations (jointure) ───────────────────────
    isValidated: boolean;

    /** Autorisation (obligatoire) — URL signée */
    validationPhotoUrl: string | null;
    /** Preuve (optionnelle) — URL signée */
    proofPhotoUrl: string | null;

    validationNotes: string | null;
    validatedAt: string | null;
    validatedBy: string | null;    // profiles.full_name
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
    /** null = toutes les companies */
    companyId: number | null;
}

export interface ExpensesReportData {
    kpis: ExpensesKpis;
    expenses: ExpenseRow[];
    categories: ExpenseCategory[];
    /** Companies disponibles pour le filtre */
    companies: ExpenseCompany[];
}