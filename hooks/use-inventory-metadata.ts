import { useQuery } from "@tanstack/react-query";
import { getInventoryMetadata } from "@/app/actions/odoo";

export function useInventoryMetadata() {
  return useQuery({
    queryKey: ["inventory-metadata"],
    queryFn: () => getInventoryMetadata(),
    staleTime: 1000 * 60 * 30, // Cache de 30 minutes
  });
}