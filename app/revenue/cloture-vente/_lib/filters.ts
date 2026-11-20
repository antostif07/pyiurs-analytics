import type { ClotureFilter } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");

export function getTodayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseClotureFilters(raw: Raw): ClotureFilter {
    const dateRaw = one(raw.date);
    const shopRaw = one(raw.shop)?.trim();

    return {
        date: dateRaw && ISO_DATE.test(dateRaw) ? dateRaw : getTodayIso(),
        shop: shopRaw && /^\d+$/.test(shopRaw) ? shopRaw : "all",
    };
}

export function serializeClotureFilters(f: ClotureFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("date", f.date);
    if (f.shop !== "all") sp.set("shop", f.shop);
    return sp;
}