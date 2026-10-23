import { getOdooWarehouses } from "@/app/actions/odoo";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useInventory() {
  const queryClient = useQueryClient();

  // Query pour les boutiques
  const warehousesQuery = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => getOdooWarehouses(),
    staleTime: 1000 * 60 * 60, // Les boutiques changent rarement (1h)
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["inventory-data"] });
    await queryClient.invalidateQueries({ queryKey: ["warehouses"] });
  };

  return {
    warehouses: warehousesQuery.data ?? [],
    isLoading: warehousesQuery.isLoading,
    refreshAll,
    lastUpdatedAt: warehousesQuery.dataUpdatedAt,
  };
}