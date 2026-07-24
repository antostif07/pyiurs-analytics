'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BudgetInput, budgetSchema } from "@/lib/validations/budget";
import { Database } from "@/lib/supabase/database.types";

export type RevenueBudgetInsert = Database["public"]["Tables"]["revenue_budgets"]["Insert"];

export async function getBudgetsData(month: number, year: number) {
    const supabase = await createClient();

    const [{ data: budgets, error: budgetError }, { data: shops, error: shopError }] = await Promise.all([
        supabase
            .from("revenue_budgets")
            .select("*, shops(id, name)")
            .eq("month", month)
            .eq("year", year)
            .order("created_at", { ascending: false }),
        supabase.from("shops").select("id, name").order("name")
    ]);

    if (budgetError) console.error("[BUDGET_ERROR] Erreur récupération budgets:", budgetError);
    if (shopError) console.error("[BUDGET_ERROR] Erreur récupération boutiques:", shopError);

    return {
        budgets: budgets || [],
        shops: shops || []
    };
}

/**
 * Enregistre (Création ou Édition) un budget mensuel avec résolution intelligente de doublons
 */
export async function upsertBudgetAction(input: BudgetInput) {
    try {
        const validated = budgetSchema.parse(input);
        const supabase = await createClient();

        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id || null;

        // ✅ 1. Détection : Recherche si un enregistrement existe déjà pour cette combinaison exacte
        const { data: existingRecord } = await supabase
            .from("revenue_budgets")
            .select("id")
            .eq("shop_id", validated.shopId)
            .eq("segment", validated.segment)
            .eq("month", validated.month)
            .eq("year", validated.year)
            .maybeSingle();

        // SCÉNARIO A : La combinaison (Shop + Segment + Mois + Année) existe DÉJÀ en base
        if (existingRecord) {
            // On met simplement à jour le montant cible de l'enregistrement existant
            const { error: updateError } = await supabase
                .from("revenue_budgets")
                .update({
                    target_amount: validated.targetAmount,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", existingRecord.id);

            if (updateError) throw new Error(updateError.message);

            // Si l'utilisateur modifiait une autre ligne (validated.id) et l'a déplacée vers une combinaison déjà existante,
            // on supprime l'ancienne ligne pour éviter de laisser un orphelin
            if (validated.id && validated.id !== existingRecord.id) {
                await supabase.from("revenue_budgets").delete().eq("id", validated.id);
            }
        }
        // SCÉNARIO B : Modification d'une ligne existante sans conflit de combinaison
        else if (validated.id) {
            const { error: updateError } = await supabase
                .from("revenue_budgets")
                .update({
                    shop_id: validated.shopId,
                    segment: validated.segment,
                    month: validated.month,
                    year: validated.year,
                    target_amount: validated.targetAmount,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", validated.id);

            if (updateError) throw new Error(updateError.message);
        }
        // SCÉNARIO C : Création pure d'un tout nouveau budget
        else {
            const payload: RevenueBudgetInsert = {
                shop_id: validated.shopId,
                segment: validated.segment,
                month: validated.month,
                year: validated.year,
                target_amount: validated.targetAmount,
                created_by: userId,
                updated_at: new Date().toISOString(),
            };

            const { error: insertError } = await supabase
                .from("revenue_budgets")
                .insert(payload);

            if (insertError) throw new Error(insertError.message);
        }

        // Revalidation des caches Next.js
        revalidatePath("/revenue");
        revalidatePath("/revenue/budgets");

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "Une erreur est survenue." };
    }
}

export async function deleteBudgetAction(id: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("revenue_budgets")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message);

        revalidatePath("/revenue");
        revalidatePath("/revenue/budgets");

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "Erreur de suppression." };
    }
}