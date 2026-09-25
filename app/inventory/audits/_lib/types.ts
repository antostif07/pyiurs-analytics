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
    list_price: number;
    create_date: string | false | null;
    x_studio_segment: string | false | null;
    x_studio_many2one_field_21bvh: [number, string] | false | null; // Marque Odoo
    x_studio_many2one_field_Arl5D: [number, string] | false | null; // Couleur Odoo
    pos_categ_ids: number[] | false | null;
}

export interface OdooPosCategory {
    id: number;
    name: string;
}

export interface PosCategoryAggregate {
    id: number | null;              // null = "Non catégorisé"
    name: string;
    totalItems: number;
    scannedItems: number;
    remainingItems: number;
    soldElsewhere: number;
    totalDiffQty: number;
    totalDiffValue: number;
}

/* ─── 8. VENDUS AILLEURS — ANALYSE POUR TRANSFERT ODOO ─── */

export type SoldElsewhereAction = "internal_transfer" | "inter_company";

export interface OdooLocation {
    id: number;
    name: string;
    complete_name: string;
    company_id: [number, string] | false | null;
    usage: string;
}

export interface OdooCompany {
    id: number;
    name: string;
}

export interface OdooWarehouse {
    id: number;
    name: string;
    code: string;
    company_id: [number, string] | false | null;
    lot_stock_id: [number, string] | false | null;
    in_type_id: [number, string] | false | null;
    out_type_id: [number, string] | false | null;
    int_type_id: [number, string] | false | null;
}

/** Une ligne d'analyse : 1 item × 1 location source négative */
export interface SoldElsewhereLine {
    /* Item */
    itemId: string;
    barcode: string;
    productName: string;
    odooProductId: number;
    unitCost: number;
    quantity: number;

    /* Source */
    sourceLocationId: number;
    sourceLocationName: string;
    sourceCompanyId: number;
    sourceCompanyName: string;

    /* Destination */
    destinationLocationId: number;
    destinationLocationName: string;
    destinationCompanyId: number;
    destinationCompanyName: string;

    /* Classification */
    action: SoldElsewhereAction;
}

/** Groupe d'analyse par (company source, action) */
export interface SoldElsewhereGroup {
    action: SoldElsewhereAction;
    sourceCompanyId: number;
    sourceCompanyName: string;
    destinationCompanyId: number;
    destinationCompanyName: string;
    lines: SoldElsewhereLine[];
    totalQty: number;
    totalValue: number;
}

/** Résultat complet de l'analyse */
export interface SoldElsewhereAnalysis {
    auditId: string;
    auditReference: string;
    auditedCompanyId: number;
    auditedCompanyName: string;
    destinationLocationId: number;
    destinationLocationName: string;
    groups: SoldElsewhereGroup[];
    totalLines: number;
    totalQty: number;
    totalValue: number;
    unprocessedItems: number;   // items avec sold_locations mais sans location résolue
}

/* ─── 9. HORS PÉRIMÈTRE — LOCATIONS SOURCES (POSITIVES) ─── */

export interface FoundLocation {
    id: number;                       // location_id Odoo
    name: string;                     // complete_name Odoo
    quantity: number;                 // quantité positive à cet endroit
    company_id: number;
    company_name: string;
}


/**
 * Patch partiel d'un item d'audit pour la resynchronisation.
 * Reste en types métier jusqu'au cast final vers Json.
 */
export type SyncItemPatch = {
    id: string;
    sold_locations: SoldLocation[];
    hs_code: string;
    brand: string;
    color: string;
    odoo_create_date: string | null;
    unit_cost: number;
    pos_category_ids: number[];
    pos_category_names: string[];
};

/** Filtres étendus pour l'audit table */
export interface ExtendedAuditFilters {
    searchQuery: string;
    statusFilter: "all" | "scanned" | "remaining" | "sold_elsewhere";
    brandFilter: string;
    colorFilter: string;
    theoreticalStockFilter: "all" | "one" | "zero" | "greater_than_one" | "negative";
    soldElsewhereFilter: "all" | "yes" | "no";
    specificSoldLocationFilter: string;
    posCategoryFilter: number[];
    foundElsewhereFilter: "all" | "yes" | "no";
    cosmeticFilter: "all" | "cosmetic" | "generic";
}

export interface AuditStats {
    totalItemsCount: number;
    scannedItemsCount: number;
    remainingItemsCount: number;
    soldElsewhereCount: number;
    progressPercent: number;
    totalDiffQty: number;
    totalDiffValue: number;
    scannedValuation: number;
    totalValuation: number;
}

export interface OdooPosConfig {
    id: number;
    name: string;
    picking_type_id: [number, string] | false | null;
}

export interface OdooPickingType {
    id: number;
    name: string;
    default_location_src_id: [number, string] | false | null;
}