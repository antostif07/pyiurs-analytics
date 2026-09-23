// app/ceo-report/operations/purchases/_lib/types.ts

export interface PurchaseDispatchKpisData {
    poAmountTotal: number;       // Ex: 42 000 $
    categoriesCount: number;     // Ex: 3 catégories
    receivedPbcTotal: number;    // Ex: 40 500 $
    receptionRate: number;       // Ex: 96.4 %
    transferredTotal: number;    // Ex: 37 500 $
    transferRate: number;        // Ex: 92.6 %
    reliquatPbcTotal: number;    // Ex: 3 000 $
}

export interface PurchaseFunnelPoint {
    name: string;                // "Femme", "Kids", "Beauty"
    "Commande PO": number;
    "Reçu P.BC": number;
    "Transféré Boutiques": number;
    "Reliquat Central": number;
    [key: string]: any;
}

export interface StoreDispatchShare {
    store: string;               // "P24", "P.MTO", etc.
    montant: number;
    part: string;
}

export interface PurchaseDispatchReportData {
    kpis: PurchaseDispatchKpisData;
    funnelData: PurchaseFunnelPoint[];
    storeShares: StoreDispatchShare[];
}