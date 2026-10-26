// app/inventory/stock-beauty/_lib/hooks/use-export-stock-beauty.ts
"use client";

import { useState } from "react";
import { utils, writeFile } from "xlsx";
import { toast } from "sonner";
import type { StockBeautyModel } from "../types";

export type ExportFormat = "XLSX" | "CSV";

export function useExportStockBeauty() {
    const [isExporting, setIsExporting] = useState(false);

    const exportExcel = async (
        data: StockBeautyModel[],
        format: ExportFormat = "XLSX",
    ) => {
        setIsExporting(true);
        try {
            const cleanData = data.map(
                ({ individualProducts, stockByShop, ...rest }) => ({
                    ...rest,
                    stockByShop: JSON.stringify(stockByShop),
                }),
            );
            const ws = utils.json_to_sheet(cleanData);
            const wb = utils.book_new();
            utils.book_append_sheet(wb, ws, "Stock Beauty");

            const filename = `control_stock_beauty_${new Date()
                .toISOString()
                .slice(0, 10)}.${format === "XLSX" ? "xlsx" : "csv"}`;
            writeFile(wb, filename);

            toast.success(`Export ${format} téléchargé`);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : "Erreur d'export",
            );
        } finally {
            setIsExporting(false);
        }
    };

    return { exportExcel, isExporting };
}