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
    list_price: number;
    create_date: string | false | null;
    x_studio_segment: string | false | null;
    x_studio_many2one_field_21bvh: [number, string] | false | null; // Marque Odoo
    x_studio_many2one_field_Arl5D: [number, string] | false | null; // Couleur Odoo
    pos_categ_ids: number[] | false | null;
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

export interface OdooPosCategory {
    id: number;
    name: string;
}

/* ─── 5bis. HELPERS POS CATEGORIES ─── */

/**
 * Extraction sécurisée des IDs de catégories POS d'un item.
 * Robuste face aux valeurs Json arbitraires, null, undefined ou malformées.
 */
export const getPosCategoryIds = (item: StockAuditItem): number[] => {
    const raw = (item as any).pos_category_ids;
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is number => typeof id === "number" && Number.isInteger(id));
};

/**
 * Extraction sécurisée des noms de catégories POS d'un item.
 * L'ordre des noms correspond à l'ordre des IDs (alignement garanti à l'insert).
 */
export const getPosCategoryNames = (item: StockAuditItem): string[] => {
    const raw = (item as any).pos_category_names;
    if (!Array.isArray(raw)) return [];
    return raw.filter((n): n is string => typeof n === "string" && n.length > 0);
};

/**
 * Vérifie si un item appartient à au moins une des catégories POS données.
 * Utilisé par le filtre multi-select d'AuditDataTable.
 */
export const matchesAnyPosCategory = (
    item: StockAuditItem,
    selectedIds: number[]
): boolean => {
    if (selectedIds.length === 0) return true;   // [] = toutes
    const ids = getPosCategoryIds(item);
    if (ids.length === 0) return false;
    const set = new Set(selectedIds);
    return ids.some((id) => set.has(id));
};

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

/**
 * Agrège les KPIs par catégorie POS.
 *
 * RÈGLE : un item multi-catégories compte dans CHACUNE de ses catégories.
 * Les items sans catégorie → regroupés sous id=null, name="Non catégorisé"
 * et triés en dernier.
 */
export const aggregateByPosCategory = (
    items: StockAuditItem[]
): PosCategoryAggregate[] => {
    const map = new Map<number | null, PosCategoryAggregate>();

    const getOrCreate = (id: number | null, name: string): PosCategoryAggregate => {
        let agg = map.get(id);
        if (!agg) {
            agg = {
                id,
                name,
                totalItems: 0,
                scannedItems: 0,
                remainingItems: 0,
                soldElsewhere: 0,
                totalDiffQty: 0,
                totalDiffValue: 0,
            };
            map.set(id, agg);
        }
        return agg;
    };

    for (const item of items) {
        const ids = getPosCategoryIds(item);
        const names = getPosCategoryNames(item);

        const counted = item.counted_qty ?? 0;
        const theoretical = item.theoretical_qty ?? 0;
        const cost = Number(item.unit_cost) || 0;
        const diff = counted - theoretical;
        const isScanned = counted === 1;
        const isSold = hasSoldElsewhere(item);

        if (ids.length === 0) {
            const agg = getOrCreate(null, "Non catégorisé");
            agg.totalItems += 1;
            if (isScanned) agg.scannedItems += 1;
            else agg.remainingItems += 1;
            if (isSold) agg.soldElsewhere += 1;
            agg.totalDiffQty += diff;
            agg.totalDiffValue += diff * cost;
            continue;
        }

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const name = names[i] ?? `#${id}`;
            const agg = getOrCreate(id, name);
            agg.totalItems += 1;
            if (isScanned) agg.scannedItems += 1;
            else agg.remainingItems += 1;
            if (isSold) agg.soldElsewhere += 1;
            agg.totalDiffQty += diff;
            agg.totalDiffValue += diff * cost;
        }
    }

    return Array.from(map.values()).sort((a, b) => {
        if (a.id === null && b.id !== null) return 1;
        if (a.id !== null && b.id === null) return -1;
        return a.name.localeCompare(b.name);
    });
};

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