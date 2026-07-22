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
    totalRevenue: number;
    monthlySales: Record<string, number>;
}