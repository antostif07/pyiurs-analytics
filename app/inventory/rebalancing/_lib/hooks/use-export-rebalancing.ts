// app/inventory/rebalancing/_lib/hooks/use-export-rebalancing.ts
"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

type ExportType = "internal" | "inter_company";

export function useExportRebalancing() {
    const [isExporting, setIsExporting] = useState(false);

    const exportExcel = useCallback(
        async (shopId: string, type: ExportType, locationId?: number | null,) => {
            if (isExporting) return;
            setIsExporting(true);
            try {
                const params = new URLSearchParams({ shop: shopId, type });
                if (locationId != null) {
                    params.set("location", String(locationId));
                }
                const res = await fetch(
                    `/api/inventory/rebalancing/export?${params.toString()}`,
                );

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error ?? "Échec de l'export");
                }

                const blob = await res.blob();
                const disposition = res.headers.get("content-disposition") ?? "";
                const match = disposition.match(/filename="?([^";]+)"?/);
                const filename =
                    match?.[1] ??
                    `rebalancing_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;

                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast.success(
                    type === "internal"
                        ? "Transferts internes téléchargés"
                        : "Ventes inter-company téléchargées",
                );
            } catch (err) {
                toast.error(
                    err instanceof Error ? err.message : "Erreur d'export",
                );
            } finally {
                setIsExporting(false);
            }
        },
        [isExporting],
    );

    return { exportExcel, isExporting };
}