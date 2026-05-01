import { z } from "zod";

export const employeeSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(2, "Le nom est requis"),
  matricule: z.string().min(1, "Le matricule est requis"),
  base_salary: z.coerce.number().min(0, "Le salaire doit être positif"),
  transport_allowance: z.coerce.number().min(0, "L'indemnité de transport doit être positive").optional(),
  email: z.email("Email invalide")
    .nullable()
    .or(z.literal(""))
    .transform(val => val === "" ? null : val),
  job_title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  shop_id: z.uuid("Veuillez sélectionner une boutique"),
  is_active: z.boolean().default(true),
});

export type EmployeeFormValues = z.input<typeof employeeSchema>;