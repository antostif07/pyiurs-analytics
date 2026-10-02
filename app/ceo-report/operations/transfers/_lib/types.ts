// app/ceo-report/operations/transfers/_lib/types.ts

export interface TransferControlRow {
    refTransfert: string;
    date: string;
    origin: string;
    destination: string;
    orderedCount: number;
    itemCount: number;
    value: number;
    docCompliance: "conforme" | "manque_signature";
    barcodeCompliance: "scanne" | "manquant";
}

export interface TransfersKpis {
    validatedCount: number;
    itemsOrdered: number;
    itemsShipped: number;
    transferValue: number;
    signatureCompliancePct: number;
    signatureConformCount: number;
    signatureTotalCount: number;
    barcodeMissingCount: number;
    barcodeMissingRef: string | null;
}

export interface TransfersChartPoint {
    name: string;
    "Valeur ($)": number;
    "Prévu (pcs)": number;
    "Expédié (pcs)": number;
}

/** Réponse complète de l'API — 1 shape unique */
export interface TransfersReportData {
    kpis: TransfersKpis;
    transfers: TransferControlRow[];
    destinationChartData: TransfersChartPoint[];
}