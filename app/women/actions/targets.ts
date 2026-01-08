'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function updateSalesTarget(targetAmount: number, month: number, year: number) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    // Check existance
    const { data: existing } = await supabase
      .from('sales_targets')
      .select('id')
      .eq('category_tag', 'femme')
      .eq('year', year)
      .eq('month', month)
      .single();

    if (existing) {
      await supabase
        .from('sales_targets')
        .update({ target_amount: targetAmount })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('sales_targets')
        .insert({
          category_tag: 'femme',
          target_amount: targetAmount,
          year: year,
          month: month
        });
    }

    revalidatePath('/analyse-femme');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Erreur update" };
  }
}

export async function getSalesTarget(month: number, year: number) {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from('sales_targets')
      .select('target_amount')
      .eq('category_tag', 'femme')
      .eq('year', year)
      .eq('month', month)
      .single();

    return data?.target_amount || 0;
  } catch (error) {
    return 0;
  }
}