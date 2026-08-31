"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { importExcelBarcodesAction } from "../../_lib/audits-actions";

const BATCH_SIZE = 75;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface ImportProgress {
    current: number;
    total: number;
    isImporting: boolean;
}

interface ImportAggregated {
    newlyScanned: number;
    alreadyScanned: number;
    unexpected: number;
    unknown: number;
    errors: string[];
}

async function extractBarcodesFromExcel(file: File): Promise<string[]> {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows: unknown[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const barcodes: string[] = [];

    for (const row of rows) {
        if (!Array.isArray(row) || row.length === 0) continue;

        for (const cell of row) {
            if (cell === undefined || cell === null) continue;
            const strVal = String(cell).trim();
            const lower = strVal.toLowerCase();

            if (
                strVal.length > 0 &&
                !lower.includes("code") &&
                !lower.includes("barcode") &&
                !lower.includes("ean") &&
                !lower.includes("produit")
            ) {
                barcodes.push(strVal);
                break;
            }
        }
    }

    return barcodes;
}

export function useAuditImport(auditId: string, onComplete: () => void) {
    const [importProgress, setImportProgress] = useState<ImportProgress>({
        current: 0,
        total: 0,
        isImporting: false,
    });

    const processExcel = useCallback(
        async (file: File) => {
            if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
                toast.error("Format invalide. Utilisez .xlsx, .xls ou .csv");
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                toast.error("Fichier trop volumineux (max 5 Mo)");
                return;
            }

            let barcodes: string[];
            try {
                barcodes = await extractBarcodesFromExcel(file);
            } catch {
                toast.error("Erreur lors de la lecture du fichier Excel.");
                return;
            }

            if (barcodes.length === 0) {
                toast.error("Aucun code-barres valide trouvé dans le fichier.");
                return;
            }

            setImportProgress({ current: 0, total: barcodes.length, isImporting: true });

            const aggregated: ImportAggregated = {
                newlyScanned: 0,
                alreadyScanned: 0,
                unexpected: 0,
                unknown: 0,
                errors: [],
            };

            // SÉQUENTIEL : jamais Promise.all pour Odoo
            for (let i = 0; i < barcodes.length; i += BATCH_SIZE) {
                const batch = barcodes.slice(i, i + BATCH_SIZE);
                try {
                    const res = await importExcelBarcodesAction(auditId, batch);
                    aggregated.newlyScanned += res.newlyScannedCount ?? 0;
                    aggregated.alreadyScanned += res.alreadyScannedCount ?? 0;
                    aggregated.unexpected += res.unexpectedCount ?? 0;
                    aggregated.unknown += res.unknownCount ?? 0;

                    setImportProgress((p) => ({
                        ...p,
                        current: Math.min(i + batch.length, barcodes.length),
                    }));
                } catch (err) {
                    aggregated.errors.push(
                        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err instanceof Error ? err.message : "Erreur"}`
                    );
                }
            }

            setImportProgress((p) => ({ ...p, isImporting: false }));
            onComplete();

            let msg = `Import terminé : +${aggregated.newlyScanned} nouveaux articles scannés.`;
            if (aggregated.alreadyScanned > 0) msg += ` (${aggregated.alreadyScanned} déjà vérifiés).`;
            if (aggregated.unexpected > 0) msg += ` +${aggregated.unexpected} hors périmètre.`;
            toast.success(msg, { duration: 7000 });

            if (aggregated.unknown > 0) {
                toast.warning(`${aggregated.unknown} codes-barres inconnus ignorés.`, { duration: 7000 });
            }
            if (aggregated.errors.length > 0) {
                toast.error(`${aggregated.errors.length} batch(s) en échec.`, { duration: 8000 });
            }
        },
        [auditId, onComplete]
    );

    return { processExcel, importProgress };
}