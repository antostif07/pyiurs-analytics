// /_hooks/useRetention.ts

import { useQuery } from "@tanstack/react-query";

export function useRetention(monthOffset: number) {
  return useQuery({
    queryKey: ["crm-retention", monthOffset],
    queryFn: async () => {
      const res = await fetch(`/api/retention?monthOffset=${monthOffset}`);
      if (!res.ok) throw new Error("Erreur API");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
}