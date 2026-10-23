// app/ceo-report/hr/_lib/hooks/use-export-hr.ts
"use client";

import { useState } from "react";
import { toast } from "sonner";

export type HrExportFormat = "XLSX" | "CSV" | "PDF";

export function useExportHr() {
    const [isExporting, setIsExporting] = useState(false);

    const exportHr = async (format: HrExportFormat) => {
        setIsExporting(true);
        try {
            // ⚠️ Stub : à remplacer par l'appel réel d'export.
            toast(`Export ${format} RH & Baux en cours…`);
            await Promise.resolve();
        } finally {
            setIsExporting(false);
        }
    };

    return { exportHr, isExporting };
}