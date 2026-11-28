export interface HrDashboardFilter {
    date: string;   // yyyy-MM-dd (pour les pointages)
    month: number;  // 1..12 (pour la paie)
    year: number;   // yyyy (pour la paie)
    shop: string;   // 'all' ou shop UUID
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pad = (n: number) => String(n).padStart(2, "0");

export function getDefaultHrDashboardFilters(): HrDashboardFilter {
    const now = new Date();
    return {
        date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        shop: "all",
    };
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseHrDashboardFilters(raw: Raw): HrDashboardFilter {
    const def = getDefaultHrDashboardFilters();
    const dateRaw = one(raw.date);
    const monthRaw = Number(one(raw.month));
    const yearRaw = Number(one(raw.year));
    const shopRaw = one(raw.shop)?.trim();

    return {
        date: dateRaw && ISO_DATE.test(dateRaw) ? dateRaw : def.date,
        month:
            Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12
                ? monthRaw
                : def.month,
        year:
            Number.isInteger(yearRaw) && yearRaw >= 2020 && yearRaw <= 2100
                ? yearRaw
                : def.year,
        shop: shopRaw && UUID_RE.test(shopRaw) ? shopRaw : "all",
    };
}

export function serializeHrDashboardFilters(f: HrDashboardFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("date", f.date);
    sp.set("month", String(f.month));
    sp.set("year", String(f.year));
    if (f.shop !== "all") sp.set("shop", f.shop);
    return sp;
}