"use server";

import { createClient } from "@/lib/supabase/server";
import { AttendanceStatus, Employee, EmployeeWithShop, InsertEmployee, PaySlip } from "@/lib/supabase/types";

/**
 * Récupère la liste paginée des agents avec recherche et tri
 * @param page 
 * @param limit 
 * @param searchQuery 
 * @param sortBy 
 * @param sortOrder 
 * @returns 
 */
export async function getEmployees(
    page: number = 1,
    limit: number = 10,
    searchQuery: string = "",
    sortBy: string = "name", // Colonne par défaut
    sortOrder: "asc" | "desc" = "asc" // Ordre par défaut
): Promise<{ data: EmployeeWithShop[], totalCount: number, totalPages: number, currentPage: number }> {
    const supabase = await createClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from("employees")
        .select(`
            id, matricule, name, email, is_active, service_phone, department, job_title, base_salary, transport_allowance,  
            shops ( id,name )
        `, { count: "exact" });
    
    if (searchQuery) {
        query = query.or(
            `name.ilike.%${searchQuery}%,matricule.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
    }

    // Application du tri dynamique
    const { data, count, error } = await query
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(from, to);

    if (error) {
        console.error("Erreur lors de la récupération des agents:", error);
        throw new Error("Impossible de charger les agents.");
    }

    return {
        data: data as unknown as EmployeeWithShop[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        currentPage: page,
    };
}

/**
 * Récupère la liste des boutiques pour le filtre dans l'annuaire des agents
 */
export async function getShops() {
  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("id, name").order("name");
  return data || [];
}

/**
 * Crée ou met à jour un agent (upsert)
 * @param employee 
 * @returns 
 * @throws Erreur si l'opération échoue
 */
export async function upsertEmployee(employee: InsertEmployee): Promise<Employee> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("employees")
    .upsert(employee)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour la validation d'un pointage
 * @param id 
 * @param data 
 * @returns 
 */
export async function updateAttendanceValidation(
  id: string, 
  data: { 
    validated_status?: AttendanceStatus, 
    is_confirmed?: boolean, 
    is_validated?: boolean,
    confirmed_by?: string,
    validated_by?: string
  }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('attendances')
    .update(data)
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}

export async function getMonthlyAttendance(month: string, year: string, shopId?: string) {
  const supabase = await createClient();
  
  const startDate = `${year}-${month}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

  // Construction de la requête sur la table attendances
  let query = supabase
    .from('attendances')
    .select(`
      *,
      employees!inner (
        id, 
        name, 
        matricule,
        shop_id,
        shops!inner (
          id,
          name
        )
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  // Filtrage par boutique si spécifié
  if (shopId && shopId !== "all") {
    query = query.eq('employees.shop_id', shopId);
  }

  const { data, error } = await query.order('date', { ascending: true });

  if (error) {
    console.error("Erreur récup attendances:", error);
    return { attendances: [] };
  }

  const noSundays = (data || []).filter(att => new Date(att.date).getDay() !== 0);

  return { attendances: noSundays };
}

export async function prepareEmployeePayslip(employeeId: string, month: number, year: number) {
  const supabase = await createClient();

  // 1. Récupérer les infos de l'employé (Salaire de base, Transport)
  const { data: employee } = await supabase
    .from('employees')
    .select('base_salary, transport_allowance')
    .eq('id', employeeId)
    .single();

  // 2. Récupérer les absences du mois (Table attendances)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  const { count: absencesCount } = await supabase
    .from('attendances')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .eq('status', 'absent') // On ne compte que les absences non justifiées
    .gte('date', startDate)
    .lte('date', endDate);

  // 3. Calcul de la déduction pour absence
  // Logique entreprise : Salaire de base / 26 jours ouvrables * nombre d'absences
  const dailyRate = (employee?.base_salary || 0) / 26;
  const absenceDeduction = (absencesCount || 0) * dailyRate;

  // 4. Préparer l'objet pour la table payslips
  const payslipDraft = {
    employee_id: employeeId,
    month,
    year,
    base_salary: employee?.base_salary || 0,
    transport_allowance: employee?.transport_allowance || 0,
    deductions_absences: Math.round(absenceDeduction),
    net_payable: Math.round((employee?.base_salary || 0) + (employee?.transport_allowance || 0) - absenceDeduction),
    status: 'draft'
  };

  return payslipDraft;
}

export async function getPayrollData(month: number, year: number, shopId: string) {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  let query = supabase
    .from('employees')
    .select(`
      *,
      shops(name),
      attendances(*),
      employee_bonuses(*),
      employee_debts(*),
      payslips(*)
    `)
    .eq('is_active', true)
    .filter('attendances.date', 'gte', startDate)
    .filter('attendances.date', 'lte', endDate);

  if (shopId !== 'all') query = query.eq('shop_id', shopId);

  const { data: employees, error } = await query;
  return { employees: employees || [], error };
}

export async function getPayrollStats(month: number, year: number) {
  const supabase = await createClient();
  
  const { data: payslips } = await supabase
    .from('payslips')
    .select('net_payable, base_salary_snapshot, status') // Adapté à tes noms de colonnes
    .eq('month', month)
    .eq('year', year);

  const { count: activeEmployees } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const totalNet = (payslips as unknown as PaySlip[])?.reduce((acc, p) => acc + (Number(p.net_payable) || 0), 0) || 0;
  const validatedCount = payslips?.length || 0;

  return {
    totalNet,
    validatedCount,
    totalEmployees: activeEmployees || 0,
    progress: activeEmployees ? (validatedCount / activeEmployees) * 100 : 0
  };
}

export async function getPayrollPrepData(month: number, year: number, shopId: string) {
  const supabase = await createClient();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  let query = supabase
    .from('employees')
    .select(`
      id, name, matricule, base_salary, transport_allowance,
      shops(name),
      attendances(*),
      employee_bonuses(*),
      employee_debts(*),
      payslips(*)
    `)
    .eq('is_active', true)
    // Filtre les présences uniquement pour le mois sélectionné
    .filter('attendances.date', 'gte', startDate)
    .filter('attendances.date', 'lte', endDate)
    // Filtre les primes pour le mois
    .filter('employee_bonuses.month', 'eq', month)
    .filter('employee_bonuses.year', 'eq', year)
    // Filtre les dettes actives
    .filter('employee_debts.status', 'eq', 'active');

  if (shopId !== 'all') {
    query = query.eq('shop_id', shopId);
  }

  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}