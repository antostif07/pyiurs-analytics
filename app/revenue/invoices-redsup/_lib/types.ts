// app/revenue/invoices-redsup/_lib/types.ts

/** Une ligne POS contenant un produit RedSup */
export interface RedsupLine {
    productId: number;
    productName: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    /** true si le nom du produit contient "redsup" (insensible casse) */
    isRedsup: boolean;
}

/** Une POS order contenant au moins un produit RedSup */
export interface RedsupInvoiceRow {
    odooOrderId: number;
    orderName: string;
    date: string;
    partnerName: string;
    posName: string;
    state: string;

    // ── Totaux RedSup (affichés dans le tableau principal) ────────────────
    totalRedsupAmount: number;
    totalRedsupQty: number;
    lineCount: number;         // nombre de lignes RedSup

    // ── Totaux globaux de la commande ─────────────────────────────────────
    totalOrderAmount: number;  // ⬅️ NOUVEAU — somme de TOUTES les lignes
    totalOrderQty: number;     // ⬅️ NOUVEAU — quantité totale
    totalOrderLines: number;   // ⬅️ NOUVEAU — nb total de lignes

    // ── Lignes ────────────────────────────────────────────────────────────
    lines: RedsupLine[];       // ⬅️ conservé (déjà filtré RedSup)
    allLines: RedsupLine[];    // ⬅️ NOUVEAU — toutes les lignes (avec flag isRedsup)

    // ── Supabase ──────────────────────────────────────────────────────────
    isValidated: boolean;
    validationPhotoUrl: string | null;
    validatedAt: string | null;
    validatedBy: string | null;
}

export interface RedsupKpis {
    totalOrders: number;
    totalAmount: number;
    totalQty: number;
    validatedCount: number;
    pendingCount: number;
}

export interface RedsupReportData {
    kpis: RedsupKpis;
    invoices: RedsupInvoiceRow[];
}

export interface RedsupFilter {
    /** ISO yyyy-MM-dd — défaut : 1er du mois courant */
    from: string;
    /** ISO yyyy-MM-dd — défaut : aujourd'hui */
    to: string;
    /** null = tous */
    state: "all" | "validated" | "pending";
}

export interface ValidateRedsupPayload {
    odooOrderId: number;
}