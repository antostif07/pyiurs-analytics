import type {
    SalesReport,
    CustomerReport,
    StockReport,
    PurchaseReport,
    TransferReport,
    PurchaseAccountingReport,
    CashReport,
    RealEstateReport,
    HrReport,
    Alert,
} from "@/app/ceo-report/_lib/types/reports";

// ─── Sales Demo Data ────────────────────────────────────────────────────────

export const salesData: SalesReport = {
    totalRevenue: 96000,
    totalBudget: 92700,
    variance: 3300,
    variancePct: 3.56,
    transactions: 2148,
    avgBasket: 44.69,
    byStore: [
        { store: "P24", actual: 23500, budget: 22000, variance: 1500, variancePct: 6.82 },
        { store: "P.MTO", actual: 18300, budget: 18000, variance: 300, variancePct: 1.67 },
        { store: "P.LMB", actual: 14100, budget: 14500, variance: -400, variancePct: -2.76 },
        { store: "P.KTM", actual: 12600, budget: 12500, variance: 100, variancePct: 0.80 },
        { store: "P.ONL", actual: 27500, budget: 25700, variance: 1800, variancePct: 7.00 },
    ],
    bySegment: [
        { segment: "Femme", actual: 50000, budget: 47500 },
        { segment: "Kids", actual: 18000, budget: 18200 },
        { segment: "Beauty", actual: 28000, budget: 27000 },
    ],
    byCategory: [
        { category: "Robes", actual: 15200, segment: "Femme" },
        { category: "Tops", actual: 12400, segment: "Femme" },
        { category: "Pantalons", actual: 11600, segment: "Femme" },
        { category: "Accessoires", actual: 10800, segment: "Femme" },
        { category: "Hauts Kids", actual: 7200, segment: "Kids" },
        { category: "Bas Kids", actual: 6100, segment: "Kids" },
        { category: "Chaussures", actual: 4700, segment: "Kids" },
        { category: "Soins visage", actual: 12300, segment: "Beauty" },
        { category: "Parfums", actual: 9200, segment: "Beauty" },
        { category: "Maquillage", actual: 6500, segment: "Beauty" },
    ],
    matrix: [
        { segment: "Femme", P24: 12500, "P.MTO": 9800, "P.LMB": 7200, "P.KTM": 6500, "P.ONL": 14000, total: 50000, budget: 47500, variance: 2500, variancePct: 5.26 },
        { segment: "Kids", P24: 4200, "P.MTO": 3100, "P.LMB": 2800, "P.KTM": 2400, "P.ONL": 5500, total: 18000, budget: 18200, variance: -200, variancePct: -1.10 },
        { segment: "Beauty", P24: 6800, "P.MTO": 5400, "P.LMB": 4100, "P.KTM": 3700, "P.ONL": 8000, total: 28000, budget: 27000, variance: 1000, variancePct: 3.70 },
        { segment: "Total", P24: 23500, "P.MTO": 18300, "P.LMB": 14100, "P.KTM": 12600, "P.ONL": 27500, total: 96000, budget: 92700, variance: 3300, variancePct: 3.56 },
    ],
    trend: [
        { date: "Jan", actual: 78000, budget: 75000 },
        { date: "Fév", actual: 82000, budget: 79000 },
        { date: "Mar", actual: 88000, budget: 84000 },
        { date: "Avr", actual: 85000, budget: 86000 },
        { date: "Mai", actual: 91000, budget: 88000 },
        { date: "Jun", actual: 94000, budget: 90000 },
        { date: "Jul", actual: 89000, budget: 87000 },
        { date: "Aoû", actual: 93000, budget: 91000 },
        { date: "Sep", actual: 96000, budget: 92700 },
    ],
};

// ─── Customers Demo Data ─────────────────────────────────────────────────────

export const customersData: CustomerReport = {
    totalCustomers: 2750,
    grossAdds: 289,
    churn30: 122,
    acquisitionRevenue: 24900,
    recurringRevenue: 71100,
    arpu: 34.91,
    byTier: [
        { tier: "Platinum", total: 180, grossAdds: 12, churn30: 3, acquisitionRevenue: 5200, recurringRevenue: 22800, arpu: 155.56 },
        { tier: "Gold", total: 420, grossAdds: 38, churn30: 15, acquisitionRevenue: 8400, recurringRevenue: 24600, arpu: 78.57 },
        { tier: "Silver", total: 890, grossAdds: 96, churn30: 42, acquisitionRevenue: 7800, recurringRevenue: 16200, arpu: 27.19 },
        { tier: "Autres", total: 1260, grossAdds: 143, churn30: 62, acquisitionRevenue: 3500, recurringRevenue: 7500, arpu: 8.73 },
    ],
    trend: [
        { date: "Jan", total: 2250, grossAdds: 210, churn: 95 },
        { date: "Fév", total: 2310, grossAdds: 195, churn: 89 },
        { date: "Mar", total: 2390, grossAdds: 228, churn: 104 },
        { date: "Avr", total: 2445, grossAdds: 215, churn: 110 },
        { date: "Mai", total: 2520, grossAdds: 248, churn: 118 },
        { date: "Jun", total: 2580, grossAdds: 262, churn: 115 },
        { date: "Jul", total: 2620, grossAdds: 255, churn: 108 },
        { date: "Aoû", total: 2688, grossAdds: 278, churn: 120 },
        { date: "Sep", total: 2750, grossAdds: 289, churn: 122 },
    ],
};

