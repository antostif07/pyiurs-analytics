"use client";

import { useMemo, useState, useCallback } from "react";
import { hasSoldElsewhere, isItemScanned, StatusFilter, StockAuditItem } from "../types";

export function useAuditItems(initialItems: StockAuditItem[]) {
    const [items, setItems] = useState<StockAuditItem[]>(initialItems);
    const [filterSearch, setFilterSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const updateItemOptimistic = useCallback((itemId: string, updater: (item: StockAuditItem) => StockAuditItem) => {
        setItems((prev) => {
            const idx = prev.findIndex((i) => i.id === itemId);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = updater(next[idx]);
            return next;
        });
    }, []);

    // ACCUMULATION PERFORMANTE DE TOUS LES KPIS DANS UN SEUL USEMEMO
    const stats = useMemo(() => {
        const totalItemsCount = items.length;
        const scannedItemsCount = items.filter(isItemScanned).length;
        const remainingItemsCount = totalItemsCount - scannedItemsCount;
        const soldElsewhereCount = items.filter(hasSoldElsewhere).length;
        const progressPercent = totalItemsCount > 0 ? Math.round((scannedItemsCount / totalItemsCount) * 100) : 0;

        const { totalDiffQty, totalDiffValue, scannedValuation, totalValuation } = items.reduce(
            (acc, item) => {
                const counted = item.counted_qty ?? 0;
                const theoretical = item.theoretical_qty ?? 0;
                const cost = Number(item.unit_cost) || 0;
                const diff = counted - theoretical;

                return {
                    totalDiffQty: acc.totalDiffQty + diff,
                    totalDiffValue: acc.totalDiffValue + diff * cost,
                    scannedValuation: acc.scannedValuation + (counted * cost),
                    totalValuation: acc.totalValuation + (theoretical * cost),
                };
            },
            { totalDiffQty: 0, totalDiffValue: 0, scannedValuation: 0, totalValuation: 0 }
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

    const filteredItems = useMemo(() => {
        const query = filterSearch.trim().toLowerCase();
        if (!query && statusFilter === "all") return items;

        return items.filter((item) => {
            const matchText =
                !query ||
                [
                    item.internal_barcode,
                    item.product_name,
                    item.brand,
                    item.color,
                    item.hs_code,
                ].some((field) => field?.toLowerCase().includes(query));

            const scanned = isItemScanned(item);
            const soldElsewhere = hasSoldElsewhere(item);

            switch (statusFilter) {
                case "scanned":
                    return matchText && scanned;
                case "remaining":
                    return matchText && !scanned;
                case "sold_elsewhere":
                    return matchText && soldElsewhere;
                default:
                    return matchText;
            }
        });
    }, [items, filterSearch, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage]);

    const safeSetFilterSearch = useCallback((val: string) => {
        setFilterSearch(val);
        setCurrentPage(1);
    }, []);

    const safeSetStatusFilter = useCallback((val: StatusFilter) => {
        setStatusFilter(val);
        setCurrentPage(1);
    }, []);

    return {
        items,
        setItems,
        updateItemOptimistic,
        filterSearch,
        setFilterSearch: safeSetFilterSearch,
        statusFilter,
        setStatusFilter: safeSetStatusFilter,
        currentPage,
        setCurrentPage,
        totalPages,
        paginatedItems,
        ...stats,
    };
}