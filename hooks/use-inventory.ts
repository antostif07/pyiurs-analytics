import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInventoryMetadata } from "@/app/actions/odoo";

export function useInventory() {
  const queryClient = useQueryClient();

  // 1. Récupération des boutiques et catégories (Métadonnées)
  const metadataQuery = useQuery({
    queryKey: ["inventory-metadata"],
    queryFn: () => getInventoryMetadata(),
    staleTime: 1000 * 60 * 60, // Garder en cache 1h
  });

  // 2. Fonction de rafraîchissement global
  // Elle force TanStack Query à refaire toutes les requêtes Odoo du dashboard
  const refreshAll = async () => {
    // On invalide les métadonnées (boutiques)
    await queryClient.invalidateQueries({ queryKey: ["inventory-metadata"] });
    
    // On invalide les KPIs (les données calculées)
    await queryClient.invalidateQueries({ queryKey: ["kpis"] });
    
    // On invalide les futures tables ou graphiques
    await queryClient.invalidateQueries({ queryKey: ["stock-table"] });
    await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    
    console.log("Dashboard Odoo synchronisé à :", new Date().toLocaleTimeString());
  };

  return {
    // Données
    warehouses: metadataQuery.data?.warehouses || [],
    categories: metadataQuery.data?.categories || [],
    
    // États
    isLoading: metadataQuery.isLoading,
    isError: metadataQuery.isError,
    lastUpdatedAt: metadataQuery.dataUpdatedAt, // L'heure réelle de la dernière réception de données
    
    // Actions
    refreshAll,
  };
}