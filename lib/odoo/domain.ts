// lib/odoo/domain.ts
import type { OdooDomain } from "./odoo-json2-client";

type Leaf = [string, string, unknown];

/**
 * Compose un domaine Odoo en filtrant les conditions optionnelles.
 *
 * Usage :
 *   buildDomain(
 *     ["date", ">=", from],
 *     ["date", "<=", to],
 *     filters.categoryIds.length ? ["product_id", "in", filters.categoryIds] : null,
 *   )
 */
export function buildDomain(
    ...leaves: Array<Leaf | null | undefined | false>
): OdooDomain {
    return leaves.filter((l): l is Leaf => Array.isArray(l));
}