import { useQuery } from "@tanstack/react-query";
import { StockDashboardFilters } from "@/app/inventory/stock-dashboard-client";
import { getStockInsightsData, StockInsightItem } from "../actions/inventory-insights";

export function useStockInsights(filters?: StockDashboardFilters) {
    const selectedShops = filters?.selectedShops || [];
    const segment = filters?.segment || "Tous";
    const shopsKey = [...selectedShops].sort().join(",");

    return useQuery<StockInsightItem[]>({
        queryKey: [
            "stock-insights",
            {
                shops: shopsKey,
                segment,
            },
        ],
        queryFn: () => getStockInsightsData(selectedShops, segment),
        staleTime: 1000 * 60 * 10, // 10 minutes de mise en cache
        refetchOnWindowFocus: false,
    });
}