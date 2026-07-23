'use server';

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { BudgetInput, budgetSchema } from "@/lib/validations/budget";
import { Database } from "@/lib/supabase/database.types";

export type RevenueBudgetInsert = Database["public"]["Tables"]["revenue_budgets"]["Insert"];

/**
 * Récupère les budgets configurés pour un mois et une année spécifiques
 */
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
 * Enregistre (Création ou Mise à jour) un budget mensuel
 */
export async function upsertBudgetAction(input: BudgetInput) {
    try {
        const validated = budgetSchema.parse(input);
        const supabase = await createClient();

        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id || null;

        // ✅ 1. MODE ÉDITION : Si un ID existe, on fait un UPDATE direct par PKEY
        if (validated.id) {
            const { error } = await supabase
                .from("revenue_budgets")
                .update({
                    month: validated.month,
                    year: validated.year,
                    shop_id: validated.shopId,
                    segment: validated.segment,
                    target_amount: validated.targetAmount,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", validated.id);

            if (error) {
                throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
            }
        }
        // ✅ 2. MODE CRÉATION : Si aucun ID n'est fourni, on fait un UPSERT sur la clé composée
        else {
            const payload: RevenueBudgetInsert = {
                month: validated.month,
                year: validated.year,
                shop_id: validated.shopId,
                segment: validated.segment,
                target_amount: validated.targetAmount,
                created_by: userId,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from("revenue_budgets")
                .upsert(payload, {
                    onConflict: "shop_id,segment,month,year"
                });

            if (error) {
                throw new Error(`Erreur lors de la création: ${error.message}`);
            }
        }

        // Revalidation des caches Next.js
        revalidatePath("/revenue");
        revalidatePath("/revenue/budgets");

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || "Une erreur est survenue." };
    }
}

/**
 * Supprime un budget configuré par son ID
 */
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