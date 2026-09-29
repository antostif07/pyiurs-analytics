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