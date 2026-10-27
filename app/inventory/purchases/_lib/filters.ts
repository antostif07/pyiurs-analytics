// app/inventory/purchases/_lib/filters.ts
import type { PurchasesFilters } from "./types";

export function parsePurchasesFilters(
    params: Record<string, string | undefined>,
): PurchasesFilters {
    const status = params.status?.trim();
    const start = params.start_date?.trim();
    const end = params.end_date?.trim();

    // Validation ISO YYYY-MM-DD
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const start_date = start && iso.test(start) ? start : null;
    const end_date = end && iso.test(end) ? end : null;

    return {
        status: status && status.length > 0 ? status : null,
        start_date,
        end_date,
    };
}

export function serializePurchasesFilters(f: PurchasesFilters): URLSearchParams {
    const sp = new URLSearchParams();
    if (f.status !== null) sp.set("status", f.status);
    if (f.start_date !== null) sp.set("start_date", f.start_date);
    if (f.end_date !== null) sp.set("end_date", f.end_date);
    return sp;
}