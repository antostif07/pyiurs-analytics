// app/revenue/invoices-redsup/_lib/filters.ts

import type { RedsupFilter } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function getDefaultFilters(): RedsupFilter {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
        from: toIso(firstOfMonth),
        to: toIso(now),
        state: "all",
    };
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseRedsupFilters(raw: Raw): RedsupFilter {
    const defaults = getDefaultFilters();

    const from = one(raw.from);
    const to = one(raw.to);
    const stateRaw = one(raw.state);

    const validStates = ["all", "validated", "pending"] as const;

    return {
        from: from && ISO_DATE.test(from) ? from : defaults.from,
        to: to && ISO_DATE.test(to) ? to : defaults.to,
        state:
            stateRaw && (validStates as readonly string[]).includes(stateRaw)
                ? (stateRaw as RedsupFilter["state"])
                : "all",
    };
}

export function serializeRedsupFilters(f: RedsupFilter): URLSearchParams {
    const sp = new URLSearchParams();
    sp.set("from", f.from);
    sp.set("to", f.to);
    if (f.state !== "all") sp.set("state", f.state);
    return sp;
}