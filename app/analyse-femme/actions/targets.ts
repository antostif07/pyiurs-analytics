'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function updateSalesTarget(targetAmount: number, month: number, year: number) {
  const cookieStore = cookies();
  const supabase = createClient();

  // On utilise "upsert" : si la ligne (tag, year, month) existe, on update. Sinon on crée.
  // Pour que ça marche, il faut une contrainte d'unicité sur la table.
  // Si tu n'as pas de contrainte unique, on fait un check manuel simple.

  try {
    // 1. Vérifier si une target existe déjà pour ce mois
    const { data: existing } = await supabase
      .from('sales_targets')
      .select('id')
      .eq('category_tag', 'femme')
      .eq('year', year)
      .eq('month', month)
      .single();

    if (existing) {
      // UPDATE
      const { error } = await supabase
        .from('sales_targets')
        .update({ target_amount: targetAmount })
        .eq('id', existing.id);
      
      if (error) throw error;
    } else {
      // INSERT
      const { error } = await supabase
        .from('sales_targets')
        .insert({
          category_tag: 'femme',
          target_amount: targetAmount,
          year: year,
          month: month
        });

      if (error) throw error;
    }

    // On rafraichit la page pour voir le nouveau %
    revalidatePath('/analyse-femme');
    return { success: true };

  } catch (error) {
    console.error("Erreur Update Target:", error);
    return { success: false, error: "Impossible de mettre à jour l'objectif." };
  }
}

export async function getTargetsHistory() {
  const cookieStore = cookies();
  const supabase = createClient();

  try {
    const { data } = await supabase
      .from('sales_targets')
      .select('*')
      .eq('category_tag', 'femme')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(12); // Les 12 derniers/futurs enregistrés

    return data || [];
  } catch (error) {
    console.error("Erreur Fetch Targets:", error);
    return [];
  }
}