import { useQuery } from "@tanstack/react-query";
import { StockDashboardFilters } from "@/app/inventory/stock-dashboard-client";
import { getStockAlertsData, StockAlertItem } from "../actions/inventory-alerts";

export function useStockAlerts(filters?: StockDashboardFilters) {
    const selectedShops = filters?.selectedShops || [];
    const segment = filters?.segment || "Tous";
    const shopsKey = [...selectedShops].sort().join(",");

    return useQuery<StockAlertItem[]>({
        queryKey: [
            "stock-alerts",
            {
                shops: shopsKey,
                segment,
            },
        ],
        queryFn: () => getStockAlertsData(selectedShops, segment),
        staleTime: 1000 * 60 * 5, // 5 minutes de cache
        refetchOnWindowFocus: false,
    });
}