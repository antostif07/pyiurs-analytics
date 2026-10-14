// app/finance/cash-flow/_lib/cashflow-mapping.ts

/**
 * Méthodes de paiement VENTE (encaissements).
 * L'ordre du tableau suit cet ordre.
 */
export const SALES_METHODS = ["TMB", "RAWBANK", "MPESA", "CASH"] as const;
export type SalesMethod = (typeof SALES_METHODS)[number];

/**
 * Méthodes de DÉPENSE (décaissements).
 * E.PDV / E.BC / E.STK reportés (Q3 en suspens).
 */
export const EXPENSE_METHODS = ["E.PDV", "E.BC", "E.STK", "AUTRES"] as const;
export type ExpenseMethod = (typeof EXPENSE_METHODS)[number];

/**
 * Mapping code journal → méthode VENTE.
 * ⚠️ Q1 "BNK1 = RAWBANK" pour toutes companies.
 * ⚠️ "Mets tout banque" → les codes non listés ci-dessous et de type `bank`
 *     sont regroupés dans "AUTRES BANQUES" (à séparer plus tard).
 */
export const JOURNAL_TO_SALES_METHOD: Record<string, SalesMethod> = {
    // ─── TMB ─────────────────────────────────────────────────────────
    BNK2: "TMB",     // P.24 - Banque TMB
    "TMB1/": "TMB",  // P.LMB - Banque TMB
    "POSC/": "TMB",  // P.KTM + P.MTO - POS TMB
    "TMBC/": "TMB",  // P.ONL - TMB Compte courant

    // ─── RAWBANK ─────────────────────────────────────────────────────
    BNK1: "RAWBANK", // Toutes companies - Banque (Rawbank)

    // ─── MPESA ───────────────────────────────────────────────────────
    "MPSA/": "MPESA", // P.LMB, P.KTM, P.MTO, P.ONL
    BNK5: "MPESA",    // P.24 - Compte M-PESA

    // ─── Autres banques (hors nomenclature V1) ───────────────────────
    // ARTL/, ORG/, ORGM/ → non listés, on les exclut pour l'instant
};

/**
 * Détermine la méthode VENTE d'un journal.
 * Retourne null si le journal n'entre dans aucune méthode.
 *
 * Règles :
 *  - Si le code est dans le mapping → cette méthode
 *  - Sinon si type = "cash" → CASH
 *  - Sinon → null (exclu du rapport)
 */
export function resolveSalesMethod(
    code: string,
    journalType: string,
): SalesMethod | null {
    if (JOURNAL_TO_SALES_METHOD[code]) {
        return JOURNAL_TO_SALES_METHOD[code];
    }
    if (journalType === "cash") {
        return "CASH";
    }
    return null;
}

/**
 * Labels humains affichés dans le tableau.
 */
export const SALES_METHOD_LABELS: Record<SalesMethod, string> = {
    TMB: "TMB",
    RAWBANK: "RAWBANK",
    MPESA: "M-PESA",
    CASH: "CASH",
};

export const EXPENSE_METHOD_LABELS: Record<ExpenseMethod, string> = {
    "E.PDV": "E.PDV. (Espèces Point de Vente)",
    "E.BC": "E.BC. (Espèces Boutique Centrale)",
    "E.STK": "E.STK. (Espèces Stock)",
    AUTRES: "Autres dépenses",
};