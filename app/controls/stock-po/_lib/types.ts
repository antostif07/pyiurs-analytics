export type StockPoSupplierPrefix = "all" | "P.BTY" | "P.FEM";

export interface StockPoAttachmentMeta {
    attachmentId: number;
    fileName: string;
    mimeType: string;
    fileSize: number;
}

export interface StockPickingItem {
    id: number;
    name: string;
    origin: string;
    state: string;
    pickingTypeName: string;
    scheduledDate: string;
    dateDone: string | null;
    locationDestName: string;
}

export interface StockPoRow {
    id: number;
    name: string;
    createdAt: string;
    createdBy: string;
    partnerName: string;
    state: string;
    amountTotal: number;
    currency: string;
    excelCaFile: StockPoAttachmentMeta | null;
    supplierInvoiceFile: StockPoAttachmentMeta | null;
    pickings: StockPickingItem[];
}

export interface StockPoFilter {
    from: string;
    to: string;
    supplierPrefix: StockPoSupplierPrefix;
}

export interface StockPoAttachmentMeta {
    attachmentId: number;
    fileName: string;
    mimeType: string;
    fileSize: number;
}

export interface StockPickingItem {
    id: number;
    name: string;
    origin: string;
    state: string;
    pickingTypeName: string;
    scheduledDate: string;
    dateDone: string | null;
    locationDestName: string;
}

export interface StockPoRow {
    id: number;
    name: string;
    createdAt: string;
    createdBy: string;
    partnerName: string;
    state: string;
    amountTotal: number;
    currency: string;
    excelCaFile: StockPoAttachmentMeta | null;
    supplierInvoiceFile: StockPoAttachmentMeta | null;
    pickings: StockPickingItem[];

    // Validation locale
    isValidated: boolean;
    validationFileName: string | null;
    validationMimeType: string | null;
    validationNotes: string | null;
    validatedAt: string | null;
    validatedBy: string | null;
}

export interface StockPoFilter {
    from: string;
    to: string;
    supplierPrefix: StockPoSupplierPrefix;
}

export interface StockPoReportData {
    kpis: {
        totalOrders: number;
        withExcelCaCount: number;
        withInvoiceCount: number;
        totalPickings: number;
        donePickings: number;
        validatedCount: number;
    };
    orders: StockPoRow[];
}

export interface StockPoValidationMutationResult {
    success: true;
    odooPoId: number;
    isValidated: boolean;
    validationFileName: string | null;
    validationMimeType: string | null;
    validationNotes: string | null;
    validatedAt: string | null;
    validatedBy: string | null;
}