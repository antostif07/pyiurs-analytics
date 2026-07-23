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

export async function upsertBudgetAction(input: BudgetInput) {
    try {
        const validated = budgetSchema.parse(input);
        const supabase = await createClient();

        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id || null;

        const payload: RevenueBudgetInsert = {
            ...(validated.id ? { id: validated.id } : {}),
            month: validated.month,
            year: validated.year,
            shop_id: validated.shopId,
            segment: validated.segment,
            target_amount: validated.targetAmount,
            created_by: userId,
            updated_at: new Date().toISOString(),
        };

        // ✅ Match exact avec la contrainte SQL UNIQUE (shop_id, segment, month, year)
        const { error } = await supabase
            .from("revenue_budgets")
            .upsert(payload, {
                onConflict: "shop_id,segment,month,year"
            });

        if (error) {
            throw new Error(`Erreur d'enregistrement Supabase: ${error.message}`);
        }

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