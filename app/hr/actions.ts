"use server";

export async function getHROverview(range: string) {
  // Simulation d'un délai réseau (ex: interrogation Supabase)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Données factices pour l'instant
  return {
    totalEmployees: 42,
    presentToday: 35,
    lateToday: 3,
    onLeave: 4,
    recentActivity: [
      { id: 1, user: "Jean Dupont", action: "Check-in", time: "08:02" },
      { id: 2, user: "Marie Claire", action: "Check-in", time: "08:15" },
    ]
  };
}

import { odooClient } from "@/lib/odoo/xmlrpc";

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