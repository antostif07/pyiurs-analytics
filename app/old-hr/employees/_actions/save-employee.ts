// app/hr/employees/_actions/save-employee.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { employeeSchema, EmployeeFormValues } from "../_config/schema";
import { revalidatePath } from "next/cache";

export async function saveEmployee(values: EmployeeFormValues) {
  const supabase = await createClient();
  
  // 1. Validation serveur stricte
  const validatedFields = employeeSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Données invalides", details: validatedFields.error.flatten() };
  }

  const { id, ...data } = validatedFields.data;

  // 2. Insert ou Update
  const query = id 
    ? supabase.from('employees').update(data).eq('id', id)
    : supabase.from('employees').insert([data]);

  const { error } = await query;

  if (error) {
    console.error("DB Error:", error);
    return { error: "Erreur lors de l'enregistrement en base de données." };
  }

  revalidatePath('/hr/employees');
  return { success: true };
}