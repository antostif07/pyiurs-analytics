// app/inventory/audits/_lib/hooks/use-audit-list-export.tsx
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { StockAudit } from "../types";

interface FilterSummary {
    statusLabel: string;
    searchQuery: string;
}

interface UseAuditListExportArgs {
    audits: StockAudit[];
    filters: FilterSummary;
    totals: {
        total: number;
        active: number;
        pending: number;
        scanned: number;
        discrepancy: number;
    };
}

export function useAuditListExport({
    audits,
    filters,
    totals,
}: UseAuditListExportArgs) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleExportPdf = useCallback(async () => {
        if (audits.length === 0) {
            toast.error("Aucun audit à exporter");
            return;
        }

        setIsGenerating(true);
        try {
            const [{ pdf }, { AuditListPdf }] = await Promise.all([
                import("@react-pdf/renderer"),
                import("../../_components/audit-list-pdf"),
            ]);

            const generatedAt = new Date().toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });

            // ✅ JSX → typé automatiquement en ReactElement<DocumentProps>
            const blob = await pdf(
                <AuditListPdf
                    audits={audits}
                    filters={filters}
                    totals={totals}
                    generatedAt={generatedAt}
                />,
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const ts = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.download = `audits_${ts}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`PDF généré (${audits.length} audits)`);
        } catch (err) {
            console.error("[AUDIT_LIST_PDF_ERROR]", err);
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Erreur de génération PDF",
            );
        } finally {
            setIsGenerating(false);
        }
    }, [audits, filters, totals]);

    return { handleExportPdf, isGenerating };
}