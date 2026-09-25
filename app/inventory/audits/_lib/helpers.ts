import { Json } from "@/lib/supabase/database.types";
import { AuditStats, FoundLocation, PosCategoryAggregate, SoldLocation, StockAuditItem } from "./types";

/**
 * Convertit une valeur métier en `Json` Supabase.
 * Utilisé UNIQUEMENT aux frontières (insert / RPC).
 */
export function toJson(value: unknown): Json {
    return value as unknown as Json;
}

/**
 * Narrow un champ `Json` (issu des types générés Supabase) en `SoldLocation[]`.
 * Tolère null, undefined, string JSON, array d'objets malformés.
 */
export function normalizeSoldLocations(value: unknown): SoldLocation[] {
    if (value == null) return [];

    // Cas 1 : déjà un tableau
    if (Array.isArray(value)) {
        return value
            .filter((v): v is { id: number; name: string } => {
                return (
                    typeof v === "object" &&
                    v !== null &&
                    typeof (v as any).id === "number" &&
                    typeof (v as any).name === "string"
                );
            })
            .map((v) => ({ id: v.id, name: v.name }));
    }

    // Cas 2 : string JSON (anciennes données non migrées)
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return normalizeSoldLocations(parsed);
        } catch {
            return [];
        }
    }

    return [];
}

/**
 * Calcule les KPIs d'une liste d'items (qu'elle soit filtrée ou non).
 * Utilisé par useAuditItems (global) et AuditScannerClient (filtré).
 */
export const computeAuditStats = (items: StockAuditItem[]): AuditStats => {
    const totalItemsCount = items.length;
    const scannedItemsCount = items.filter(isItemScanned).length;
    const remainingItemsCount = totalItemsCount - scannedItemsCount;
    const soldElsewhereCount = items.filter(hasSoldElsewhere).length;
    const progressPercent =
        totalItemsCount > 0
            ? Math.round((scannedItemsCount / totalItemsCount) * 100)
            : 0;

    const { totalDiffQty, totalDiffValue, scannedValuation, totalValuation } =
        items.reduce(
            (acc, item) => {
                const counted = item.counted_qty ?? 0;
                const theoretical = item.theoretical_qty ?? 0;
                const cost = Number(item.unit_cost) || 0;
                const diff = counted - theoretical;

                return {
                    totalDiffQty: acc.totalDiffQty + diff,
                    totalDiffValue: acc.totalDiffValue + diff * cost,
                    scannedValuation: acc.scannedValuation + counted * cost,
                    totalValuation: acc.totalValuation + theoretical * cost,
                };
            },
            {
                totalDiffQty: 0,
                totalDiffValue: 0,
                scannedValuation: 0,
                totalValuation: 0,
            }
        );

    return {
        totalItemsCount,
        scannedItemsCount,
        remainingItemsCount,
        soldElsewhereCount,
        progressPercent,
        totalDiffQty,
        totalDiffValue,
        scannedValuation,
        totalValuation,
    };
};


/**
 * Vrai si l'item possède au moins un emplacement positif connu.
 */
export const hasFoundElsewhere = (item: StockAuditItem): boolean =>
    getFoundLocations(item).length > 0;

/**
 * Vrai si l'item est hors périmètre (pas dans le snapshot de base,
 * marqué par theoretical_qty = 0 et counted_qty = 1).
 */
export const isUnexpectedItem = (item: StockAuditItem): boolean =>
    (item.theoretical_qty ?? 0) === 0 && (item.counted_qty ?? 0) === 1;


/**
 * Extraction sécurisée des emplacements positifs (found_locations) d'un item.
 * Tolère null, undefined, JSON invalide.
 */
export const getFoundLocations = (item: StockAuditItem): FoundLocation[] => {
    const raw = (item as any).found_locations;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
        (v): v is FoundLocation =>
            typeof v === "object" &&
            v !== null &&
            typeof v.id === "number" &&
            typeof v.name === "string"
    );
};

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