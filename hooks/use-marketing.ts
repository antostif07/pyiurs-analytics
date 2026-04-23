import { useQuery } from "@tanstack/react-query";
import { getMetaCampaigns } from "@/app/marketing/_lib/meta-actions";
// Importez votre action Odoo qui calcule le revenu par campagne (via UTM ou Nom)

export function useMarketingData(from: string, to: string) {
  return useQuery({
    queryKey: ["marketing-meta", from, to],
    queryFn: async () => {
      // 1. On récupère les dépenses sur Meta
      const metaCampaigns = await getMetaCampaigns({ from, to });

      // 2. Simulation de la jointure avec Odoo (Revenue)
      // Dans la réalité, vous feriez : const odooData = await getRevenueByCampaign(from, to)
      const enrichedCampaigns = metaCampaigns.map((camp: any) => {
        // Logique de matching : on compare le nom de la campagne Meta avec les labels Odoo
        const mockRevenue = camp.spend * (Math.random() * 8); // Simulation ROAS
        return {
          ...camp,
          revenue: mockRevenue,
          roas: camp.spend > 0 ? (mockRevenue / camp.spend).toFixed(2) : 0,
        };
      });

      return enrichedCampaigns;
    },
    enabled: !!from && !!to,
  });
}