import type { RedsupInvoiceRow, RedsupKpis } from "./types";

export function buildRedsupKpis(invoices: RedsupInvoiceRow[]): RedsupKpis {
    let totalAmount = 0;
    let totalQty = 0;
    let withPhotoCount = 0;
    let validatedCount = 0;

    for (const inv of invoices) {
        totalAmount += inv.totalRedsupAmount;
        totalQty += inv.totalRedsupQty;
        if (inv.hasPhoto) withPhotoCount += 1;
        if (inv.isValidated) validatedCount += 1;
    }

    return {
        totalOrders: invoices.length,
        totalAmount,
        totalQty,
        withPhotoCount,
        validatedCount,
        pendingCount: invoices.length - validatedCount,
    };
}