// app/inventory/purchases/_lib/hooks/use-export-purchases.ts
"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { IncomingReceipt } from "../types";

export type PurchasesExportFormat = "CSV" | "XLSX";

function escapeCsv(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (s.includes(";") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export function useExportPurchases() {
    const [isExporting, setIsExporting] = useState(false);

    const exportCsv = async (rows: IncomingReceipt[]) => {
        setIsExporting(true);
        try {
            const header = [
                "Réf Transfert",
                "Fournisseur",
                "PO Origine",
                "Transporteur",
                "Quantité Reçue",
                "Quantité Attendue",
                "Statut",
                "Date Prévue",
                "Date Réelle",
            ];

            const lines = [
                header.map(escapeCsv).join(";"),
                ...rows.map((r) =>
                    [
                        r.pickingRef,
                        r.supplier,
                        r.originPO,
                        r.carrier,
                        r.totalQtyReceived,
                        r.totalQtyExpected,
                        r.status,
                        r.scheduledDate ?? "",
                        r.actualDate ?? "",
                    ]
                        .map(escapeCsv)
                        .join(";"),
                ),
            ];

            // BOM UTF-8 pour Excel FR
            const csv = "\uFEFF" + lines.join("\n");
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `receptions_achats_${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Export CSV téléchargé");
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Erreur d'export",
            );
        } finally {
            setIsExporting(false);
        }
    };

    return { exportCsv, isExporting };
}