"use server";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { createClient } from "@/lib/supabase/server";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { HROverviewData } from "./types"; // Importe l'interface qu'on a définie

export async function getHROverview(range: string): Promise<HROverviewData> {
  const supabase = await createClient();
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  
  // Bornes du mois en cours pour la validation et la paie
  const start = format(startOfMonth(now), 'yyyy-MM-dd');
  const end = format(endOfMonth(now), 'yyyy-MM-dd');

  // 1. Exécution des requêtes en parallèle (Performance Entreprise)
  const [employeesRes, attendanceTodayRes, pendingValidationRes, bonusesCheckRes] = await Promise.all([
    // Effectif Total
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
    
    // Présences du jour
    supabase.from('attendances').select('status').eq('date', todayStr),
    
    // Validations en attente (Mois en cours)
    supabase.from('attendances').select('*', { count: 'exact', head: true })
      .eq('is_validated', false)
      .gte('date', start)
      .lte('date', end),

    // Vérification si des primes ont été saisies ce mois-ci (pour le statut paie)
    supabase.from('bonuses_debts').select('id', { count: 'exact', head: true })
      .gte('created_at', start)
      .lte('created_at', end)
  ]);

  // 2. Traitement des résultats
  const totalEmployees = employeesRes.count || 0;
  const attendanceToday = attendanceTodayRes.data || [];
  
  const presentToday = attendanceToday.filter(a => ['present', 'late'].includes(a.status)).length;
  const absentsToday = attendanceToday.filter(a => a.status === 'absent').length;
  const pendingValidation = pendingValidationRes.count || 0;

  // 3. Logique métier pour le statut de la paie (Payroll Status)
  // On considère la clôture des présences finie s'il n'y a plus rien à valider
  const isAttendanceClosed = pendingValidation === 0;
  const isBonusesCalculated = (bonusesCheckRes.count || 0) > 0;

  // Calcul du progrès global du mois (0 à 100)
  let progress = 10; // Setup initial
  if (isAttendanceClosed) progress += 40;
  if (isBonusesCalculated) progress += 50;

  return {
    stats: {
      totalEmployees,
      presentToday,
      absentsToday,
      pendingValidation,
    },
    payrollStatus: {
      month: format(now, 'MMMM yyyy'),
      isAttendanceClosed,
      isBonusesCalculated,
      progress
    }
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