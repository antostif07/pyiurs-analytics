// app/inventory/_lib/filters.ts
import { parseISO, subDays } from "date-fns";

export type InventorySegment = "Tous" | "Femme" | "Beauty" | "Enfant";

export interface InventoryFilterState {
    /** null = toutes les companies */
    companyId: number | null;
    segment: InventorySegment;
    /** ISO yyyy-MM-dd */
    from: string;
    /** ISO yyyy-MM-dd */
    to: string;
    search: string;
    compare: boolean;
}

const SEGMENTS: InventorySegment[] = ["Tous", "Femme", "Beauty", "Enfant"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function getDefaultFilters(): InventoryFilterState {
    const today = new Date();
    return {
        companyId: null,
        segment: "Tous",
        from: toIso(subDays(today, 30)),
        to: toIso(today),
        search: "",
        compare: false,
    };
}

export function parseInventoryFilters(raw: Raw): InventoryFilterState {
    const defaults = getDefaultFilters();

    const companyRaw = one(raw.company);
    const companyId = companyRaw ? Number(companyRaw) : null;

    const segmentRaw = one(raw.segment);
    const segment: InventorySegment =
        segmentRaw && (SEGMENTS as readonly string[]).includes(segmentRaw)
            ? (segmentRaw as InventorySegment)
            : defaults.segment;

    const from = one(raw.from);
    const to = one(raw.to);
    const search = (one(raw.search) ?? "").trim();
    const compare = one(raw.compare) === "1";

    return {
        companyId:
            companyId !== null &&
                Number.isFinite(companyId) &&
                companyId > 0
                ? companyId
                : null,
        segment,
        from: from && ISO_DATE.test(from) ? from : defaults.from,
        to: to && ISO_DATE.test(to) ? to : defaults.to,
        search,
        compare,
    };
}

export function serializeInventoryFilters(
    f: InventoryFilterState,
): URLSearchParams {
    const sp = new URLSearchParams();
    if (f.companyId !== null) sp.set("company", String(f.companyId));
    if (f.segment !== "Tous") sp.set("segment", f.segment);
    sp.set("from", f.from);
    sp.set("to", f.to);
    if (f.search) sp.set("search", f.search);
    if (f.compare) sp.set("compare", "1");
    return sp;
}

/**
 * Construit un `DateRange` compatible `react-day-picker` (from/to toujours définis).
 */
export function toDateRange(f: InventoryFilterState) {
    return {
        from: parseISO(f.from),
        to: parseISO(f.to),
    };
}