// app/hr/employees/_config/schema.ts
import * as z from "zod";

export const employeeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, "Nom requis"),
  matricule: z.string().min(2, "Matricule requis"),
  email: z.string().email("Email invalide").or(z.literal("")),
  shop_id: z.string().uuid("Boutique requise"),
  base_salary: z.coerce.number().min(0),
  transport_allowance: z.coerce.number().min(0),
  address: z.string().optional().nullable(),
  service_phone: z.string().optional().nullable(),
  private_phone: z.string().optional().nullable(),
  employee_odoo_id: z.coerce.number().optional().nullable(),
  commission_product_ids: z.array(z.number()).default([]),
  is_active: z.boolean().default(true),
});

// C'est CE type que vous devez utiliser partout
export type EmployeeFormValues = z.infer<typeof employeeSchema>;