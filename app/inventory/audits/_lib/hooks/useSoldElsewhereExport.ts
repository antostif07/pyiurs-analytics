"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import type {
    SoldElsewhereAnalysis,
    SoldElsewhereGroup,
} from "../types";

/**
 * Génère un fichier Excel prêt à importer dans Odoo.
 *
 * Structure :
 *  - Feuille "Résumé" : vue d'ensemble + règle inter-company
 *  - 1 feuille par groupe (internal_transfer ou inter_company)
 *    → colonnes compatibles import `stock.picking` Odoo
 *
 * RÈGLE INTER-COMPANY :
 *  Odoo génère automatiquement la commande d'achat côté company destination
 *  à partir du Delivery Order. Une seule feuille "Vente" est donc nécessaire.
 */
export function useSoldElsewhereExport(analysis: SoldElsewhereAnalysis | null) {
    const handleExportExcel = useCallback(async () => {
        if (!analysis) {
            toast.error("Aucune analyse à exporter.");
            return;
        }
        if (analysis.totalLines === 0) {
            toast.error("Aucune ligne à exporter.");
            return;
        }

        try {
            toast.info("Génération du fichier d'import Odoo...");
            const XLSX = await import("xlsx");
            const wb = XLSX.utils.book_new();

            /* ═══════════════════════════════════════════════════ */
            /* FEUILLE 1 : Résumé                                  */
            /* ═══════════════════════════════════════════════════ */
            const summaryRows: (string | number)[][] = [
                ["ANALYSE 'VENDUS AILLEURS' — IMPORT ODOO"],
                [""],
                ["Référence Audit", analysis.auditReference],
                ["Company Auditée", analysis.auditedCompanyName],
                [
                    "Location de Destination (interne)",
                    analysis.destinationLocationName,
                ],
                [""],
                ["Total Lignes", analysis.totalLines],
                ["Total Quantité", analysis.totalQty],
                [
                    "Total Valeur ($)",
                    new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 2,
                    }).format(analysis.totalValue),
                ],
                ["Items Non Résolus", analysis.unprocessedItems],
                [""],
                ["ℹ️ RÈGLE INTER-COMPANY"],
                [
                    "Odoo génère automatiquement la commande d'achat côté company destination.",
                    "",
                ],
                [
                    "Aucune feuille d'entrée à importer manuellement pour les ventes inter-company.",
                    "",
                ],
                [""],
                ["GROUPES À TRAITER"],
                ["Action", "Company Source", "Nb Lignes", "Qté", "Valeur ($)"],
            ];

            analysis.groups.forEach((g) => {
                summaryRows.push([
                    g.action === "internal_transfer"
                        ? "Même company"
                        : "Autre company",
                    g.sourceCompanyName,
                    g.lines.length,
                    g.totalQty,
                    Number(g.totalValue.toFixed(2)),
                ]);
            });

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
            wsSummary["!cols"] = [
                { wch: 28 },
                { wch: 30 },
                { wch: 12 },
                { wch: 10 },
                { wch: 14 },
            ];
            XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé");

            /* ═══════════════════════════════════════════════════ */
            /* FEUILLES PAR GROUPE — format import Odoo           */
            /* ═══════════════════════════════════════════════════ */
            analysis.groups.forEach((group, idx) => {
                const sheetName = buildSheetName(group, idx);
                const rows = buildOdooRows(group);

                const ws = XLSX.utils.json_to_sheet(rows, {
                    header: [
                        "Picking Type",
                        "Source Document",
                        "Source Location",
                        "Destination Location",
                        "Product",
                        "Quantity",
                        "Unit of Measure",
                        "Reference",
                    ],
                });
                ws["!cols"] = [
                    { wch: 24 },
                    { wch: 20 },
                    { wch: 32 },
                    { wch: 32 },
                    { wch: 22 },
                    { wch: 10 },
                    { wch: 10 },
                    { wch: 28 },
                ];
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            const fileName = `TRANSFERTS_${analysis.auditReference}_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
            toast.success("Fichier Excel généré !");
        } catch (err) {
            console.error("[SOLD_ELSEWHERE_EXPORT_ERROR]", err);
            toast.error("Erreur lors de la génération Excel.");
        }
    }, [analysis]);

    return { handleExportExcel };
}

/* ══════════════════════════════════════════════════════════════════ */
/* HELPERS                                                          */
/* ══════════════════════════════════════════════════════════════════ */

function buildSheetName(group: SoldElsewhereGroup, idx: number): string {
    /* Odoo limite à 31 caractères — on tronque intelligemment */
    const prefix =
        group.action === "internal_transfer" ? "Même company" : "Autre company";
    const company = group.sourceCompanyName
        .replace(/[\\/*?:[\]]/g, "")
        .slice(0, 18);
    const name = `${prefix} - ${company}`;
    return name.length > 31 ? name.slice(0, 31) : name;
}

interface OdooPickingRow {
    "Picking Type": string;
    "Source Document": string;
    "Source Location": string;
    "Destination Location": string;
    Product: string;
    Quantity: number;
    "Unit of Measure": string;
    Reference: string;
}

function buildOdooRows(group: SoldElsewhereGroup): OdooPickingRow[] {
    const isInternal = group.action === "internal_transfer";

    /* Interne      : Internal Transfers (move stock → stock)
       Inter-company: Delivery Orders (sortie) → Odoo crée le PO auto */
    const pickingType = isInternal ? "Internal Transfers" : "Delivery Orders";

    return group.lines.map((line) => ({
        "Picking Type": pickingType,
        "Source Document": group.sourceCompanyName,
        "Source Location": line.sourceLocationName,
        "Destination Location": isInternal
            ? line.destinationLocationName
            : "Customers", // inter-company : sortie vers client par défaut
        Product: line.barcode || line.productName,
        Quantity: line.quantity,
        "Unit of Measure": "Units",
        Reference: `AUDIT-${line.itemId.slice(0, 8)}`,
    }));
}