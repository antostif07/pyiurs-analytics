import type { StoreTransferFilter } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getDefaultTransferFilters(): StoreTransferFilter {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toIso(firstOfMonth), to: toIso(now) };
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseTransferFilters(raw: Raw): StoreTransferFilter {
    const def = getDefaultTransferFilters();
    const fromRaw = one(raw.from);
    const toRaw = one(raw.to);
    const from = fromRaw && ISO_DATE.test(fromRaw) ? fromRaw : def.from;
    const to = toRaw && ISO_DATE.test(toRaw) ? toRaw : def.to;
    return { from: from <= to ? from : to, to: to >= from ? to : from };
}

export function serializeTransferFilters(f: StoreTransferFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("from", f.from);
    sp.set("to", f.to);
    return sp;
}