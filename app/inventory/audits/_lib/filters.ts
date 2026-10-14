// app/inventory/audits/_lib/filters.ts
import type { AuditStatus } from "./types";

export interface AuditListFilters {
    status: AuditStatus | "all";
    search: string;
}

const VALID_STATUSES: AuditStatus[] = [
    "draft",
    "in_progress",
    "completed",
    "validated",
];

export function getDefaultFilters(): AuditListFilters {
    return { status: "all", search: "" };
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function parseAuditFilters(raw: Raw): AuditListFilters {
    const defaults = getDefaultFilters();

    const statusRaw = one(raw.status);
    const status: AuditStatus | "all" =
        statusRaw && (VALID_STATUSES as readonly string[]).includes(statusRaw)
            ? (statusRaw as AuditStatus)
            : "all";

    const search = (one(raw.search) ?? "").trim();

    return { status, search };
}

export function serializeAuditFilters(f: AuditListFilters): URLSearchParams {
    const sp = new URLSearchParams();
    if (f.status !== "all") sp.set("status", f.status);
    if (f.search) sp.set("search", f.search);
    return sp;
}