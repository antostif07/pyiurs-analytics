"use server";

import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

const normalizePhone = (phone: string | false): string => {
  if (!phone) return "SANS_NUMERO";
  
  // 1. Garder uniquement les chiffres
  let cleaned = phone.replace(/\D/g, ""); 

  // 2. Gérer les préfixes internationaux (00243 ou 243) -> On les retire pour ne garder que le numéro local
  if (cleaned.startsWith("00243")) cleaned = cleaned.substring(5);
  else if (cleaned.startsWith("243")) cleaned = cleaned.substring(3);
  
  // 3. Retirer le '0' initial s'il existe encore (ex: 089 -> 89)
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);

  // 4. Retourner les 9 derniers chiffres (standard pour mobile)
  return cleaned.slice(-9); 
};

export async function getAllCustomers() {
  try {
    const customers = await odooClient.searchRead<{
      id: number; name: string; email: string | false; phone: string | false;
    }>("res.partner", {
      domain: [["customer_rank", ">", 0]],
      fields: ["name", "email", "phone"],
    });

    // On récupère le montant total ET le nombre de commandes (count)
    const salesData = await odooClient.readGroup<{ 
      partner_id: [number, string], 
      amount_total: number,
      partner_id_count: number, // Odoo renvoie automatiquement le compte par groupe
      date_order: string 
    }>("pos.order", {
      domain: [["partner_id", "!=", false], ["state", "in", ["paid", "done"]]],
      fields: ["partner_id", "amount_total", "date_order:max"],
      groupby: ["partner_id"],
    });

    const statsMap = new Map(salesData.map(s => [
      s.partner_id[0], 
      {
        total_spent: s.amount_total || 0,
        order_count: s.partner_id_count || 1,
        // @ts-ignore - On utilise "date_order:max" pour récupérer la date de la dernière commande, mais TypeScript ne le reconnaît pas comme un champ valide
        last_order_date: s.date_order || s["date_order:max"] || false
      }
    ]));

    return customers.map(c => {
      const stats = statsMap.get(c.id);
      const total = stats?.total_spent || 0;
      const count = stats?.order_count || 0;
      
      return {
        ...c,
        normalized_phone: normalizePhone(c.phone),
        total_spent: total,
        order_count: count,
        // Calcul du panier moyen (AOV)
        average_basket: count > 0 ? Math.round(total / count) : 0,
        last_order_date: stats?.last_order_date || false,
      };
    });
  } catch (error) {
    throw new Error("Erreur Odoo");
  }
}