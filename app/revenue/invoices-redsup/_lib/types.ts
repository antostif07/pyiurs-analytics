// app/revenue/invoices-redsup/_lib/types.ts

/** Une ligne POS contenant un produit RedSup */
export interface RedsupLine {
    productId: number;
    productName: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
}

/** Une POS order contenant au moins un produit RedSup */
export interface RedsupInvoiceRow {
    odooOrderId: number;
    orderName: string;      // pos.order.name (ex: "Order 00042-001-0012")
    date: string;           // yyyy-MM-dd
    partnerName: string;    // partenaire client
    posName: string;        // session_id.config_id.name (nom du POS)
    state: string;          // pos.order.state
    // Agrégats sur les lignes RedSup uniquement
    totalRedsupAmount: number;
    totalRedsupQty: number;
    lineCount: number;
    // Lignes RedSup détaillées (pour le dialog "voir tous les articles")
    lines: RedsupLine[];
    // Supabase redsup_validations
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