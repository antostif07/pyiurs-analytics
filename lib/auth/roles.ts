// @/lib/auth/roles.ts
import type { UserRole } from '@/lib/constants'


export const EXECUTIVE_ROLES = ['admin'] as const satisfies readonly UserRole[]

export type ExecutiveRole = (typeof EXECUTIVE_ROLES)[number]

export function isExecutiveRole(role: unknown): role is ExecutiveRole {
    return (
        typeof role === 'string' &&
        (EXECUTIVE_ROLES as readonly string[]).includes(role)
    )
}

/**
 * Rôles "voient tout le groupe sans filtre boutique".
 * V1 : admin uniquement.
 */
export function isGroupWideRole(role: ExecutiveRole): boolean {
    return role === 'admin'
}

/**
 * Rôles autorisés à consulter /finance.
 *
 * Aligné sur MODULES_CONFIG["finance"].permissions → ["admin", "manager", "financier"]
 *
 * ⚠️ Sous-rôles :
 *   - admin   → accès total (+ settings/banks + settings)
 *   - manager → accès métier, PAS les settings
 *   - financier → accès métier, PAS la gestion des fonds
 *   Ces restrictions sont gérées item par item dans NAV_GROUPS, PAS ici.
 */
export const FINANCE_ROLES = [
    "admin",
    "manager",
    "financier",
] as const satisfies readonly UserRole[]

export type FinanceRole = (typeof FINANCE_ROLES)[number]

export function isFinanceRole(role: unknown): role is FinanceRole {
    return (
        typeof role === "string" &&
        (FINANCE_ROLES as readonly string[]).includes(role)
    )
}