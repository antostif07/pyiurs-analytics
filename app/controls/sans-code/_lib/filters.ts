import { endOfMonth, format, startOfMonth } from "date-fns";
import type { SansCodeFilter } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function getDefaultSansCodeFilters(): SansCodeFilter {
    const now = new Date();
    return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
        pos: null,
    };
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseSansCodeFilters(raw: Raw): SansCodeFilter {
    const defaults = getDefaultSansCodeFilters();
    const fromRaw = one(raw.from);
    const toRaw = one(raw.to);
    const posRaw = one(raw.pos)?.trim();

    const from = fromRaw && ISO_DATE.test(fromRaw) ? fromRaw : defaults.from;
    const to = toRaw && ISO_DATE.test(toRaw) ? toRaw : defaults.to;

    return {
        from: from <= to ? from : to,
        to: to >= from ? to : from,
        pos: posRaw && posRaw !== "all" ? posRaw : null,
    };
}

export function serializeSansCodeFilters(f: SansCodeFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("from", f.from);
    sp.set("to", f.to);
    if (f.pos) sp.set("pos", f.pos);
    return sp;
}