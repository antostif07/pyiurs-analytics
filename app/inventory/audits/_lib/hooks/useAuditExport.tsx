"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { StockAudit, StockAuditItem, hasSoldElsewhere, getSoldLocations } from "../types";

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

export function useAuditExport(audit: StockAudit, items: StockAuditItem[]) {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // 1. EXPORT EXCEL MULTI-ONGLETS (.XLSX)
    const handleExportExcel = useCallback(async () => {
        try {
            toast.info("Génération du fichier Excel complet...");
            const XLSX = await import("xlsx");
            const workbook = XLSX.utils.book_new();

            const totalItemsCount = items.length;
            const scannedItemsCount = items.filter((i) => (i.counted_qty ?? 0) === 1).length;
            const remainingItemsCount = totalItemsCount - scannedItemsCount;
            const soldElsewhereCount = items.filter(hasSoldElsewhere).length;
            const progressPercent = totalItemsCount > 0 ? Math.round((scannedItemsCount / totalItemsCount) * 100) : 0;

            let totalDiffQty = 0;
            let totalDiffValue = 0;
            items.forEach((item) => {
                const diff = (item.counted_qty ?? 0) - (item.theoretical_qty ?? 0);
                totalDiffQty += diff;
                totalDiffValue += diff * (Number(item.unit_cost) || 0);
            });

            // Onglet 1 : Résumé Global
            const summaryData = [
                ["RÉSUMÉ ET INFOS GLOBALES DE L'AUDIT D'INVENTAIRE"],
                [""],
                ["Référence de l'Audit", audit.reference],
                ["Boutique / Magasin", audit.shop_name],
                ["Périmètre / Département", audit.department || "Tous"],
                [
                    "Date d'Audit",
                    audit.audit_date ? audit.audit_date : audit.created_at ? audit.created_at.slice(0, 10) : "—",
                ],
                [
                    "Statut de l'Audit",
                    audit.status === "validated"
                        ? "Validé & Clôturé"
                        : audit.status === "completed"
                            ? "Comptage Terminé"
                            : "Scan en Cours",
                ],
                [""],
                ["RÉCAPITULATIF QUANTITATIF ET FINANCIER"],
                ["Total Articles Référencés", totalItemsCount],
                ["Total Articles Scannés", scannedItemsCount],
                ["Articles Non Scannés (Manquants)", remainingItemsCount],
                ["Articles Vendus Ailleurs (-1)", soldElsewhereCount],
                ["Taux de Progression", `${progressPercent}%`],
                ["Écart Quantité Total", totalDiffQty],
                ["Démarque Globale ($ USD)", formatUSD(totalDiffValue)],
            ];

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary["!cols"] = [{ wch: 35 }, { wch: 40 }];
            XLSX.utils.book_append_sheet(workbook, wsSummary, "Résumé Global");

            // Onglet 2 : Liste Complète des Produits
            const productsData = items.map((i) => {
                const counted = i.counted_qty ?? 0;
                const theoretical = i.theoretical_qty ?? 0;
                const cost = Number(i.unit_cost) || 0;
                const diff = counted - theoretical;
                const impact = diff * cost;

                const soldLocs = getSoldLocations(i);
                const soldLocsStr =
                    soldLocs.length > 0
                        ? soldLocs.map((l) => `[${l.id}] ${l.name}`).join(", ")
                        : "Aucun";

                return {
                    "Code-barres Unitaire": i.internal_barcode,
                    "Produit Odoo": i.product_name || "",
                    Marque: i.brand || "N/A",
                    Couleur: i.color || "N/A",
                    "HS Code": i.hs_code || "N/A",
                    "Date Création Odoo": i.odoo_create_date ? i.odoo_create_date.slice(0, 10) : "—",
                    "Emplacement Origine Odoo": i.supplier_ref || "Stock Principal",
                    "Vendu Dans Emplacement (-1)": soldLocsStr,
                    "Stock Théorique Odoo": theoretical,
                    "Compté Physique": counted,
                    "Écart Quantité": diff,
                    "Coût Unitaire ($)": cost,
                    "Impact / Démarque ($)": impact,
                };
            });

            const wsProducts = XLSX.utils.json_to_sheet(productsData);
            wsProducts["!cols"] = [
                { wch: 22 },
                { wch: 40 },
                { wch: 20 },
                { wch: 18 },
                { wch: 16 },
                { wch: 18 },
                { wch: 25 },
                { wch: 30 },
                { wch: 18 },
                { wch: 16 },
                { wch: 14 },
                { wch: 16 },
                { wch: 20 },
            ];
            XLSX.utils.book_append_sheet(workbook, wsProducts, "Détail Tous Produits");

            const fileName = `AUDIT_${audit.reference}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast.success("Fichier Excel complet téléchargé !");
        } catch (err) {
            console.error("[EXCEL_EXPORT_ERROR]", err);
            toast.error("Erreur lors de la génération Excel.");
        }
    }, [audit, items]);

    // 2. EXPORT PDF DYNAMIQUE AVEC TYPAGE STRICT SANS CRASH
    const handleExportPDF = useCallback(async () => {
        if (isGeneratingPDF) return;
        try {
            setIsGeneratingPDF(true);
            toast.info("Génération du rapport d'audit PDF en cours...");

            // Typage explicite de l'import dynamique pour éviter l'erreur TypeScript
            const [{ pdf }, pdfModule] = await Promise.all([
                import("@react-pdf/renderer"),
                import("../../_components/AuditReportPDF") as Promise<{
                    AuditReportPDF: React.ComponentType<{ audit: StockAudit; items: StockAuditItem[] }>;
                }>,
            ]);

            const AuditReportPDF = pdfModule.AuditReportPDF;

            // Création du blob PDF
            const blob = await pdf(<AuditReportPDF audit={ audit } items = { items } />).toBlob();
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `RAPPORT_AUDIT_${audit.reference}_${new Date().toISOString().slice(0, 10)}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("Rapport PDF généré avec succès !");
        } catch (err) {
            console.error("[PDF_GEN_ERROR]", err);
            toast.error("Erreur lors de la création du PDF.");
        } finally {
            setIsGeneratingPDF(false);
        }
    }, [audit, items, isGeneratingPDF]);

    return { handleExportExcel, handleExportPDF, isGeneratingPDF };
}