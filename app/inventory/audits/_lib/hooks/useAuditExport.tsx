"use client";

import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import {
    StockAudit,
    StockAuditItem,
} from "../types";
import { aggregateByPosCategory, getPosCategoryNames, getSoldLocations, hasSoldElsewhere } from "../helpers";

const formatUSD = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);
};

/* ══════════════════════════════════════════════════════════════════ */
/* HOOK PRINCIPAL                                                    */
/* ══════════════════════════════════════════════════════════════════ */

export function useAuditExport(audit: StockAudit, items: StockAuditItem[]) {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    /* ══════════════════════════════════════════════════════════════ */
    /* 1. EXPORT EXCEL MULTI-ONGLETS (.XLSX)                        */
    /* ══════════════════════════════════════════════════════════════ */
    const handleExportExcel = useCallback(async () => {
        try {
            toast.info("Génération du fichier Excel complet...");
            const XLSX = await import("xlsx");
            const workbook = XLSX.utils.book_new();

            /* ─── KPIs globaux ─── */
            const totalItemsCount = items.length;
            const scannedItemsCount = items.filter((i) => (i.counted_qty ?? 0) === 1).length;
            const remainingItemsCount = totalItemsCount - scannedItemsCount;
            const soldElsewhereCount = items.filter(hasSoldElsewhere).length;
            const progressPercent =
                totalItemsCount > 0
                    ? Math.round((scannedItemsCount / totalItemsCount) * 100)
                    : 0;

            let totalDiffQty = 0;
            let totalDiffValue = 0;
            items.forEach((item) => {
                const diff = (item.counted_qty ?? 0) - (item.theoretical_qty ?? 0);
                totalDiffQty += diff;
                totalDiffValue += diff * (Number(item.unit_cost) || 0);
            });

            /* ─── Agrégation POS ─── */
            const posAggregates = aggregateByPosCategory(items);
            const distinctPosCategories = posAggregates.filter((a) => a.id !== null).length;

            /* ══════════════════════════════════════════════════════ */
            /* ONGLET 1 : Résumé Global                              */
            /* ══════════════════════════════════════════════════════ */
            const summaryData: (string | number)[][] = [
                ["RÉSUMÉ ET INFOS GLOBALES DE L'AUDIT D'INVENTAIRE"],
                [""],
                ["Référence de l'Audit", audit.reference],
                ["Boutique / Magasin", audit.shop_name],
                ["Périmètre / Département", audit.department || "Tous"],
                [
                    "Date d'Audit",
                    audit.audit_date
                        ? audit.audit_date
                        : audit.created_at
                            ? audit.created_at.slice(0, 10)
                            : "—",
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
                [""],
                ["RÉPARTITION PAR CATÉGORIE POS"],
                ["Nb Catégories POS Distinctes", distinctPosCategories],
                [
                    "Note",
                    "Les items multi-catégories sont comptés dans chaque catégorie (voir feuille « Synthèse POS »).",
                ],
            ];

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            wsSummary["!cols"] = [{ wch: 35 }, { wch: 60 }];
            XLSX.utils.book_append_sheet(workbook, wsSummary, "Résumé Global");

            /* ══════════════════════════════════════════════════════ */
            /* ONGLET 2 : Détail Tous Produits                       */
            /* ══════════════════════════════════════════════════════ */
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

                /* AJOUT : catégories POS concaténées */
                const categNames = getPosCategoryNames(i);
                const categStr = categNames.length > 0 ? categNames.join(", ") : "—";

                return {
                    "Code-barres Unitaire": i.internal_barcode,
                    "Produit Odoo": i.product_name || "",
                    Marque: i.brand || "N/A",
                    Couleur: i.color || "N/A",
                    "Catégories POS": categStr,                 /* ← AJOUT */
                    "HS Code": i.hs_code || "N/A",
                    "Date Création Odoo": i.odoo_create_date
                        ? i.odoo_create_date.slice(0, 10)
                        : "—",
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
            /* Largeurs mises à jour : ajout d'une colonne en position 4 */
            wsProducts["!cols"] = [
                { wch: 22 },   // Code-barres
                { wch: 40 },   // Produit
                { wch: 20 },   // Marque
                { wch: 18 },   // Couleur
                { wch: 30 },   // Catégories POS  ← NOUVEAU
                { wch: 16 },   // HS Code
                { wch: 18 },   // Date Création
                { wch: 25 },   // Emplacement Origine
                { wch: 30 },   // Vendu Dans
                { wch: 18 },   // Stock Théorique
                { wch: 16 },   // Compté
                { wch: 14 },   // Écart Qté
                { wch: 16 },   // Coût
                { wch: 20 },   // Impact
            ];
            XLSX.utils.book_append_sheet(workbook, wsProducts, "Détail Tous Produits");

            /* ══════════════════════════════════════════════════════ */
            /* ONGLET 3 : Synthèse POS (nouveau)                     */
            /* ══════════════════════════════════════════════════════ */
            const posRows = posAggregates.map((agg) => ({
                "Catégorie POS": agg.name,
                "ID Odoo": agg.id ?? "—",
                "Total Articles": agg.totalItems,
                "Articles Scannés": agg.scannedItems,
                "Articles Restants": agg.remainingItems,
                "Vendus Ailleurs (-1)": agg.soldElsewhere,
                "Écart Quantité": agg.totalDiffQty,
                "Écart Valorisé ($)": agg.totalDiffValue,
            }));

            /* Ligne TOTAL */
            const totalRow = {
                "Catégorie POS": "TOTAL",
                "ID Odoo": "—",
                "Total Articles": posRows.reduce((s, r) => s + r["Total Articles"], 0),
                "Articles Scannés": posRows.reduce((s, r) => s + r["Articles Scannés"], 0),
                "Articles Restants": posRows.reduce((s, r) => s + r["Articles Restants"], 0),
                "Vendus Ailleurs (-1)": posRows.reduce(
                    (s, r) => s + r["Vendus Ailleurs (-1)"],
                    0
                ),
                "Écart Quantité": posRows.reduce((s, r) => s + r["Écart Quantité"], 0),
                "Écart Valorisé ($)": posRows.reduce(
                    (s, r) => s + r["Écart Valorisé ($)"],
                    0
                ),
            };
            posRows.push(totalRow);

            const wsPos = XLSX.utils.json_to_sheet(posRows);
            wsPos["!cols"] = [
                { wch: 32 },   // Catégorie
                { wch: 12 },   // ID
                { wch: 14 },   // Total
                { wch: 16 },   // Scannés
                { wch: 16 },   // Restants
                { wch: 20 },   // Vendus ailleurs
                { wch: 14 },   // Écart qté
                { wch: 18 },   // Écart valorisé
            ];
            XLSX.utils.book_append_sheet(workbook, wsPos, "Synthèse POS");

            /* ─── Téléchargement ─── */
            const fileName = `AUDIT_${audit.reference}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast.success("Fichier Excel complet téléchargé !");
        } catch (err) {
            console.error("[EXCEL_EXPORT_ERROR]", err);
            toast.error("Erreur lors de la génération Excel.");
        }
    }, [audit, items]);

    /* ══════════════════════════════════════════════════════════════ */
    /* 2. EXPORT PDF DYNAMIQUE                                       */
    /* ══════════════════════════════════════════════════════════════ */
    const handleExportPDF = useCallback(async () => {
        if (isGeneratingPDF) return;
        try {
            setIsGeneratingPDF(true);
            toast.info("Génération du rapport d'audit PDF en cours...");

            const [{ pdf }, pdfModule] = await Promise.all([
                import("@react-pdf/renderer"),
                import("../../_components/AuditReportPDF") as Promise<{
                    AuditReportPDF: React.ComponentType<{
                        audit: StockAudit;
                        items: StockAuditItem[];
                    }>;
                }>,
            ]);

            const AuditReportPDF = pdfModule.AuditReportPDF;

            const blob = await pdf(
                <AuditReportPDF audit={audit} items={items} />
            ).toBlob();
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = `RAPPORT_AUDIT_${audit.reference}_${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`;
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