// ─── Stock Demo Data ─────────────────────────────────────────────────────────

export const stockData: StockReport = {
    totalValue: 106990,
    movements: [
        { segment: "Femme", opening: 65000, purchases: 22000, sales: 21500, adjustments: -450, closing: 65050 },
        { segment: "Kids", opening: 24000, purchases: 8000, sales: 7800, adjustments: -200, closing: 23990 },
        { segment: "Beauty", opening: 18000, purchases: 12000, sales: 11900, adjustments: -150, closing: 17950 },
    ],
    valuation: [
        { site: "P.BC", femme: 28000, kids: 10500, beauty: 8200, total: 46700, lastAuditDate: "2026-08-10", auditStatus: "warning" },
        { site: "P24", femme: 14200, kids: 4800, beauty: 3900, total: 22900, lastAuditDate: "2026-09-01", auditStatus: "ok" },
        { site: "P.MTO", femme: 10500, kids: 3900, beauty: 2800, total: 17200, lastAuditDate: "2026-06-15", auditStatus: "critical" },
        { site: "P.LMB", femme: 7200, kids: 2800, beauty: 1850, total: 11850, lastAuditDate: "2026-08-28", auditStatus: "ok" },
        { site: "P.KTM", femme: 5150, kids: 1990, beauty: 1200, total: 8340, lastAuditDate: "2026-07-20", auditStatus: "warning" },
    ],
    sizes: [
        { site: "P.BC", S: 420, M: 680, L: 540, XL: 310, "XXL+": 150, total: 2100 },
        { site: "P24", S: 185, M: 290, L: 220, XL: 130, "XXL+": 65, total: 890 },
        { site: "P.MTO", S: 145, M: 230, L: 175, XL: 98, "XXL+": 42, total: 690 },
        { site: "P.LMB", S: 98, M: 168, L: 124, XL: 72, "XXL+": 28, total: 490 },
        { site: "P.KTM", S: 78, M: 125, L: 98, XL: 55, "XXL+": 24, total: 380 },
    ],
    audits: [
        { site: "P.BC", segment: "Femme", lastAuditDate: "2026-08-10", daysSince: 39, status: "warning", variance: -320 },
        { site: "P.BC", segment: "Kids", lastAuditDate: "2026-08-10", daysSince: 39, status: "warning", variance: -120 },
        { site: "P.MTO", segment: "Femme", lastAuditDate: "2026-06-15", daysSince: 95, status: "critical", variance: -580 },
        { site: "P.MTO", segment: "Kids", lastAuditDate: "2026-06-15", daysSince: 95, status: "critical", variance: -240 },
        { site: "P24", segment: "Femme", lastAuditDate: "2026-09-01", daysSince: 17, status: "ok", variance: -45 },
        { site: "P.LMB", segment: "Beauty", lastAuditDate: "2026-08-28", daysSince: 21, status: "ok", variance: 0 },
        { site: "P.KTM", segment: "Femme", lastAuditDate: "2026-07-20", daysSince: 60, status: "warning", variance: -190 },
    ],
};

// ─── Purchases Demo Data ──────────────────────────────────────────────────────

export const purchasesData: PurchaseReport = {
    totalPO: 42000,
    totalReceived: 38500,
    totalTransferred: 35800,
    totalBacklog: 2700,
    summary: [
        { category: "Femme", po: 22000, received: 20200, P24: 5100, "P.MTO": 4200, "P.LMB": 3500, "P.KTM": 2800, "P.ONL": 4400, totalTransferred: 20000, backlog: 200 },
        { category: "Kids", po: 8000, received: 7400, P24: 1800, "P.MTO": 1400, "P.LMB": 1100, "P.KTM": 900, "P.ONL": 1600, totalTransferred: 6800, backlog: 600 },
        { category: "Beauty", po: 12000, received: 10900, P24: 3200, "P.MTO": 2500, "P.LMB": 2000, "P.KTM": 1800, "P.ONL": 1300, totalTransferred: 10800, backlog: 100 },
    ],
    poDetail: [
        { number: "PO-2026-0201", supplier: "Mode Paris SAS", date: "2026-08-05", amount: 14500, received: 14500, transferred: 14200, backlog: 300, status: "partial" },
        { number: "PO-2026-0202", supplier: "Kids World FZCO", date: "2026-08-12", amount: 8000, received: 7400, transferred: 6800, backlog: 600, status: "partial" },
        { number: "PO-2026-0203", supplier: "Beauty Hub Ltd", date: "2026-08-18", amount: 12000, received: 10900, transferred: 10800, backlog: 100, status: "partial" },
        { number: "PO-2026-0204", supplier: "Elegance Textile", date: "2026-08-25", amount: 7500, received: 5700, transferred: 4000, backlog: 1700, status: "overdue" },
    ],
};

