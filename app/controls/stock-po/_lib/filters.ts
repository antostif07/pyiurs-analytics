import type { StockPoFilter, StockPoSupplierPrefix } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getDefaultStockPoFilters(): StockPoFilter {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        from: toIso(firstOfMonth),
        to: toIso(now),
        supplierPrefix: "all",
    };
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseStockPoFilters(raw: Raw): StockPoFilter {
    const def = getDefaultStockPoFilters();
    const fromRaw = one(raw.from);
    const toRaw = one(raw.to);
    const supRaw = one(raw.supplier);

    const from = fromRaw && ISO_DATE.test(fromRaw) ? fromRaw : def.from;
    const to = toRaw && ISO_DATE.test(toRaw) ? toRaw : def.to;

    const validSup: StockPoSupplierPrefix[] = ["all", "P.BTY", "P.FEM"];
    const supplierPrefix: StockPoSupplierPrefix =
        supRaw && (validSup as string[]).includes(supRaw)
            ? (supRaw as StockPoSupplierPrefix)
            : "all";

    return {
        from: from <= to ? from : to,
        to: to >= from ? to : from,
        supplierPrefix,
    };
}

export function serializeStockPoFilters(f: StockPoFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("from", f.from);
    sp.set("to", f.to);
    if (f.supplierPrefix !== "all") sp.set("supplier", f.supplierPrefix);
    return sp;
}