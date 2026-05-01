// app/hr/shops/_actions/save-shop.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { shopSchema, ShopFormValues } from "../_config/schema";

export async function saveShop(values: ShopFormValues) {
  const supabase = await createClient();
  const validated = shopSchema.safeParse(values);

  if (!validated.success) return { error: "Données invalides" };

  const { id, ...data } = validated.data;

  const query = id 
    ? supabase.from('shops').update(data).eq('id', id)
    : supabase.from('shops').insert([data]);

  const { error } = await query;
  if (error) return { error: error.message };

  revalidatePath('/hr/shops');
  return { success: true };
}