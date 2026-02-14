"use server";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { createClient } from "@/lib/supabase/server";
import { endOfMonth, format, startOfMonth } from "date-fns";

export async function getHROverview(range: string) {
  const supabase = createClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // 1. Effectif Total
  const { count: totalEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // 2. Statistiques de présence (Aujourd'hui)
  const { data: attendanceToday } = await supabase
    .from('attendances')
    .select('status, is_validated')
    .eq('date', today);

  const presentToday = attendanceToday?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
  const absentsToday = attendanceToday?.filter(a => a.status === 'absent').length || 0;

  // 3. Travail à faire (Validation en attente pour le mois en cours)
  const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  
  const { count: pendingValidation } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('is_validated', false)
    .gte('date', start)
    .lte('date', end);

  // 4. Répartition par boutique (pour le graph)
  const { data: shopDistribution } = await supabase
    .from('employees')
    .select('shops(name)')
    .eq('is_active', true);

  return {
    stats: {
      totalEmployees: totalEmployees || 0,
      presentToday,
      absentsToday,
      pendingValidation: pendingValidation || 0,
    },
    today,
    range
  };
}

export async function getOdooCompanies() {
  try {
    const companies = await odooClient.searchRead("res.company", {
      fields: ["id", "name"],
    }) as { id: number; name: string }[];

    return companies;
  } catch (error) {
    console.error("Erreur lors de la récupération des compagnies Odoo:", error);
    return [];
  }
}

export async function getOdooHRData() {
  try {
    const [employees, products] = await Promise.all([
      // Récupération des employés Odoo
      odooClient.searchRead("hr.employee", {
        fields: ["id", "name"],
        order: "name asc"
      }),
      
      // Récupération des produits de tarification Odoo
      odooClient.searchRead("product.pricelist", {
        fields: ["id", "name"],
        order: "name asc"
      })
    ]);

    return {
      employees: (employees as any[]).map(e => ({ value: String(e.id), label: e.name })),
      products: (products as any[]).map(p => ({ 
        value: String(p.id), 
        label: `${p.name} (${p.list_price} $)` 
      }))
    };
  } catch (error) {
    console.error("Odoo Fetch Error:", error);
    return { employees: [], products: [] };
  }
}