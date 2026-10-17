// app/inventory/audits/[id]/_lib/hooks/useAuditExport.ts
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { StockAudit, StockAuditItem } from "../types";
import {
    aggregateByPosCategory,
    getListPrice,
    getPosCategoryNames,
    getSoldLocations,
    hasSoldElsewhere,
} from "../helpers";

const formatUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(amount);

export type ExportMode = "filtered" | "all";

/* ══════════════════════════════════════════════════════════════════ */
/* HOOK PRINCIPAL                                                    */
/* ══════════════════════════════════════════════════════════════════ */

export function useAuditExport(
    audit: StockAudit,
    allItems: StockAuditItem[],
    filteredItems: StockAuditItem[],
) {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

    /* ══════════════════════════════════════════════════════════════ */
    /* 1. EXPORT EXCEL MULTI-ONGLETS (.XLSX)                        */
    /* ══════════════════════════════════════════════════════════════ */
    const handleExportExcel = useCallback(
        async (mode: ExportMode) => {
            if (isGeneratingExcel) return;

            const items =
                mode === "filtered" ? filteredItems : allItems;
            const isFilteredView = mode === "filtered";
            const labelSuffix = isFilteredView ? " — Vue filtrée" : " — Audit complet";

            if (items.length === 0) {
                toast.error("Aucun article à exporter");
                return;
            }

            setIsGeneratingExcel(true);
            try {
                toast.info(
                    `Génération du fichier Excel${labelSuffix} (${items.length} articles)...`,
                );
                const XLSX = await import("xlsx");
                const workbook = XLSX.utils.book_new();

                /* ─── KPIs ─── */
                const totalItemsCount = items.length;
                const scannedItemsCount = items.filter(
                    (i) => (i.counted_qty ?? 0) === 1,
                ).length;
                const remainingItemsCount =
                    totalItemsCount - scannedItemsCount;
                const soldElsewhereCount =
                    items.filter(hasSoldElsewhere).length;
                const progressPercent =
                    totalItemsCount > 0
                        ? Math.round(
                            (scannedItemsCount / totalItemsCount) * 100,
                        )
                        : 0;

                let totalDiffQty = 0;
                let totalDiffValue = 0;
                let totalSellImpact = 0;

                items.forEach((item) => {
                    const diff = (item.counted_qty ?? 0) - (item.theoretical_qty ?? 0);
                    totalDiffQty += diff;
                    totalDiffValue += diff * (Number(item.unit_cost) || 0);
                    totalSellImpact += diff * getListPrice(item);
                });

                const posAggregates = aggregateByPosCategory(items);
                const distinctPosCategories = posAggregates.filter(
                    (a) => a.id !== null,
                ).length;

                /* ══════ ONGLET 1 : Résumé Global ══════ */
                const summaryData: (string | number)[][] = [
                    ["RÉSUMÉ ET INFOS GLOBALES DE L'AUDIT D'INVENTAIRE"],
                    [""],
                    ["Référence de l'Audit", audit.reference],
                    ["Boutique / Magasin", audit.shop_name],
                    [
                        "Périmètre / Département",
                        audit.department || "Tous",
                    ],
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
                    ["Vue", isFilteredView ? "Filtrée" : "Complète"],   // ⬅️
                    [""],
                    ["RÉCAPITULATIF QUANTITATIF ET FINANCIER"],
                    ["Total Articles Référencés", totalItemsCount],
                    ["Total Articles Scannés", scannedItemsCount],
                    ["Articles Non Scannés (Manquants)", remainingItemsCount],
                    ["Articles Vendus Ailleurs (-1)", soldElsewhereCount],
                    ["Taux de Progression", `${progressPercent}%`],
                    ["Écart Quantité Total", totalDiffQty],
                    ["Démarque Globale ($ USD)", formatUSD(totalDiffValue)],
                    ["CA Perdu (Prix Vente) ($ USD)", formatUSD(totalSellImpact)],
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
                XLSX.utils.book_append_sheet(
                    workbook,
                    wsSummary,
                    "Résumé Global",
                );

                /* ══════ ONGLET 2 : Détail Produits ══════ */
                const productsData = items.map((i) => {
                    const counted = i.counted_qty ?? 0;
                    const theoretical = i.theoretical_qty ?? 0;
                    const cost = Number(i.unit_cost) || 0;
                    const listPrice = getListPrice(i);       // ⬅️ NOUVEAU
                    const diff = counted - theoretical;
                    const costImpact = diff * cost;
                    const sellImpact = diff * listPrice;     // ⬅️ NOUVEAU

                    const soldLocs = getSoldLocations(i);
                    const soldLocsStr =
                        soldLocs.length > 0
                            ? soldLocs.map((l) => `[${l.id}] ${l.name}`).join(", ")
                            : "Aucun";

                    const categNames = getPosCategoryNames(i);
                    const categStr = categNames.length > 0 ? categNames.join(", ") : "—";

                    return {
                        "Code-barres Unitaire": i.internal_barcode,
                        "Produit Odoo": i.product_name || "",
                        Marque: i.brand || "N/A",
                        Couleur: i.color || "N/A",
                        "Catégories POS": categStr,
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
                        "Impact Achat ($)": costImpact,           // ⬅️ renommé
                        "Prix Vente ($)": listPrice,              // ⬅️ NOUVEAU
                        "Impact Vente ($)": sellImpact,           // ⬅️ NOUVEAU
                    };
                });

                const wsProducts =
                    XLSX.utils.json_to_sheet(productsData);
                wsProducts["!cols"] = [
                    { wch: 22 },   // Code-barres
                    { wch: 40 },   // Produit
                    { wch: 20 },   // Marque
                    { wch: 18 },   // Couleur
                    { wch: 30 },   // Catégories POS
                    { wch: 16 },   // HS Code
                    { wch: 18 },   // Date Création
                    { wch: 25 },   // Emplacement Origine
                    { wch: 30 },   // Vendu Dans
                    { wch: 18 },   // Stock Théorique
                    { wch: 16 },   // Compté
                    { wch: 14 },   // Écart Qté
                    { wch: 16 },   // Coût
                    { wch: 18 },   // Impact Achat
                    { wch: 16 },   // Prix Vente
                    { wch: 18 },   // Impact Vente
                ];
                const detailSheetName = isFilteredView
                    ? "Détail Vue Filtrée"
                    : "Détail Tous Produits";
                XLSX.utils.book_append_sheet(
                    workbook,
                    wsProducts,
                    detailSheetName,
                );

                /* ══════ ONGLET 3 : Synthèse POS ══════ */
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

                const totalRow = {
                    "Catégorie POS": "TOTAL",
                    "ID Odoo": "—",
                    "Total Articles": posRows.reduce(
                        (s, r) => s + r["Total Articles"],
                        0,
                    ),
                    "Articles Scannés": posRows.reduce(
                        (s, r) => s + r["Articles Scannés"],
                        0,
                    ),
                    "Articles Restants": posRows.reduce(
                        (s, r) => s + r["Articles Restants"],
                        0,
                    ),
                    "Vendus Ailleurs (-1)": posRows.reduce(
                        (s, r) => s + r["Vendus Ailleurs (-1)"],
                        0,
                    ),
                    "Écart Quantité": posRows.reduce(
                        (s, r) => s + r["Écart Quantité"],
                        0,
                    ),
                    "Écart Valorisé ($)": posRows.reduce(
                        (s, r) => s + r["Écart Valorisé ($)"],
                        0,
                    ),
                };
                posRows.push(totalRow);

                const wsPos = XLSX.utils.json_to_sheet(posRows);
                wsPos["!cols"] = [
                    { wch: 32 },
                    { wch: 12 },
                    { wch: 14 },
                    { wch: 16 },
                    { wch: 16 },
                    { wch: 20 },
                    { wch: 14 },
                    { wch: 18 },
                ];
                XLSX.utils.book_append_sheet(
                    workbook,
                    wsPos,
                    "Synthèse POS",
                );

                /* ─── Filename ─── */
                const ts = new Date().toISOString().slice(0, 10);
                const suffix = isFilteredView ? "_FILTRE" : "";
                const fileName = `AUDIT_${audit.reference}${suffix}_${ts}.xlsx`;
                XLSX.writeFile(workbook, fileName);

                toast.success(
                    `Excel téléchargé (${items.length} articles)`,
                );
            } catch (err) {
                console.error("[EXCEL_EXPORT_ERROR]", err);
                toast.error("Erreur lors de la génération Excel.");
            } finally {
                setIsGeneratingExcel(false);
            }
        },
        [audit, allItems, filteredItems, isGeneratingExcel],
    );

    /* ══════════════════════════════════════════════════════════════ */
    /* 2. EXPORT PDF                                                 */
    /* ══════════════════════════════════════════════════════════════ */
    const handleExportPDF = useCallback(
        async (mode: ExportMode) => {
            if (isGeneratingPDF) return;

            const items = mode === "filtered" ? filteredItems : allItems;
            const isFilteredView = mode === "filtered";

            if (items.length === 0) {
                toast.error("Aucun article à exporter");
                return;
            }

            try {
                setIsGeneratingPDF(true);
                toast.info(
                    `Génération du PDF${isFilteredView ? " (vue filtrée)" : ""} (${items.length} articles)...`,
                );

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
                    <AuditReportPDF audit={audit} items={items} />,
                ).toBlob();
                const url = URL.createObjectURL(blob);

                const ts = new Date().toISOString().slice(0, 10);
                const suffix = isFilteredView ? "_FILTRE" : "";
                const link = document.createElement("a");
                link.href = url;
                link.download = `RAPPORT_AUDIT_${audit.reference}${suffix}_${ts}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast.success("PDF généré avec succès");
            } catch (err) {
                console.error("[PDF_GEN_ERROR]", err);
                toast.error("Erreur lors de la création du PDF.");
            } finally {
                setIsGeneratingPDF(false);
            }
        },
        [audit, allItems, filteredItems, isGeneratingPDF],
    );

    return {
        handleExportExcel,
        handleExportPDF,
        isGeneratingPDF,
        isGeneratingExcel,
    };
}