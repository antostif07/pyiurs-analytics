// app/finance/loyalty/_lib/types.ts

/** Ligne dans le tableau : facture POS du jour + statut d'envoi */
export interface LoyaltyOrderRow {
    odooOrderId: number;
    orderName: string;
    date: string;              // ISO yyyy-MM-dd
    partnerName: string | null;
    odooPartnerId: number | null;
    posName: string;
    amount: number;

    // Téléphone (résolu + normalisé E.164 si valide)
    rawPhone: string | null;
    normalizedPhone: string | null;
    isPhoneValid: boolean;

    // Points calculés (1 point / 10 $, arrondi bas)
    pointsEarned: number;

    // Statut d'envoi (depuis loyalty_transactions)
    isSent: boolean;
    sentAt: string | null;
    sentBy: string | null;              // nom du profile
    whatsappMessageId: string | null;
}

export interface LoyaltyKpis {
    totalOrders: number;
    totalAmount: number;
    sentCount: number;
    pendingCount: number;
    invalidPhoneCount: number;
    totalPointsEarned: number;
}

export interface LoyaltyReportData {
    kpis: LoyaltyKpis;
    orders: LoyaltyOrderRow[];
}

/** Réponse de POST /send */
export interface SendLoyaltyResult {
    success: boolean;
    orderId: number;
    pointsEarned: number;
    newBalance: number;
    whatsappMessageId: string | null;
    /** Renseigné si échec partiel */
    error?: string;
}

/** Réponse de POST /send-bulk */
export interface SendBulkLoyaltyResult {
    total: number;
    succeeded: number;
    failed: number;
    skippedInvalidPhone: number;
    skippedAlreadySent: number;
    results: SendLoyaltyResult[];
}