import { useQuery } from "@tanstack/react-query";
import { StockDashboardFilters } from "@/app/inventory/stock-dashboard-client";
import { startOfMonth, endOfMonth } from "date-fns";
import { getInventoryAnalyticsData, InventoryAnalyticsData } from "../actions/inventory-analytics";

export function useInventoryAnalytics(filters?: StockDashboardFilters) {
    const selectedShops = filters?.selectedShops || [];
    const segment = filters?.segment || "Tous";

    const now = new Date();
    const dateRange = {
        from: filters?.dateRange?.from || startOfMonth(now),
        to: filters?.dateRange?.to || endOfMonth(now),
    };

    const shopsKey = [...selectedShops].sort().join(",");

    return useQuery<InventoryAnalyticsData>({
        queryKey: [
            "inventory-analytics",
            {
                shops: shopsKey,
                segment,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
            },
        ],
        queryFn: () => getInventoryAnalyticsData(selectedShops, segment, dateRange),
        staleTime: 1000 * 60 * 5, // 5 minutes de cache
        refetchOnWindowFocus: false,
    });
}