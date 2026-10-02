// app/ceo-report/_lib/filters.ts
import { Period, ReportFilter, Segment, Store } from "./types/reports";

export const defaultFilters: ReportFilter = {
    period: "month",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const parseDate = (v: string | undefined): string | undefined =>
    v && ISO_DATE.test(v) ? v : undefined;

export function parseFilters(searchParams: Raw): ReportFilter {
    const period = one(searchParams.period) as Period | undefined;
    const store = one(searchParams.store) as Store | undefined;
    const segment = one(searchParams.segment) as Segment | undefined;
    const year = Number(one(searchParams.year));
    const monthRaw = one(searchParams.month);
    const month =
        monthRaw === undefined || monthRaw === "all" ? null : Number(monthRaw);

    const resolvedPeriod =
        period && PERIODS.includes(period) ? period : defaultFilters.period;

    // ⬇️ from/to : noms courts, lus UNIQUEMENT en mode custom
    const from =
        resolvedPeriod === "custom" ? parseDate(one(searchParams.from)) : undefined;
    const to =
        resolvedPeriod === "custom" ? parseDate(one(searchParams.to)) : undefined;

    return {
        period: resolvedPeriod,
        year: Number.isFinite(year) && year > 2000 ? year : defaultFilters.year,
        month: Number.isFinite(month as number) ? (month as number) : null,
        store: store && STORES.includes(store) ? store : defaultFilters.store,
        segment:
            segment && SEGMENTS.includes(segment) ? segment : defaultFilters.segment,
        category: one(searchParams.category) ?? null,
        from,
        to,
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

    // from/to uniquement en mode custom
    if (filters.period === "custom") {
        if (filters.from) sp.set("from", filters.from);
        if (filters.to) sp.set("to", filters.to);
    }

    return sp;
}

// ────────────────────────────────────────────────────────────────────────────
// Helper : résout la plage de dates réelle depuis un ReportFilter
// Source UNIQUE de vérité → utilisable côté client ET côté API route
// ────────────────────────────────────────────────────────────────────────────

export interface ResolvedDateRange {
    /** ISO yyyy-MM-dd (date locale) */
    from: string;
    /** ISO yyyy-MM-dd */
    to: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function resolveDateRange(filters: ReportFilter): ResolvedDateRange {
    const { period, year, month } = filters;

    // ─── Fallbacks : mois / année courants ─────────────────────────────
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const effectiveYear =
        Number.isFinite(year) && year > 2000 ? year : currentYear;
    const m = month ?? currentMonth;

    // ─── Court-circuit : période personnalisée ─────────────────────────
    if (period === "custom" && filters.from && filters.to) {
        return { from: filters.from, to: filters.to };
    }

    // ─── Aujourd'hui ───────────────────────────────────────────────────
    if (period === "today") {
        const d = toIso(now);
        return { from: d, to: d };
    }

    // ─── Semaine courante (lundi → dimanche) ───────────────────────────
    if (period === "week") {
        const day = now.getDay() || 7; // lundi = 1, dimanche = 7
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { from: toIso(monday), to: toIso(sunday) };
    }

    // ─── Mois ──────────────────────────────────────────────────────────
    if (period === "month") {
        const from = new Date(effectiveYear, m - 1, 1);
        const to = new Date(effectiveYear, m, 0); // dernier jour du mois
        return { from: toIso(from), to: toIso(to) };
    }

    // ─── Mois précédent ────────────────────────────────────────────────
    if (period === "last_month") {
        const from = new Date(effectiveYear, m - 2, 1);
        const to = new Date(effectiveYear, m - 1, 0);
        return { from: toIso(from), to: toIso(to) };
    }

    // ─── Trimestre ─────────────────────────────────────────────────────
    if (period === "quarter") {
        const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
        const from = new Date(effectiveYear, qStartMonth - 1, 1);
        const to = new Date(effectiveYear, qStartMonth + 2, 0);
        return { from: toIso(from), to: toIso(to) };
    }

    // ─── Année ─────────────────────────────────────────────────────────
    if (period === "year") {
        return {
            from: `${effectiveYear}-01-01`,
            to: `${effectiveYear}-12-31`,
        };
    }

    // ─── Fallback : mois courant ───────────────────────────────────────
    const from = new Date(effectiveYear, m - 1, 1);
    const to = new Date(effectiveYear, m, 0);
    return { from: toIso(from), to: toIso(to) };
}