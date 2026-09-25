"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
    StockAuditItem,
    StockAudit,
    ExtendedAuditFilters,
} from "../types";
import {
    aggregateByPosCategory,
    getFoundLocations,
    getPosCategoryIds,
    getPosCategoryNames,
    getSoldLocations,
    hasSoldElsewhere,
    isItemScanned,
} from "../helpers";

const formatUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    }).format(amount);

interface UseFilteredExportParams {
    audit: StockAudit;
    allItems: StockAuditItem[];
    filteredItems: StockAuditItem[];
    totalItems: number;
    filters: ExtendedAuditFilters;
    posCategoryNameMap?: Map<number, string>;
}

/**
 * Génère un Excel contenant UNIQUEMENT les lignes filtrées du tableau.
 * Ajoute une feuille "Résumé" documentant les filtres appliqués.
 */
export function useAuditFilteredExport({
    audit,
    allItems,
    filteredItems,
    totalItems,
    filters,
    posCategoryNameMap,
}: UseFilteredExportParams) {
    const handleExport = useCallback(async () => {
        if (filteredItems.length === 0) {
            toast.error("Aucune ligne à exporter (filtres trop restrictifs).");
            return;
        }

        try {
            toast.info("Génération du fichier Excel filtré...");
            const XLSX = await import("xlsx");
            const wb = XLSX.utils.book_new();

            /* ═══════════════════════════════════════════════════════ */
            /* FEUILLE 1 : Résumé du filtrage                          */
            /* ═══════════════════════════════════════════════════════ */
            const activeFilters: string[] = [];
            if (filters.searchQuery.trim()) {
                activeFilters.push(`Recherche: "${filters.searchQuery.trim()}"`);
            }
            if (filters.statusFilter !== "all") {
                const labels: Record<string, string> = {
                    scanned: "Scannés",
                    remaining: "Restants",
                    sold_elsewhere: "Vendus ailleurs",
                };
                activeFilters.push(`Statut: ${labels[filters.statusFilter] ?? filters.statusFilter}`);
            }
            if (filters.brandFilter !== "all") {
                activeFilters.push(`Marque: ${filters.brandFilter}`);
            }
            if (filters.colorFilter !== "all") {
                activeFilters.push(`Couleur: ${filters.colorFilter}`);
            }
            if (filters.theoreticalStockFilter !== "all") {
                const labels: Record<string, string> = {
                    one: "= 1",
                    zero: "= 0",
                    greater_than_one: "> 1",
                    negative: "< 0",
                };
                activeFilters.push(
                    `Stock théorique ${labels[filters.theoreticalStockFilter] ?? filters.theoreticalStockFilter}`
                );
            }
            if (filters.soldElsewhereFilter !== "all") {
                activeFilters.push(
                    `Vendus ailleurs: ${filters.soldElsewhereFilter === "yes" ? "Oui" : "Non"}`
                );
            }
            if (filters.foundElsewhereFilter !== "all") {
                activeFilters.push(
                    `Trouvés ailleurs: ${filters.foundElsewhereFilter === "yes" ? "Oui" : "Non"}`
                );
            }
            if (filters.specificSoldLocationFilter !== "all") {
                activeFilters.push(`Emplacement vendu: ${filters.specificSoldLocationFilter}`);
            }
            if (filters.posCategoryFilter.length > 0) {
                const names = filters.posCategoryFilter.map(
                    (id) => posCategoryNameMap?.get(id) ?? `#${id}`
                );
                activeFilters.push(`Catégories POS: ${names.join(", ")}`);
            }
            if (filters.cosmeticFilter !== "all") {
                const label =
                    filters.cosmeticFilter === "cosmetic"
                        ? "Cosmétiques [COS]"
                        : "Génériques (sans [COS])";
                activeFilters.push(`Type: ${label}`);
            }

            /* Stats rapides */
            const scannedCount = filteredItems.filter(isItemScanned).length;
            const remainingCount = filteredItems.length - scannedCount;
            const soldElsewhereCount = filteredItems.filter(hasSoldElsewhere).length;
            const unexpectedCount = filteredItems.filter(
                (i) => (i.theoretical_qty ?? 0) === 0 && (i.counted_qty ?? 0) === 1
            ).length;
            const cosmeticCount = filteredItems.filter((i) =>
                (i.product_name ?? "").toUpperCase().includes("[COS")
            ).length;
            const genericCount = filteredItems.length - cosmeticCount;

            let totalValueFiltered = 0;
            filteredItems.forEach((i) => {
                const diff = (i.counted_qty ?? 0) - (i.theoretical_qty ?? 0);
                totalValueFiltered += diff * (Number(i.unit_cost) || 0);
            });

            const summaryRows: (string | number)[][] = [
                ["EXPORT FILTRÉ — LIGNES VISIBLES DANS LE TABLEAU"],
                [""],
                ["Référence Audit", audit.reference],
                ["Boutique", audit.shop_name],
                ["Périmètre", audit.department || "Tous"],
                [
                    "Date d'export",
                    new Date().toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                    }),
                ],
                [""],
                ["FILTRES APPLIQUÉS"],
            ];

            /* Ajoute les filtres ligne par ligne (pas de .flat()) */
            if (activeFilters.length > 0) {
                activeFilters.forEach((f) => {
                    summaryRows.push(["•", f]);
                });
            } else {
                summaryRows.push(["•", "Aucun filtre (export complet)"]);
            }


            /* ═══════════════════════════════════════════════════════════ */
            /* KPIs GLOBAUX (non filtrés — pour comparaison)               */
            /* ═══════════════════════════════════════════════════════════ */
            const globalScanned = allItems.filter(isItemScanned).length;
            const globalRemaining = allItems.length - globalScanned;
            const globalSoldElsewhere = allItems.filter(hasSoldElsewhere).length;
            const globalUnexpected = allItems.filter(
                (i) => (i.theoretical_qty ?? 0) === 0 && (i.counted_qty ?? 0) === 1
            ).length;
            const globalCosmetic = allItems.filter((i) =>
                (i.product_name ?? "").toUpperCase().includes("[COS")
            ).length;

            let globalTotalValue = 0;
            allItems.forEach((i) => {
                const diff = (i.counted_qty ?? 0) - (i.theoretical_qty ?? 0);
                globalTotalValue += diff * (Number(i.unit_cost) || 0);
            });

            summaryRows.push(
                [""],
                ["STATISTIQUES — LIGNES EXPORTÉES"],
                ["Lignes exportées", filteredItems.length],
                ["Dont scannés", scannedCount],
                ["Dont restants", remainingCount],
                ["Dont vendus ailleurs (-1)", soldElsewhereCount],
                ["Dont hors périmètre", unexpectedCount],
                ["Dont cosmétiques [COS]", cosmeticCount],
                ["Dont génériques", genericCount],
                ["Écart valorisé ($)", Number(totalValueFiltered.toFixed(2))],
                [""],
                ["KPIs GLOBAUX DE L'AUDIT (non filtrés)"],
                ["Total articles", allItems.length],
                ["Total scannés", globalScanned],
                ["Total restants", globalRemaining],
                ["Total vendus ailleurs (-1)", globalSoldElsewhere],
                ["Total hors périmètre", globalUnexpected],
                ["Total cosmétiques [COS]", globalCosmetic],
                ["Écart valorisé global ($)", Number(globalTotalValue.toFixed(2))],
                [""],
                [
                    "Note",
                    "Les statistiques filtrées portent sur les lignes exportées. Les KPIs globaux couvrent l'intégralité de l'audit.",
                ]
            );

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
            wsSummary["!cols"] = [{ wch: 32 }, { wch: 60 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, "Résumé Filtres");

            /* ═══════════════════════════════════════════════════════ */
            /* FEUILLE 2 : Lignes filtrées                            */
            /* ═══════════════════════════════════════════════════════ */
            const rows = filteredItems.map((i) => {
                const counted = i.counted_qty ?? 0;
                const theoretical = i.theoretical_qty ?? 0;
                const cost = Number(i.unit_cost) || 0;
                const diff = counted - theoretical;
                const impact = diff * cost;

                const isScanned = counted === 1;
                const isUnexpected = theoretical === 0 && isScanned;

                const status = isUnexpected
                    ? "Hors Périmètre"
                    : isScanned
                        ? "Scanné"
                        : "En Attente";

                const soldLocs = getSoldLocations(i);
                const foundLocs = getFoundLocations(i);

                return {
                    "Code-barres": i.internal_barcode,
                    Produit: i.product_name || "",
                    Marque: (i as any).brand || "—",
                    Couleur: (i as any).color || "—",
                    Type: (i.product_name ?? "").toUpperCase().includes("[COS")
                        ? "Cosmétique"
                        : "Générique",
                    "HS Code": (i as any).hs_code || "—",
                    "Catégories POS": getPosCategoryNames(i).join(", ") || "—",
                    "Emplacement Origine": i.supplier_ref || "Stock Principal",
                    "Vendu Dans (-1)":
                        soldLocs.length > 0
                            ? soldLocs.map((l) => `[${l.id}] ${l.name}`).join(", ")
                            : "—",
                    "Trouvé Dans (Positif)":
                        foundLocs.length > 0
                            ? foundLocs
                                .map(
                                    (l) =>
                                        `[${l.id}] ${l.name}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`
                                )
                                .join(", ")
                            : "—",
                    "Stock Théo.": theoretical,
                    Compté: counted,
                    Statut: status,
                    "Coût Unitaire ($)": cost,
                    "Impact ($)": impact,
                };
            });

            const wsItems = XLSX.utils.json_to_sheet(rows);
            wsItems["!cols"] = [
                { wch: 22 },   // Code-barres
                { wch: 40 },   // Produit
                { wch: 18 },   // Marque
                { wch: 16 },   // Couleur
                { wch: 14 },   // Type       ← NOUVEAU
                { wch: 12 },   // HS
                { wch: 28 },   // Catégories POS
                { wch: 24 },   // Emplacement Origine
                { wch: 28 },   // Vendu Dans
                { wch: 28 },   // Trouvé Dans
                { wch: 12 },   // Théo
                { wch: 10 },   // Compté
                { wch: 16 },   // Statut
                { wch: 14 },   // Coût
                { wch: 14 },   // Impact
            ];
            XLSX.utils.book_append_sheet(wb, wsItems, "Lignes filtrées");

            /* ═══════════════════════════════════════════════════════ */
            /* Téléchargement                                          */
            /* ═══════════════════════════════════════════════════════ */
            const dateStr = new Date().toISOString().slice(0, 10);
            const suffix =
                filters.statusFilter !== "all" ? `_${filters.statusFilter}` : "_complet";
            const fileName = `AUDIT_${audit.reference}${suffix}_${dateStr}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast.success(
                `${filteredItems.length} ligne${filteredItems.length > 1 ? "s" : ""} exportée${filteredItems.length > 1 ? "s" : ""} !`
            );
        } catch (err) {
            console.error("[FILTERED_EXPORT_ERROR]", err);
            toast.error("Erreur lors de la génération Excel.");
        }
    }, [audit, filteredItems, totalItems, filters, posCategoryNameMap, allItems]);

    return { handleExport };
}