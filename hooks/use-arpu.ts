"use client";
import { useQuery } from "@tanstack/react-query";
import { getArpuStats } from "@/app/actions/arpu";
import { DateRange } from "react-day-picker";

/**
 * Hook TanStack Query pour récupérer les statistiques ARPU
 * @param dateRange - Objet contenant les dates 'from' et 'to' (DateRange de react-day-picker)
 * @param selectedSegments - Tableau de strings ["Femme", "Beauty", "Enfant"]
 */
export function useArpuData(
  dateRange: { from: Date; to: Date } | undefined, 
  selectedSegments: string[]
) {
  return useQuery({
    // La queryKey inclut les filtres pour déclencher un refresh automatique à chaque changement
    queryKey: ["arpu-stats", dateRange?.from, dateRange?.to, selectedSegments],
    
    queryFn: async () => {
      // Sécurité : on s'assure que les dates sont présentes avant l'appel
      if (!dateRange?.from || !dateRange?.to) {
        throw new Error("Période d'analyse non définie.");
      }
      
      // Appel de l'Action Odoo (Server Action)
      return await getArpuStats(
        { from: dateRange.from, to: dateRange.to },
        selectedSegments
      );
    },
    
    // N'exécute la requête que si les dates sont valides
    enabled: !!dateRange?.from && !!dateRange?.to,
    
    // Configuration Cache Entreprise
    staleTime: 1000 * 60 * 10, // Les données sont considérées comme fraîches pendant 10 min
    gcTime: 1000 * 60 * 30,    // On garde en mémoire cache pendant 30 min
    
    // Retry en cas d'erreur de connexion Odoo
    retry: 1,
  });
}