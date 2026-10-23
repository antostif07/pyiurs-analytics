// app/ceo-report/finance/_lib/hooks/use-export-finance.ts
"use client";

import { useState } from "react";
import { toast } from "sonner";

export type FinanceExportFormat = "XLSX" | "CSV" | "PDF";

export function useExportFinance() {
    const [isExporting, setIsExporting] = useState(false);

    const exportFinance = async (format: FinanceExportFormat) => {
        setIsExporting(true);
        try {
            // ⚠️ Stub : à remplacer par l'appel réel d'export.
            toast(`Export ${format} de l'audit comptable en cours…`);
            await Promise.resolve();
        } finally {
            setIsExporting(false);
        }
    };

    return { exportFinance, isExporting };
}