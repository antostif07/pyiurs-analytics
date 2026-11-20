export interface RedsupLine {
    productId: number;
    productName: string;
    qty: number;
    unitPrice: number;
    subtotal: number;
    isRedsup: boolean;
}

export interface RedsupInvoiceRow {
    odooOrderId: number;
    orderName: string;
    date: string;
    partnerName: string;
    posName: string;
    state: string;

    totalRedsupAmount: number;
    totalRedsupQty: number;
    lineCount: number;

    hasPhoto: boolean;
    photoAttachedAt: string | null;
    photoAttachedBy: string | null;

    isValidated: boolean;
    validatedAt: string | null;
    validatedBy: string | null;
}

export interface RedsupOrderDetails {
    odooOrderId: number;
    allLines: RedsupLine[];
    totalOrderAmount: number;
    totalOrderQty: number;
    totalRedsupAmount: number;
    totalRedsupQty: number;
}

export interface RedsupKpis {
    totalOrders: number;
    totalAmount: number;
    totalQty: number;
    withPhotoCount: number;
    validatedCount: number;
    pendingCount: number;
}

export interface RedsupReportData {
    kpis: RedsupKpis;
    invoices: RedsupInvoiceRow[];
}

export interface RedsupFilter {
    from: string;
    to: string;
}

export interface RedsupPhotoMutationResult {
    success: true;
    odooOrderId: number;
    hasPhoto: boolean;
    photoAttachedAt: string | null;
    photoAttachedBy: string | null;
}

export interface RedsupValidationMutationResult {
    success: true;
    odooOrderId: number;
    isValidated: boolean;
    validatedAt: string | null;
    validatedBy: string | null;
}