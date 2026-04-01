// app/hr/employees/_actions/get-employees.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { EmployeeWithRelations } from "../../types";

interface GetEmployeesParams {
  query?: string;
  page?: number;
  shop?: string;
}

export async function getEmployees({ query, page = 1, shop }: GetEmployeesParams) {
  const supabase = await createClient();
  const PAGE_SIZE = 10;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Construction de la requête avec jointure shops
  let request = supabase
    .from('employees')
    .select(`
      *,
      shops (
        name,
        odoo_company_id
      )
    `, { count: 'exact' });

  // Filtres
  if (query) {
    request = request.ilike('name', `%${query}%`);
  }
  if (shop && shop !== 'all') {
    request = request.eq('shop_id', shop);
  }

  const { data, count, error } = await request
    .order('name', { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    // On force le cast vers notre type composé
    data: (data as unknown as EmployeeWithRelations[]) || [],
    totalCount: count || 0
  };
}