export const INTERNAL_COMPANY_NAMES = [
    "PB - BC",
    "PB - DC",
    "PB - LMB",
    "PB - KTM",
    "PB - MTO",
    "PB - 24",
];

export function isExternalSupplier(supplierName: string): boolean {
    if (!supplierName) return false;
    const cleanName = supplierName.trim().toUpperCase();

    const isInternal = INTERNAL_COMPANY_NAMES.some(internal =>
        cleanName.includes(internal.toUpperCase()) || cleanName.startsWith("PB -")
    );

    return !isInternal;
}

export interface SupplierMonthlyPerformance {
    supplierId: string;
    supplierName: string;
    currentStockQty: number;

    // Totaux 6 Mois
    totalPurchases: number;     // Achats réels $ (purchase.order)
    totalSales: number;         // Ventes POS $ (pos.order.line)
    totalCost: number;          // Coût des ventes $ (standard_price * qty)
    totalMarginPercent: number; // Marge %

    // Totaux 3 Mois
    purchases3M: number;
    sales3M: number;
    cost3M: number;
    marginPercent3M: number;

    // Clés mensuelles ("yyyy-MM")
    monthlyPurchases: Record<string, number>;
    monthlySales: Record<string, number>;
    monthlyCost: Record<string, number>;
}