// ─── Transfers Demo Data ──────────────────────────────────────────────────────

export const transfersData: TransferReport = {
    total: 5,
    conforme: 4,
    anomalie: 1,
    en_attente: 0,
    barcodeValidated: 4,
    barcodesMissing: 1,
    transfers: [
        { reference: "TR-2026-0801", date: "2026-09-04", origin: "P.BC", destination: "P24", items: 145, value: 4500, status: "conforme", barcodeValidated: true },
        { reference: "TR-2026-0802", date: "2026-09-06", origin: "P.BC", destination: "P.MTO", items: 98, value: 3200, status: "conforme", barcodeValidated: true },
        { reference: "TR-2026-0803", date: "2026-09-10", origin: "P.BC", destination: "P.LMB", items: 75, value: 2400, status: "anomalie", barcodeValidated: false, anomalyDetail: "12 articles sans barcode validé — écart constaté à réception" },
        { reference: "TR-2026-0804", date: "2026-09-12", origin: "P.BC", destination: "P.KTM", items: 60, value: 1900, status: "conforme", barcodeValidated: true },
        { reference: "TR-2026-0805", date: "2026-09-15", origin: "P.BC", destination: "P.ONL", items: 110, value: 3800, status: "conforme", barcodeValidated: true },
    ],
};

// ─── Purchase Accounting Demo Data ───────────────────────────────────────────

export const purchaseAccountingData: PurchaseAccountingReport = {
    totalPO: 42000,
    totalInvoiced: 39500,
    totalPaid: 35200,
    totalUnpaid: 4300,
    rows: [
        { category: "Femme", demand: 22000, po: 22000, received: 20200, backlog: 200, sold: 21500, invoicedOdoo: 20000, paymentStatus: "partiel", paid: 18000 },
        { category: "Kids", demand: 8000, po: 8000, received: 7400, backlog: 600, sold: 7800, invoicedOdoo: 7400, paymentStatus: "total", paid: 7400 },
        { category: "Beauty", demand: 12000, po: 12000, received: 10900, backlog: 100, sold: 11900, invoicedOdoo: 10900, paymentStatus: "a_controler", paid: 9800 },
    ],
    approcheFees: [
        { type: "Fret", amount: 1850, pctOfPurchases: 4.40 },
        { type: "Douanes", amount: 2100, pctOfPurchases: 5.00 },
        { type: "Dédouanement", amount: 420, pctOfPurchases: 1.00 },
        { type: "Transit", amount: 630, pctOfPurchases: 1.50 },
        { type: "Transport", amount: 315, pctOfPurchases: 0.75 },
    ],
};

// ─── Cash & OPEX Demo Data ────────────────────────────────────────────────────

export const cashData: CashReport = {
    totalCash: 30100,
    totalVariance: -20,
    anomalies: 2,
    cashBySite: [
        { site: "P24", cashAvailable: 8400, cashVariance: 0 },
        { site: "P.MTO", cashAvailable: 6200, cashVariance: -15 },
        { site: "P.LMB", cashAvailable: 4800, cashVariance: 0 },
        { site: "P.KTM", cashAvailable: 3900, cashVariance: -5 },
        { site: "P.BC / ONL", cashAvailable: 6800, cashVariance: 0 },
    ],
    totalOpex: 68500,
    opex: [
        { category: "Marchandises / Achats", amount: 42000, pct: 61.3, biClassification: "COGS" },
        { category: "Charges financières", amount: 3200, pct: 4.7, biClassification: "Finance" },
        { category: "Marketing & Publicité", amount: 4800, pct: 7.0, biClassification: "Marketing" },
        { category: "Fiscalité & Taxes", amount: 2900, pct: 4.2, biClassification: "Fiscal" },
        { category: "Loyers & Charges locatives", amount: 7200, pct: 10.5, biClassification: "Immobilier" },
        { category: "Masse salariale & RH", amount: 8400, pct: 12.3, biClassification: "RH" },
    ],
};

// ─── Real Estate Demo Data ────────────────────────────────────────────────────

