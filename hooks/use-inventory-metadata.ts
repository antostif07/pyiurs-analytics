import { getInventoryMetadata } from "@/app/inventory/_lib/actions/inventory-actions";
import { useQuery } from "@tanstack/react-query";

export function useInventoryMetadata() {
  return useQuery({
    queryKey: ["inventory-metadata"],
    queryFn: () => getInventoryMetadata(),
    staleTime: 1000 * 60 * 30, // Cache de 30 minutes
  });
}