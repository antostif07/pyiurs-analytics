// app/ceo-report/stock/_lib/types.ts

import { StockMovementRow } from "../_components/stock-movement-matrix-table";

export interface StoreStockAuditRow {
    site: string;       // "P.BC", "P24", "P.MTO", "P.LMB", "P.KTM"
    storeKey: string;   // "PB_BC", "P24", etc.
    femme: number;      // $
    kids: number;       // $
    beauty: number;     // $
    total: number;      // $
    status: string;     // "< 30 Jours", "30-90 Jours", "> 90 Jours"
    level: "ok" | "warning" | "danger";
    sizes: {
        s: number;
        m: number;
        l: number;
        xl: number;
        xxl: number;
    };
}

export interface StockKpisData {
    totalValuation: number;
    totalUnits: number;
    subtitle: string;

    // ⬇️ NOUVEAU — delta de valorisation vs période précédente
    valuationDelta?: KpiDelta;

    // Segment Femme
    womenArticlesCount: number;
    womenValuation: number;
    // Segment Beauty
    beautyArticlesCount: number;
    beautyValuation: number;
    // Segment Enfant
    kidsArticlesCount: number;
    kidsValuation: number;
    sizesData?: SizeDistributionPoint[];
    fluxData?: StockFluxPoint[];
    movementsData?: StockMovementRow[];
    storeStockAuditSizesData: StoreStockAuditRow[];
}

export interface StockFluxPoint {
    name: string;
    "Achats Fournisseurs": number;
    "Ventes Sorties": number;
}

export interface SizeDistributionPoint {
    size: "S" | "M" | "L" | "XL" | "XXL+";
    pieces: number;
    part: string;
    color?: string;
    [key: string]: any;
}

export interface StockReportData {
    fluxData: StockFluxPoint[];
    sizesData: SizeDistributionPoint[];
}

/**
 * Delta d'une métrique vs période de référence (N-1 ou M-1).
 * Utilisé par CeoKpiCard pour afficher la flèche + le %.
 */
export interface KpiDelta {
    /** Valeur signée (ex: +2.4 ou -1.2) */
    value: number;
    /** Format d'affichage (défaut : "percent") */
    format?: "percent" | "number" | "currency";
    /** true = hausse bonne (défaut), false = hausse mauvaise (ex: démarque) */
    isPositiveUp?: boolean;
    /** Période de référence affichée (ex: "vs M-1") */
    label?: string;
}