// ─── Generic BI types ──────────────────────────────────────────────────────

export type Period =
    | "today"
    | "week"
    | "month"
    | "last_month"
    | "quarter"
    | "year"
    | "custom";

export type Store = "all" | "P24" | "P.MTO" | "P.LMB" | "P.KTM" | "P.ONL" | "P.BC";
export type Segment = "all" | "Femme" | "Kids" | "Beauty";
export type CustomerTier = "Platinum" | "Gold" | "Silver" | "Autres";
export type Size = "S" | "M" | "L" | "XL" | "XXL+";
export type AuditStatus = "ok" | "warning" | "critical";
export type TransferStatus = "conforme" | "anomalie" | "en_attente";
export type PaymentStatus = "total" | "partiel" | "a_controler" | "non_paye";
export type AlertSeverity = "critical" | "warning" | "info";

export interface ReportFilter {
    period: Period;
    year: number;
    month: number | null;
    store: Store;
    segment: Segment;
    category: string | null;
    dateFrom?: string;
    dateTo?: string;
}

export interface KPI {
    id: string;
    label: string;
    value: number;
    unit: string;
    format: "currency" | "number" | "percent";
    variation?: number; // % vs previous period
    variationValue?: number; // absolute vs previous period
    previousValue?: number;
    trend?: "up" | "down" | "stable";
    isPositiveUp?: boolean; // true = up is green, false = up is red
    href?: string;
}

export interface Alert {
    id: string;
    severity: AlertSeverity;
    message: string;
    detail?: string;
    href?: string;
    count?: number;
}

export interface Variance {
    actual: number;
    budget: number;
    variance: number;
    variancePct: number;
}

export interface ReportTable<T> {
    columns: TableColumn[];
    rows: T[];
    totalRow?: T;
}

export interface TableColumn {
    key: string;
    label: string;
    align?: "left" | "right" | "center";
    format?: "currency" | "number" | "percent" | "string" | "badge" | "date";
    sortable?: boolean;
    width?: string;
}

// ─── Sales ─────────────────────────────────────────────────────────────────

export interface StoreSegmentCell {
    store: Omit<Store, "all">;
    segment: Omit<Segment, "all">;
    actual: number;
    budget: number;
}

export interface SalesMatrixRow {
    segment: string;
    P24: number;
    "P.MTO": number;
    "P.LMB": number;
    "P.KTM": number;
    "P.ONL": number;
    total: number;
    budget: number;
    variance: number;
    variancePct: number;
}

export interface SalesReport {
    totalRevenue: number;
    totalBudget: number;
    variance: number;
    variancePct: number;
    transactions: number;
    avgBasket: number;
    byStore: { store: string; actual: number; budget: number; variance: number; variancePct: number }[];
    bySegment: { segment: string; actual: number; budget: number }[];
    byCategory: { category: string; actual: number; segment: string }[];
    matrix: SalesMatrixRow[];
    trend: { date: string; actual: number; budget: number }[];
}

// ─── Customers ─────────────────────────────────────────────────────────────

export interface CustomerSegmentRow {
    tier: CustomerTier;
    total: number;
    grossAdds: number;
    churn30: number;
    acquisitionRevenue: number;
    recurringRevenue: number;
    arpu: number;
}

export interface CustomerReport {
    totalCustomers: number;
    grossAdds: number;
    churn30: number;
    acquisitionRevenue: number;
    recurringRevenue: number;
    arpu: number;
    byTier: CustomerSegmentRow[];
    trend: { date: string; total: number; grossAdds: number; churn: number }[];
}

// ─── Stock ─────────────────────────────────────────────────────────────────

export interface StockMovementRow {
    segment: string;
    opening: number;
    purchases: number;
    sales: number;
    adjustments: number;
    closing: number;
}

export interface StockValuationRow {
    site: string;
    femme: number;
    kids: number;
    beauty: number;
    total: number;
    lastAuditDate: string;
    auditStatus: AuditStatus;
}

export interface StockSizeRow {
    site: string;
    S: number;
    M: number;
    L: number;
    XL: number;
    "XXL+": number;
    total: number;
}

