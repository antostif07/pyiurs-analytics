// hooks/use-stock-kpis.ts
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { getInventoryKpis } from "@/app/actions/odoo-kpis";
import { parseISO, startOfMonth, endOfMonth } from "date-fns";
import { useInventory } from "./use-inventory"; // Importation du hook de métadonnées

export function useStockKpis() {
  const searchParams = useSearchParams();
  const { warehouses, isLoading: isMetadataLoading } = useInventory();

  // 1. Extraction des filtres de l'URL
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const shopsStr = searchParams.get("shops");

  const dateRange = {
    from: fromStr ? parseISO(fromStr) : startOfMonth(new Date()),
    to: toStr ? parseISO(toStr) : endOfMonth(new Date()),
  };

  // 2. Logique de sélection intelligente :
  // Si shopsStr existe -> on parse les IDs.
  // Sinon (si vide dans l'URL) -> on prend TOUS les IDs des warehouses chargés.
  const selectedShops = shopsStr 
    ? shopsStr.split(",").map(Number) 
    : warehouses.map((w: any) => w.id);

  return useQuery({
    // On inclut shopsStr dans la clé pour différencier "Sélection précise" et "Tout"
    queryKey: ["kpis", selectedShops, fromStr, toStr],
    queryFn: () => getInventoryKpis(selectedShops, dateRange),
    
    // On n'exécute la requête que si :
    // - On a des IDs (soit de l'URL, soit du fallback warehouses)
    // - Et que les métadonnées ne sont plus en cours de chargement
    enabled: selectedShops.length > 0 && !isMetadataLoading,
    
    staleTime: 1000 * 60 * 5,
  });
}