"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { EnrichedGroupedProduct } from "../page";
import { MonthDefinition } from "@/components/revenue/beauty-trend-table";

interface ExportExcelButtonProps {
    data: EnrichedGroupedProduct[];
    months: MonthDefinition[];
    month: string;
    year: string;
}

export function ExportExcelButton({ data, months, month, year }: ExportExcelButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (!data || data.length === 0) {
            toast.error("Aucune donnée disponible à exporter.");
            return;
        }

        setIsExporting(true);

        try {
            // 1. Définition des entêtes dynamiques de colonnes
            const excelRows = data.map((item) => {
                // Colonnes de base produit
                const row: Record<string, any> = {
                    "Code HS": item.hs_code,
                    "Désignation Produit": item.name,
                    "Couleur / Variante": item.color || "N/A",
                    "Stock Actuel (Unité)": Number(item.currentStock) || 0,
                    "Total CA 6M ($)": Number(item.totalRevenue) || 0,
                };

                // Calcul du total d'unités vendues sur 6 mois
                let totalSalesQty6M = 0;

                // Colonnes dynamiques par mois (du plus ancien au plus récent)
                months.forEach((m) => {
                    const sales = item.monthlySales[m.key] || { revenue: 0, qty: 0 };
                    const openingStock = item.monthlyStockOpening[m.key] ?? 0;

                    totalSalesQty6M += Number(sales.qty) || 0;

                    // Clés explicites pour Excel
                    row[`Stock Ouv. ${m.label}`] = Number(openingStock) || 0;
                    row[`Ventes Qty ${m.label}`] = Number(sales.qty) || 0;
                    row[`CA ($) ${m.label}`] = Number(sales.revenue) || 0;
                });

                // Insertion du total des ventes en quantité
                row["Total Ventes Qty 6M"] = totalSalesQty6M;

                // Vitesse de vente moyenne par mois
                row["Vente Moyenne Mensuelle (Qty)"] = Math.round((totalSalesQty6M / 6) * 100) / 100;

                return row;
            });

            // 2. Création de la feuille de calcul SheetJS
            const worksheet = XLSX.utils.json_to_sheet(excelRows);

            // 3. Ajustement automatique de la largeur des colonnes
            const columnWidths = Object.keys(excelRows[0] || {}).map((key) => {
                const maxLength = Math.max(
                    key.length,
                    ...excelRows.slice(0, 50).map((row) => String(row[key] || "").length)
                );
                return { wch: Math.min(Math.max(maxLength + 3, 10), 40) };
            });
            worksheet["!cols"] = columnWidths;

            // 4. Création du classeur Excel
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Trend Ventes & Stock 6M");

            // 5. Génération et Téléchargement du fichier
            const fileName = `Trend_Femme_6Mois_${year}-${month}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);

            toast.success(`Exportation Excel terminée (${excelRows.length} lignes) !`);
        } catch (error: any) {
            console.error("[EXCEL_EXPORT_ERROR]", error);
            toast.error("Erreur lors de la génération du fichier Excel.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            onClick={handleExport}
            disabled={isExporting || data.length === 0}
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-xl text-xs font-semibold gap-2 border-border hover:bg-accent cursor-pointer transition-all shadow-xs"
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Génération Excel...</span>
                </>
            ) : (
                <>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Exporter en Excel (.xlsx)</span>
                </>
            )}
        </Button>
    );
}