import { useQuery } from "@tanstack/react-query";
import { StockDashboardFilters } from "@/app/inventory/stock-dashboard-client";
import { startOfMonth, endOfMonth } from "date-fns";
import { getStockTableData, StockTableRow } from "../actions/inventory-stock-table";

export function useStockTable(filters?: StockDashboardFilters) {
    const selectedShops = filters?.selectedShops || [];
    const segment = filters?.segment || "Tous";

    const now = new Date();
    const dateRange = {
        from: filters?.dateRange?.from || startOfMonth(now),
        to: filters?.dateRange?.to || endOfMonth(now),
    };

    const shopsKey = [...selectedShops].sort().join(",");

    return useQuery<StockTableRow[]>({
        queryKey: [
            "stock-table",
            {
                shops: shopsKey,
                segment,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
            },
        ],
        queryFn: () => getStockTableData(selectedShops, segment, dateRange),
        staleTime: 1000 * 60 * 3, // 3 minutes de cache
        refetchOnWindowFocus: false,
    });
}