// app/revenue/arpu/_lib/filters.ts
import { endOfMonth, parseISO, startOfMonth } from "date-fns";
import { ARPU_SEGMENTS, isArpuSegment, type ArpuSegment } from "./constants";

export interface ArpuFilterState {
    segments: ArpuSegment[];
    from: string;      // ISO yyyy-MM-dd
    to: string;        // ISO yyyy-MM-dd
    compare: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function getDefaultFilters(): ArpuFilterState {
    const now = new Date();
    return {
        segments: [...ARPU_SEGMENTS],
        from: toIso(startOfMonth(now)),
        to: toIso(endOfMonth(now)),
        compare: false,
    };
}

export function parseArpuFilters(raw: Raw): ArpuFilterState {
    const defaults = getDefaultFilters();

    const segmentsRaw = one(raw.segments);
    const segments: ArpuSegment[] = segmentsRaw
        ? segmentsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(isArpuSegment)
        : defaults.segments;

    const from = one(raw.from);
    const to = one(raw.to);

    return {
        segments: segments.length > 0 ? segments : defaults.segments,
        from: from && ISO_DATE.test(from) ? from : defaults.from,
        to: to && ISO_DATE.test(to) ? to : defaults.to,
        compare: one(raw.compare) === "1",
    };
}

export function serializeArpuFilters(f: ArpuFilterState): URLSearchParams {
    const sp = new URLSearchParams();
    // Sérialise uniquement si différent du défaut (= URL propre)
    const defaults = getDefaultFilters();
    const segmentsSorted = [...f.segments].sort().join(",");
    const defaultSegmentsSorted = [...defaults.segments].sort().join(",");

    if (segmentsSorted !== defaultSegmentsSorted) {
        sp.set("segments", segmentsSorted);
    }
    sp.set("from", f.from);
    sp.set("to", f.to);
    if (f.compare) sp.set("compare", "1");
    return sp;
}

export function toDateRange(f: ArpuFilterState): { from: Date; to: Date } {
    return {
        from: parseISO(f.from),
        to: parseISO(f.to),
    };
}