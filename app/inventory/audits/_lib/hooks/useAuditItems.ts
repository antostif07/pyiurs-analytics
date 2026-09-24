"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasSoldElsewhere, isItemScanned, StockAuditItem } from "../types";

/**
 * Hook d'état local des articles d'audit.
 *
 * RESPONSABILITÉS :
 *  - Source de vérité des items (state local synchronisé avec initialItems)
 *  - Mise à jour optimiste d'un item (scan, markFound, etc.)
 *  - Calcul des KPIs globaux (scanned, remaining, valuations…)
 *
 * NON-RESPONSABILITÉS (déléguées à AuditDataTable via TanStack) :
 *  - Filtrage (recherche, statut, marque, POS…)
 *  - Pagination
 */
export function useAuditItems(initialItems: StockAuditItem[]) {
    const [items, setItems] = useState<StockAuditItem[]>(initialItems);

    /**
     * Sync serveur → client.
     *
     * Après un `router.refresh()` (sync Odoo, import Excel, validation),
     * Next.js re-render le Server Component et fournit un nouveau tableau
     * `initialItems`. React ignore la valeur initiale de `useState`, donc on
     * doit explicitement remettre le state local à jour.
     *
     * Sécurité : on garde une réf de la dernière liste appliquée pour éviter
     * un reset inutile si le parent re-render sans que les données changent
     * (ex: toggle d'un state local du parent).
     */
    const lastSyncedRef = useRef<StockAuditItem[]>(initialItems);

    useEffect(() => {
        if (lastSyncedRef.current === initialItems) return;
        lastSyncedRef.current = initialItems;
        setItems(initialItems);
    }, [initialItems]);

    /**
     * Mise à jour optimiste d'un item par son id.
     * Ne fait rien si l'id est introuvable (sécurité).
     */
    const updateItemOptimistic = useCallback(
        (itemId: string, updater: (item: StockAuditItem) => StockAuditItem) => {
            setItems((prev) => {
                const idx = prev.findIndex((i) => i.id === itemId);
                if (idx === -1) return prev;
                const next = [...prev];
                next[idx] = updater(next[idx]);
                return next;
            });
        },
        []
    );

    /**
     * KPIs globaux de l'audit — un seul passage sur les items.
     * Recalculé uniquement quand la liste change.
     */
    const stats = useMemo(() => {
        const totalItemsCount = items.length;
        const scannedItemsCount = items.filter(isItemScanned).length;
        const remainingItemsCount = totalItemsCount - scannedItemsCount;
        const soldElsewhereCount = items.filter(hasSoldElsewhere).length;
        const progressPercent =
            totalItemsCount > 0
                ? Math.round((scannedItemsCount / totalItemsCount) * 100)
                : 0;

        const { totalDiffQty, totalDiffValue, scannedValuation, totalValuation } =
            items.reduce(
                (acc, item) => {
                    const counted = item.counted_qty ?? 0;
                    const theoretical = item.theoretical_qty ?? 0;
                    const cost = Number(item.unit_cost) || 0;
                    const diff = counted - theoretical;

                    return {
                        totalDiffQty: acc.totalDiffQty + diff,
                        totalDiffValue: acc.totalDiffValue + diff * cost,
                        scannedValuation: acc.scannedValuation + counted * cost,
                        totalValuation: acc.totalValuation + theoretical * cost,
                    };
                },
                {
                    totalDiffQty: 0,
                    totalDiffValue: 0,
                    scannedValuation: 0,
                    totalValuation: 0,
                }
            );

        return {
            totalItemsCount,
            scannedItemsCount,
            remainingItemsCount,
            soldElsewhereCount,
            progressPercent,
            totalDiffQty,
            totalDiffValue,
            scannedValuation,
            totalValuation,
        };
    }, [items]);

    return {
        items,
        setItems,
        updateItemOptimistic,
        ...stats,
    };
}