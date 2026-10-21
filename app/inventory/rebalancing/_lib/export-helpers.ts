// app/inventory/rebalancing/_lib/export-helpers.ts
import type { RebalancingRow } from "./types";

export type ExportType = "internal" | "inter_company";

interface ClassifiedRow {
    row: RebalancingRow;
    type: ExportType;
    primarySource: NonNullable<RebalancingRow["sources"]>[number];
}

export function classifyRows(
    rows: RebalancingRow[],
    destCompanyId: number,
): ClassifiedRow[] {
    const result: ClassifiedRow[] = [];
    for (const row of rows) {
        if (row.sources.length === 0) continue;
        const primary = row.sources[0];
        const type: ExportType =
            primary.companyId === destCompanyId
                ? "internal"
                : "inter_company";
        result.push({ row, type, primarySource: primary });
    }
    return result;
}

/* ══════════════════════════════════════════════════════════════════ */
/* INTER-COMPANY : regroupement par (source company → dest company)  */
/* ══════════════════════════════════════════════════════════════════ */

export interface SaleOrderGroup {
    sourceCompanyName: string;
    destCompanyName: string;
    lines: Array<{ productName: string; quantity: number }>;
}

export function groupForSaleOrders(
    classified: ClassifiedRow[],
    destCompanyName: string,
): SaleOrderGroup[] {
    const map = new Map<string, SaleOrderGroup>();

    for (const c of classified) {
        if (c.type !== "inter_company") continue;
        const src = c.primarySource;
        const key = src.companyName;
        let g = map.get(key);
        if (!g) {
            g = {
                sourceCompanyName: src.companyName,
                destCompanyName,
                lines: [],
            };
            map.set(key, g);
        }
        const existing = g.lines.find(
            (l) => l.productName === c.row.productName,
        );
        if (existing) {
            existing.quantity += Math.abs(c.row.quantity);
        } else {
            g.lines.push({
                productName: c.row.productName,
                quantity: Math.abs(c.row.quantity),
            });
        }
    }

    return Array.from(map.values());
}

/* ══════════════════════════════════════════════════════════════════ */
/* INTERNAL : regroupement par (source location → dest location)     */
/* ══════════════════════════════════════════════════════════════════ */

export interface PickingGroup {
    sourceLocationCompleteName: string;
    destLocationCompleteName: string;
    lines: Array<{ productName: string; quantity: number }>;
}

export function groupForPickings(
    classified: ClassifiedRow[],
): PickingGroup[] {
    const map = new Map<string, PickingGroup>();

    for (const c of classified) {
        if (c.type !== "internal") continue;
        const src = c.primarySource;
        const key = `${src.locationId}|${c.row.locationId}`;
        let g = map.get(key);
        if (!g) {
            g = {
                sourceLocationCompleteName:
                    src.locationCompleteName ?? src.locationName,
                destLocationCompleteName:
                    c.row.locationCompleteName ?? c.row.locationName,
                lines: [],
            };
            map.set(key, g);
        }
        const existing = g.lines.find(
            (l) => l.productName === c.row.productName,
        );
        if (existing) {
            existing.quantity += Math.abs(c.row.quantity);
        } else {
            g.lines.push({
                productName: c.row.productName,
                quantity: Math.abs(c.row.quantity),
            });
        }
    }

    return Array.from(map.values());
}

/* ══════════════════════════════════════════════════════════════════ */
/* FILENAME HELPERS                                                 */
/* ══════════════════════════════════════════════════════════════════ */

export function sanitizeForFilename(input: string): string {
    return input
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\//g, "-")
        .replace(/[^a-zA-Z0-9\-_]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 60);
}

function shortDate(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Internal — YYYYMMDD_<company>_<srcLoc>_VERS_<dstLoc>.xlsx */
export function buildInternalFilename(
    companyName: string,
    groups: PickingGroup[],
): string {
    const date = shortDate();
    const company = sanitizeForFilename(companyName);

    if (groups.length === 0) {
        return `${date}_${company}_VIDE.xlsx`;
    }
    if (groups.length === 1) {
        const g = groups[0];
        const src = sanitizeForFilename(g.sourceLocationCompleteName);
        const dst = sanitizeForFilename(g.destLocationCompleteName);
        return `${date}_${company}_${src}_VERS_${dst}.xlsx`;
    }
    return `${date}_${company}_MULTI_${groups.length}TR.xlsx`;
}

/** Sale — YYYYMMDD_<source>_VERS_<dest>.xlsx */
export function buildSaleFilename(
    destCompanyName: string,
    groups: SaleOrderGroup[],
): string {
    const date = shortDate();
    const dest = sanitizeForFilename(destCompanyName);

    if (groups.length === 0) {
        return `${date}_VIDE_VERS_${dest}.xlsx`;
    }
    if (groups.length === 1) {
        const g = groups[0];
        const src = sanitizeForFilename(g.sourceCompanyName);
        return `${date}_${src}_VERS_${dest}.xlsx`;
    }
    return `${date}_MULTI_${groups.length}SO_VERS_${dest}.xlsx`;
}