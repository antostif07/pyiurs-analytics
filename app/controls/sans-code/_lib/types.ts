export interface SansCodeOrderRow {
    id: string;
    posConfig: string;
    date: string;
    invoiceRef: string;
    note: string;
    clientName: string;
    qtySansCode: number;
    amountSansCode: number;
    isRefunded: boolean;
}

export interface SansCodePosRisk {
    pos: string;
    total: number;
    refunded: number;
    rate: number;
}

export interface SansCodeKpis {
    totalAmount: number;
    refundedAmount: number;
    netAmount: number;
    refundRate: number;
    totalOrders: number;
    totalQty: number;
    topRiskPos: SansCodePosRisk[];
}

export interface SansCodeFilter {
    from: string;
    to: string;
    pos: string | null;
}

export interface SansCodeReportData {
    kpis: SansCodeKpis;
    rows: SansCodeOrderRow[];
    posConfigs: string[];
}