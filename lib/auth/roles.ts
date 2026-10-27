// lib/auth/roles.ts
import type { UserRole } from "@/lib/constants";

// ═══════════════════════════════════════════════════════════════════════════
// Executive (CEO Report)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rôles autorisés à consulter /ceo-report.
 * Aligné sur MODULES_CONFIG["ceo-report"].permissions → ["admin"]
 */
export const EXECUTIVE_ROLES = ["admin"] as const satisfies readonly UserRole[];

export type ExecutiveRole = (typeof EXECUTIVE_ROLES)[number];

export function isExecutiveRole(role: unknown): role is ExecutiveRole {
    return (
        typeof role === "string" &&
        (EXECUTIVE_ROLES as readonly string[]).includes(role)
    );
}

export function isGroupWideRole(role: ExecutiveRole): boolean {
    return role === "admin";
}

// ═══════════════════════════════════════════════════════════════════════════
// Finance
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// Revenue
// ═══════════════════════════════════════════════════════════════════════════

export const REVENUE_ROLES = [
    "admin",
    "manager",
    "financier",
] as const satisfies readonly UserRole[];

export type RevenueRole = (typeof REVENUE_ROLES)[number];

export function isRevenueRole(role: unknown): role is RevenueRole {
    return (
        typeof role === "string" &&
        (REVENUE_ROLES as readonly string[]).includes(role)
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Inventory
// ═══════════════════════════════════════════════════════════════════════════

export const INVENTORY_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
    "financier",
    "user",
] as const satisfies readonly UserRole[];

export type InventoryRole = (typeof INVENTORY_ROLES)[number];

export function isInventoryRole(role: unknown): role is InventoryRole {
    return (
        typeof role === "string" &&
        (INVENTORY_ROLES as readonly string[]).includes(role)
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Controller — rôle restreint
// ═══════════════════════════════════════════════════════════════════════════

export const CONTROLLER_ROLE = "controller" as const;

/**
 * Chemins autorisés pour le rôle controller dans /finance.
 */
export const CONTROLLER_FINANCE_ALLOWED_PATHS = [
    "/finance/expenses",
    "/finance/loyalty",
] as const;

/**
 * Chemins autorisés pour le rôle controller dans /revenue.
 */
export const CONTROLLER_REVENUE_ALLOWED_PATHS = [
    "/revenue/invoices-redsup",
] as const;

/**
 * Rétrocompatibilité : ancienne constante utilisée avant le split
 * finance/revenue. Peut être supprimée une fois tous les layouts migrés.
 */
export const CONTROLLER_ALLOWED_PATHS = CONTROLLER_FINANCE_ALLOWED_PATHS;

export const SETTINGS_ROLES = ["admin"] as const satisfies readonly UserRole[]
export type SettingsRole = (typeof SETTINGS_ROLES)[number]
export function isSettingsRole(role: unknown): role is SettingsRole {
    return (
        typeof role === "string" &&
        (SETTINGS_ROLES as readonly string[]).includes(role)
    )
}

/**
 * Rôles autorisés à accéder au suivi de stock par segment (Femme, Beauty…).
 * Aligné sur INVENTORY_NAV_GROUPS["segments-stock-group"] → items stock-*
 * Volontairement plus strict que INVENTORY_ROLES : exclut `financier`
 * qui peut accéder à /inventory mais ne doit pas voir les données segment.
 */
export const STOCK_SEGMENT_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
    "user",
] as const satisfies readonly InventoryRole[];

export type StockSegmentRole = (typeof STOCK_SEGMENT_ROLES)[number];

export function canAccessStockSegment(role: unknown): role is StockSegmentRole {
    return (
        typeof role === "string" &&
        (STOCK_SEGMENT_ROLES as readonly string[]).includes(role)
    );
}

// ─── Purchases ───────────────────────────────────────────────
export const PURCHASES_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
    "financier",
] as const satisfies readonly InventoryRole[];

export type PurchasesRole = (typeof PURCHASES_ROLES)[number];

export function canAccessPurchases(role: unknown): role is PurchasesRole {
    return (
        typeof role === "string" &&
        (PURCHASES_ROLES as readonly string[]).includes(role)
    );
}