export const realEstateData: RealEstateReport = {
    totalAnnualRent: 86400,
    totalPaid: 64800,
    totalRemaining: 21600,
    rents: [
        { site: "P24", monthlyRent: 3200, annualRent: 38400, Jan: 3200, Feb: 3200, Mar: 3200, Apr: 3200, May: 3200, Jun: 3200, Jul: 3200, Aug: 3200, Sep: 3200, Oct: 0, Nov: 0, Dec: 0, totalPaid: 28800, remaining: 9600, status: "partial" },
        { site: "P.MTO", monthlyRent: 2100, annualRent: 25200, Jan: 2100, Feb: 2100, Mar: 2100, Apr: 2100, May: 2100, Jun: 2100, Jul: 2100, Aug: 2100, Sep: 2100, Oct: 0, Nov: 0, Dec: 0, totalPaid: 18900, remaining: 6300, status: "partial" },
        { site: "P.LMB", monthlyRent: 1400, annualRent: 16800, Jan: 1400, Feb: 1400, Mar: 1400, Apr: 1400, May: 1400, Jun: 1400, Jul: 1400, Aug: 1400, Sep: 1400, Oct: 0, Nov: 0, Dec: 0, totalPaid: 12600, remaining: 4200, status: "partial" },
        { site: "P.KTM", monthlyRent: 500, annualRent: 6000, Jan: 500, Feb: 500, Mar: 500, Apr: 500, May: 500, Jun: 500, Jul: 500, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0, totalPaid: 3500, remaining: 2500, status: "overdue" },
    ],
    alerts: [
        { site: "P.KTM", type: "late", date: "2026-09-18", detail: "Loyer août non payé — relance recommandée" },
        { site: "P24", type: "upcoming_payment", date: "2026-10-01", detail: "Loyer octobre à payer dans 13 jours" },
        { site: "P.MTO", type: "expiry_soon", date: "2027-03-31", detail: "Bail expire dans 6 mois" },
    ],
};

// ─── HR Demo Data ─────────────────────────────────────────────────────────────

export const hrData: HrReport = {
    totalHeadcount: 38,
    totalSalaries: 62400,
    totalBenefits: 9800,
    totalCharged: 72200,
    totalLeaves: 12,
    byUnit: [
        { unit: "P24", headcount: 8, salaries: 13200, benefits: 2100, totalCharged: 15300, leaves: 2 },
        { unit: "P.MTO", headcount: 6, salaries: 9800, benefits: 1540, totalCharged: 11340, leaves: 1 },
        { unit: "P.LMB", headcount: 5, salaries: 8100, benefits: 1280, totalCharged: 9380, leaves: 2 },
        { unit: "P.KTM", headcount: 4, salaries: 6500, benefits: 1020, totalCharged: 7520, leaves: 1 },
        { unit: "P.ONL", headcount: 5, salaries: 8200, benefits: 1290, totalCharged: 9490, leaves: 2 },
        { unit: "P.BC", headcount: 6, salaries: 9800, benefits: 1540, totalCharged: 11340, leaves: 3 },
        { unit: "Direction", headcount: 4, salaries: 6800, benefits: 1030, totalCharged: 7830, leaves: 1 },
    ],
};

// ─── Executive Alerts ─────────────────────────────────────────────────────────

export const executiveAlerts: Alert[] = [
    { id: "a1", severity: "critical", message: "Audit stock > 90 jours", detail: "P.MTO Femme & Kids — 95 jours sans audit", href: "/reports/stock/audits", count: 2 },
    { id: "a2", severity: "critical", message: "Barcode manquant", detail: "TR-2026-0803 — 12 articles sans validation barcode", href: "/reports/transfers", count: 12 },
    { id: "a3", severity: "critical", message: "PO en retard de réception", detail: "PO-2026-0204 — Reliquat de 1 700 $ non reçu", href: "/reports/purchases", count: 1 },
    { id: "a4", severity: "warning", message: "Écart de caisse", detail: "P.MTO : -15 $ / P.KTM : -5 $", href: "/reports/cash", count: 2 },
    { id: "a5", severity: "warning", message: "Paiement partiel", detail: "Femme — 2 000 $ de factures partiellement réglées", href: "/reports/purchase-accounting" },
    { id: "a6", severity: "warning", message: "Audit stock 30–90 jours", detail: "P.BC (39j) et P.KTM (60j) à planifier", href: "/reports/stock/audits", count: 3 },
    { id: "a7", severity: "warning", message: "Loyer P.KTM en retard", detail: "Loyer août 2026 non payé", href: "/reports/real-estate" },
    { id: "a8", severity: "info", message: "Transferts conformes", detail: "4/5 transferts validés avec barcode", href: "/reports/transfers", count: 4 },
];
