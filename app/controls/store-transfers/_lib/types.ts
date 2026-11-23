export interface TransferFileMeta {
    fileName: string;
    mimeType: string;
    uploadedAt: string | null;
    uploadedBy: string | null;
}

export interface GeneratedPurchaseOrderMeta {
    id: number;
    name: string;
    companyId: number | null;
    companyName: string;
    state: string;
    amountTotal: number;
}

export interface StoreTransferRow {
    saleOrderId: number;
    saleOrderName: string;
    createdAt: string;
    createdBy: string;
    supplierCompanyName: string; // PB - BC
    destinationPartnerName: string;
    state: string;
    amountTotal: number;
    currency: string;
    generatedPo: GeneratedPurchaseOrderMeta | null;

    dpOut: TransferFileMeta | null;
    dpIn: TransferFileMeta | null;

    isValidated: boolean;
    validatedAt: string | null;
    validatedBy: string | null;
    notes: string | null;
}

export interface StoreTransferFilter {
    from: string;
    to: string;
}

export interface StoreTransfersReportData {
    kpis: {
        totalTransfers: number;
        withPoCount: number;
        dpOutCount: number;
        dpInCount: number;
        validatedCount: number;
    };
    transfers: StoreTransferRow[];
}