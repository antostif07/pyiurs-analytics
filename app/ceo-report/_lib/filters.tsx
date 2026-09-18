import { Period, ReportFilter, Segment, Store } from "./types/reports";


export const defaultFilters: ReportFilter = {
    period: "month",
    year: 2026,
    month: 9,
    store: "all",
    segment: "all",
    category: null,
};

const PERIODS: Period[] = [
    "today", "week", "month", "last_month", "quarter", "year", "custom",
];
const STORES: Store[] = ["all", "P24", "P.MTO", "P.LMB", "P.KTM", "P.ONL", "P.BC"];
const SEGMENTS: Segment[] = ["all", "Femme", "Kids", "Beauty"];

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseFilters(searchParams: Raw): ReportFilter {
    const period = one(searchParams.period) as Period | undefined;
    const store = one(searchParams.store) as Store | undefined;
    const segment = one(searchParams.segment) as Segment | undefined;
    const year = Number(one(searchParams.year));
    const monthRaw = one(searchParams.month);
    const month =
        monthRaw === undefined || monthRaw === "all" ? null : Number(monthRaw);

    return {
        period: period && PERIODS.includes(period) ? period : defaultFilters.period,
        year: Number.isFinite(year) && year > 2000 ? year : defaultFilters.year,
        month: Number.isFinite(month as number) ? (month as number) : null,
        store: store && STORES.includes(store) ? store : defaultFilters.store,
        segment:
            segment && SEGMENTS.includes(segment) ? segment : defaultFilters.segment,
        category: one(searchParams.category) ?? null,
    };
}

export function serializeFilters(filters: ReportFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("period", filters.period);
    sp.set("year", String(filters.year));
    if (filters.month !== null) sp.set("month", String(filters.month));
    if (filters.store !== "all") sp.set("store", filters.store);
    if (filters.segment !== "all") sp.set("segment", filters.segment);
    if (filters.category) sp.set("category", filters.category);
    return sp;
}