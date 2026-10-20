// app/inventory/rebalancing/_lib/filters.ts

export interface RebalancingFilters {
    /** Odoo company_id sélectionné (null = aucune sélection) */
    companyId: number | null;
}

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;

export function getDefaultFilters(): RebalancingFilters {
    return { companyId: null };
}

export function parseRebalancingFilters(raw: Raw): RebalancingFilters {
    const companyRaw = one(raw.company);
    const id = companyRaw ? Number(companyRaw) : null;

    return {
        companyId:
            id !== null && Number.isFinite(id) && id > 0 ? id : null,
    };
}

export function serializeRebalancingFilters(
    f: RebalancingFilters,
): URLSearchParams {
    const sp = new URLSearchParams();
    if (f.companyId !== null) sp.set("company", String(f.companyId));
    return sp;
}