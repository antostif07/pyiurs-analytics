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

/** Rôles ayant accès complet au module /finance */
export const FINANCE_ROLES = [
    "admin",
    "manager",
    "financier",
] as const satisfies readonly UserRole[];

export type FinanceRole = (typeof FINANCE_ROLES)[number];

export function isFinanceRole(role: unknown): role is FinanceRole {
    return (
        typeof role === "string" &&
        (FINANCE_ROLES as readonly string[]).includes(role)
    );
}

/** Le rôle controller a un accès restreint à /finance/expenses uniquement */
export const CONTROLLER_ROLE = "controller" as const;

/** Chemins autorisés pour le rôle controller (préfixes) */
export const CONTROLLER_ALLOWED_PATHS = ["/finance/expenses"] as const;

/**
 * Rôle global d'accès /finance = admin/manager/financier OU controller.
 * Note : le controller est filtré ensuite par path dans layout.tsx.
 */
export function canAccessFinance(role: unknown): boolean {
    return isFinanceRole(role) || role === CONTROLLER_ROLE;
}