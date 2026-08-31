import { Database, Tables, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

/* ─── 1. DÉFINITION DES CONSTANTES & UNIONS SÉCURISÉES ─── */
export type AuditStatus = "draft" | "in_progress" | "completed" | "validated";
export type AuditDepartment = "Tous" | "Beauty" | "Femme" | "Enfant";
export type StatusFilter = "all" | "scanned" | "remaining" | "sold_elsewhere";

/* ─── 2. TYPES SUPABASE BRUTS GENERES ─── */
export type RawStockAudit = Tables<"stock_audits">;
export type RawStockAuditItem = Tables<"stock_audit_items">;

/* ─── 3. TYPES ENRICHIS APPLICATION & UI ─── */
export type StockAudit = Omit<RawStockAudit, "status" | "department"> & {
    status: AuditStatus;
    department: AuditDepartment;
};

// Type d'un article d'audit complet
export type StockAuditItem = RawStockAuditItem;

// Types pour les opérations Supabase Insert & Update
export type StockAuditInsert = TablesInsert<"stock_audits">;
export type StockAuditUpdate = TablesUpdate<"stock_audits">;
export type StockAuditItemInsert = TablesInsert<"stock_audit_items">;
export type StockAuditItemUpdate = TablesUpdate<"stock_audit_items">;

/* ─── 4. INTERFACES DE FILTRES ET D'EMPLACEMENTS ─── */
export interface AuditFilters {
    allowedShopIds?: string[];
    status?: AuditStatus | 'all';
    searchQuery?: string;
}

export interface SoldLocation {
    id: number | string;
    name: string;
}

/* ─── 5. TYPE GUARDS & HELPERS ULTRA-SÉCURISÉS ─── */

/**
 * Extraction sécurisée du tableau d'emplacements de vente (-1) depuis la colonne JSONB
 */
export const getSoldLocations = (item: StockAuditItem): SoldLocation[] => {
    if (!item.sold_locations) return [];
    if (Array.isArray(item.sold_locations)) {
        return item.sold_locations as unknown as SoldLocation[];
    }
    if (typeof item.sold_locations === "string") {
        try {
            const parsed = JSON.parse(item.sold_locations);
            return Array.isArray(parsed) ? (parsed as SoldLocation[]) : [];
        } catch {
            return [];
        }
    }
    return [];
};

/**
 * Vérifie si le produit a au moins un emplacement de vente négatif dans Odoo (-1)
 */
export const hasSoldElsewhere = (item: StockAuditItem): boolean => {
    return getSoldLocations(item).length > 0;
};

/**
 * Vérifie si le produit a été scanné (compté = 1)
 */
export const isItemScanned = (item: StockAuditItem): boolean => {
    return (item.counted_qty ?? 0) === 1;
};

/* ─── 6. TYPES ODOO JSON-RPC STRICTS ─── */

export interface OdooQuant {
    id: number;
    product_id: [number, string];
    location_id: [number, string];
    quantity: number;
    company_id?: [number, string] | false | null;
}

export interface OdooProduct {
    id: number;
    name: string;
    barcode: string | false | null;
    default_code: string | false | null;
    hs_code: string | false | null;
    standard_price: number;
    create_date: string | false | null;
    x_studio_segment: string | false | null;
    x_studio_many2one_field_21bvh: [number, string] | false | null; // Marque Odoo
    x_studio_many2one_field_Arl5D: [number, string] | false | null; // Couleur Odoo
}

/**
 * Helper pour extraire proprement le nom d'un champ Many2one Odoo tuple [id, "Nom"]
 */
export const extractOdooMany2oneName = (
    field: [number, string] | false | null | undefined,
    fallback = "N/A"
): string => {
    if (Array.isArray(field) && field.length >= 2 && typeof field[1] === "string") {
        return field[1];
    }
    return fallback;
};