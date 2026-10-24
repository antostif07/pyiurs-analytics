// app/inventory/stock-femme/_lib/hooks/use-export-stock-femme.ts
"use client";

import { useState } from "react";
import { toast } from "sonner";

export type StockFemmeExportFormat = "XLSX" | "CSV" | "PDF";

export function useExportStockFemme() {
    const [isExporting, setIsExporting] = useState(false);

    const exportStockFemme = async (format: StockFemmeExportFormat) => {
        setIsExporting(true);
        try {
            // TODO: brancher l'export réel (ExcelJS / jsPDF / etc.)
            toast(`Export ${format} du stock Femme en cours…`);
            await Promise.resolve();
        } finally {
            setIsExporting(false);
        }
    };

    return { exportStockFemme, isExporting };
}