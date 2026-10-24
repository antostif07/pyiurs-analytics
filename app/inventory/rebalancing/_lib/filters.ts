// app/inventory/rebalancing/_lib/filters.ts

export interface RebalancingFilters {
    companyId: string | null;
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getDefaultFilters(): RebalancingFilters {
    return { companyId: null };
}

export function parseRebalancingFilters(
    params: Record<string, string | undefined>,
): RebalancingFilters {
    const company = params.company?.trim();
    // Seul un UUID valide est accepté (rétrocompat : les anciens
    // `?company=<odoo_id>` sont ignorés → l'utilisateur re-sélectionne).
    const companyId =
        company && UUID_RE.test(company) ? company : null;
    return { companyId };
}

export function serializeRebalancingFilters(
    f: RebalancingFilters,
): URLSearchParams {
    const sp = new URLSearchParams();
    if (f.companyId !== null) sp.set("company", f.companyId);
    return sp;
}