// app/hr/shops/_config/schema.ts
import * as z from "zod";

export const shopSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  odoo_company_id: z.coerce.number().nullable().optional(),
});

export type ShopFormValues = z.infer<typeof shopSchema>;