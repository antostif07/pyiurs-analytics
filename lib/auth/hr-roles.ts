import type { UserRole } from "@/lib/constants";

/**
 * Tous les rôles ayant accès à l'espace /hr (les restrictions fines
 * s'appliquent ensuite par sous-module et sur la visibilité des données).
 */
export const HR_ROLES = [
    "admin",
    "financier",
    "manager",
    "user",
    "inventory-manager",
    "inventory_manager",
] as const satisfies readonly UserRole[];

export type HrRole = (typeof HR_ROLES)[number];

export function isHrRole(role: unknown): role is HrRole {
    return (
        typeof role === "string" &&
        (HR_ROLES as readonly string[]).includes(role)
    );
}

/** Accès global RH (toutes boutiques, salaires, paie, validation) */
export const HR_FULL_ACCESS_ROLES: readonly HrRole[] = ["admin", "financier"];

export function isHrFullAccessRole(role: unknown): boolean {
    return (
        typeof role === "string" &&
        (HR_FULL_ACCESS_ROLES as readonly string[]).includes(role)
    );
}

/** Rôles pouvant consulter/gérer le pointage d'une équipe (boutique assignée) */
export const HR_TEAM_ROLES: readonly HrRole[] = [
    "admin",
    "financier",
    "manager",
    "inventory-manager",
    "inventory_manager",
];

export function isHrTeamRole(role: unknown): boolean {
    return (
        typeof role === "string" &&
        (HR_TEAM_ROLES as readonly string[]).includes(role)
    );
}