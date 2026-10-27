// app/inventory/purchases/_lib/types.ts

export type ReceiptStatus =
    | "Draft"
    | "Waiting"
    | "Ready"
    | "Done"
    | "Late";

export interface IncomingReceipt {
    pickingId: number;
    pickingRef: string;
    originPO: string;
    supplier: string;
    scheduledDate: string | null;
    actualDate: string | null;
    carrier: string;
    totalQtyExpected: number;
    totalQtyReceived: number;
    status: ReceiptStatus;
}

export interface PurchasesKpis {
    pending: number;
    late: number;
    done: number;
    receptionRate: number;
}

export type InsightType = "critical" | "warning" | "info";

export interface PurchaseInsight {
    type: InsightType;
    message: string;
    action: string;
}

export interface PurchasesData {
    receipts: IncomingReceipt[];
    kpis: PurchasesKpis;
    insights: PurchaseInsight[];
    suppliers: string[];
}

export interface PurchasesFilters {
    status: string | null;
    start_date: string | null;
    end_date: string | null;
}