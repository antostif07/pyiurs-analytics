import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { parseISO, startOfMonth, endOfMonth, isValid } from "date-fns";
import { StockDashboardFilters } from "@/app/inventory/stock-dashboard-client";
import { useInventory } from "./use-inventory";
import { getInventoryKpis } from "../../actions";

// ✅ Interface stricte des données retournées par l'action Odoo
export interface StockKpisData {
  openingStock: number;
  openingValue?: number;
  openingTrend?: number;
  qtyReceived: number;
  receivedValue?: number;
  receivedTrend?: number;
  qtySold: number;
  soldValue?: number;
  salesTrend?: number;
  closingStock: number;
  closingValue?: number;
  closingTrend?: number;
  salesSpark?: number[];
  receivedSpark?: number[];
  openingSpark?: number[];
  closingSpark?: number[];
}

export function useStockKpis(customFilters?: StockDashboardFilters) {
  const searchParams = useSearchParams();
  const { warehouses = [], isLoading: isMetadataLoading } = useInventory();

  // 1. Extraction et validation défensive des filtres temporels
  const fromStr = customFilters?.dateRange?.from
    ? customFilters.dateRange.from.toISOString()
    : searchParams.get("from");

  const toStr = customFilters?.dateRange?.to
    ? customFilters.dateRange.to.toISOString()
    : searchParams.get("to");

  // 2. Extraction du Segment sélectionné
  const segment = customFilters?.segment || searchParams.get("segment") || "Tous";

  // 3. Extraction des Boutiques (Shops)
  const shopsStr = customFilters?.selectedShops && customFilters.selectedShops.length > 0
    ? customFilters.selectedShops.join(",")
    : searchParams.get("shops");

  const now = new Date();
  const parsedFrom = fromStr ? parseISO(fromStr) : null;
  const parsedTo = toStr ? parseISO(toStr) : null;

  const dateRange = {
    from: parsedFrom && isValid(parsedFrom) ? parsedFrom : startOfMonth(now),
    to: parsedTo && isValid(parsedTo) ? parsedTo : endOfMonth(now),
  };

  // Résolution des IDs de boutiques sous forme numérique propre
  const selectedShops: number[] = shopsStr
    ? shopsStr.split(",").map(Number).filter(n => !isNaN(n))
    : warehouses.map((w: any) => Number(w.id)).filter(n => !isNaN(n));

  // Clé triée pour la stabilité du cache TanStack Query
  const sortedShopsKey = [...selectedShops].sort((a, b) => a - b).join(",");

  return useQuery<StockKpisData>({
    // ✅ Clé d'objet TanStack Query v5 structurée et réactive
    queryKey: [
      "stock-kpis",
      {
        shops: sortedShopsKey,
        from: fromStr,
        to: toStr,
        segment,
      },
    ],
    queryFn: () => getInventoryKpis(selectedShops, dateRange, segment),

    // Activé uniquement si des boutiques sont sélectionnées et que les métadonnées sont chargées
    enabled: selectedShops.length > 0 && !isMetadataLoading,

    staleTime: 1000 * 60 * 5, // 5 minutes de mise en cache
    refetchOnWindowFocus: false, // Évite les requêtes Odoo superflues lors du changement d'onglet
  });
}