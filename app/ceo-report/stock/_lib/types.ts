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
    totalValuation: number;       // Ex: 106 990 $
    totalUnits: number;           // Ex: 4 800 pcs
    subtitle: string;             // Ex: "4 800 pièces réparties sur 5 sites"
    // Segment Femme
    womenArticlesCount: number;   // Ex: 1 600 pcs
    womenValuation: number;       // Ex: 65 050 $
    // Segment Beauty
    beautyArticlesCount: number;  // Ex: 850 pcs
    beautyValuation: number;      // Ex: 17 950 $
    // Segment Enfant
    kidsArticlesCount: number;    // Ex: 600 pcs
    kidsValuation: number;        // Ex: 23 990 $
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