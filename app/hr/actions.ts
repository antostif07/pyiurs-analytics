"use server";

import { createClient } from "@/lib/supabase/server";
import { AttendanceStatus, Employee, EmployeeWithShop, InsertEmployee } from "@/lib/supabase/types";

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
    .lte('date', endDate)
    .order("name", { ascending: true, foreignTable: "employees" });

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