export interface StockAuditRow {
    site: string;
    segment: string;
    lastAuditDate: string;
    daysSince: number;
    status: AuditStatus;
    variance: number;
    action?: string;
}

export interface StockReport {
    totalValue: number;
    movements: StockMovementRow[];
    valuation: StockValuationRow[];
    sizes: StockSizeRow[];
    audits: StockAuditRow[];
}

// ─── Purchases ─────────────────────────────────────────────────────────────

export interface PurchaseSummaryRow {
    category: string;
    po: number;
    received: number;
    P24: number;
    "P.MTO": number;
    "P.LMB": number;
    "P.KTM": number;
    "P.ONL": number;
    totalTransferred: number;
    backlog: number;
}

export interface PODetailRow {
    number: string;
    supplier: string;
    date: string;
    amount: number;
    received: number;
    transferred: number;
    backlog: number;
    status: "complete" | "partial" | "pending" | "overdue";
}

export interface PurchaseReport {
    totalPO: number;
    totalReceived: number;
    totalTransferred: number;
    totalBacklog: number;
    summary: PurchaseSummaryRow[];
    poDetail: PODetailRow[];
}

// ─── Transfers ─────────────────────────────────────────────────────────────

export interface TransferRow {
    reference: string;
    date: string;
    origin: string;
    destination: string;
    items: number;
    value: number;
    status: TransferStatus;
    barcodeValidated: boolean;
    anomalyDetail?: string;
}

export interface TransferReport {
    total: number;
    conforme: number;
    anomalie: number;
    en_attente: number;
    barcodeValidated: number;
    barcodesMissing: number;
    transfers: TransferRow[];
}

// ─── Purchase Accounting ───────────────────────────────────────────────────

export interface PurchaseAccountingRow {
    category: string;
    demand: number;
    po: number;
    received: number;
    backlog: number;
    sold: number;
    invoicedOdoo: number;
    paymentStatus: PaymentStatus;
    paid: number;
}

export interface ApprocheFee {
    type: string;
    amount: number;
    pctOfPurchases: number;
}

export interface PurchaseAccountingReport {
    rows: PurchaseAccountingRow[];
    approcheFees: ApprocheFee[];
    totalPO: number;
    totalInvoiced: number;
    totalPaid: number;
    totalUnpaid: number;
}

// ─── Cash & OPEX ───────────────────────────────────────────────────────────

export interface CashRow {
    site: string;
    cashAvailable: number;
    cashVariance: number;
}

export interface OpexRow {
    category: string;
    amount: number;
    pct: number;
    biClassification: string;
}

export interface CashReport {
    totalCash: number;
    totalVariance: number;
    anomalies: number;
    cashBySite: CashRow[];
    opex: OpexRow[];
    totalOpex: number;
}

// ─── Real Estate ───────────────────────────────────────────────────────────

export interface RentRow {
    site: string;
    monthlyRent: number;
    annualRent: number;
    Jan: number; Feb: number; Mar: number; Apr: number;
    May: number; Jun: number; Jul: number; Aug: number;
    Sep: number; Oct: number; Nov: number; Dec: number;
    totalPaid: number;
    remaining: number;
    status: "paid" | "partial" | "overdue";
}

export interface LeaseAlert {
    site: string;
    type: "upcoming_payment" | "late" | "expiry_soon" | "expired";
    date: string;
    detail: string;
}

export interface RealEstateReport {
    totalAnnualRent: number;
    totalPaid: number;
    totalRemaining: number;
    rents: RentRow[];
    alerts: LeaseAlert[];
}

// ─── HR ────────────────────────────────────────────────────────────────────

export interface HrRow {
    unit: string;
    headcount: number;
    salaries: number;
    benefits: number;
    totalCharged: number;
    leaves: number;
}

export interface HrReport {
    totalHeadcount: number;
    totalSalaries: number;
    totalBenefits: number;
    totalCharged: number;
    totalLeaves: number;
    byUnit: HrRow[];
}
