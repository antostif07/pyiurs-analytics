"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BonusRow, DebtRow, EmployeeRow, ShopRow } from "@/lib/supabase/types";

export type BonusWithEmployee = BonusRow & {
    employees: Pick<EmployeeRow, "id" | "name" | "matricule" | "job_title" | "shop_id"> & {
        shops: Pick<ShopRow, "id" | "name"> | null;
    };
};

export type DebtWithEmployee = DebtRow & {
    employees: Pick<EmployeeRow, "id" | "name" | "matricule" | "job_title" | "base_salary" | "shop_id"> & {
        shops: Pick<ShopRow, "id" | "name"> | null;
    };
};

/**
 * 1. Récupère les primes du mois et toutes les dettes/avances
 */
export async function getBonusesAndDebtsData(month: number, year: number, shopId?: string) {
    const supabase = await createClient();

    // A. Récupération des primes du mois ciblé
    let bonusQuery = supabase
        .from("employee_bonuses")
        .select(`
      id,
      employee_id,
      month,
      year,
      reason,
      amount,
      created_at,
      employees!inner (
        id,
        name,
        matricule,
        job_title,
        shop_id,
        shops!inner (
          id,
          name
        )
      )
    `)
        .eq("month", month)
        .eq("year", year);

    if (shopId && shopId !== "all") {
        bonusQuery = bonusQuery.eq("employees.shop_id", shopId);
    }

    // B. Récupération de l'ensemble des dettes & avances (actives et soldées)
    let debtQuery = supabase
        .from("employee_debts")
        .select(`
      id,
      employee_id,
      reason,
      initial_amount,
      remaining_amount,
      status,
      created_at,
      employees!inner (
        id,
        name,
        matricule,
        job_title,
        base_salary,
        shop_id,
        shops!inner (
          id,
          name
        )
      )
    `)
        .order("created_at", { ascending: false });

    if (shopId && shopId !== "all") {
        debtQuery = debtQuery.eq("employees.shop_id", shopId);
    }

    const [bonusRes, debtRes] = await Promise.all([
        bonusQuery.order("created_at", { ascending: false }),
        debtQuery,
    ]);

    if (bonusRes.error) console.error("Erreur primes:", bonusRes.error.message);
    if (debtRes.error) console.error("Erreur dettes:", debtRes.error.message);

    return {
        bonuses: (bonusRes.data as unknown as BonusWithEmployee[]) || [],
        debts: (debtRes.data as unknown as DebtWithEmployee[]) || [],
    };
}

/**
 * 2. Créer une nouvelle prime
 */
export async function createEmployeeBonus(payload: {
    employee_id: string;
    month: number;
    year: number;
    reason: string;
    amount: number;
}) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("employee_bonuses")
        .insert([
            {
                employee_id: payload.employee_id,
                month: payload.month,
                year: payload.year,
                reason: payload.reason.trim(),
                amount: Number(payload.amount),
            },
        ])
        .select()
        .single();

    if (error) {
        console.error("Erreur création prime:", error.message);
        throw new Error(`Échec de l'octroi de prime: ${error.message}`);
    }

    revalidatePath("/hr/payroll/bonuses");
    return data;
}

/**
 * 3. Supprimer une prime
 */
export async function deleteEmployeeBonus(bonusId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("employee_bonuses")
        .delete()
        .eq("id", bonusId);

    if (error) {
        throw new Error(`Échec de la suppression: ${error.message}`);
    }

    revalidatePath("/hr/payroll/bonuses");
    return { success: true };
}

/**
 * 4. Créer une nouvelle avance / dette
 */
export async function createEmployeeDebt(payload: {
    employee_id: string;
    reason: string;
    initial_amount: number;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const amount = Number(payload.initial_amount);

    // Insérer la dette
    const { data: debt, error } = await supabase
        .from("employee_debts")
        .insert([
            {
                employee_id: payload.employee_id,
                reason: payload.reason.trim(),
                initial_amount: amount,
                remaining_amount: amount,
                status: "active",
            },
        ])
        .select()
        .single();

    if (error) {
        console.error("Erreur création dette:", error.message);
        throw new Error(`Échec de l'enregistrement de l'avance: ${error.message}`);
    }

    // Tracer l'initialisation dans le journal d'audit des dettes
    await supabase.from("employee_debt_transactions").insert([
        {
            debt_id: debt.id,
            transaction_type: "initial_debt",
            amount: amount,
            notes: `Avance accordée : ${payload.reason}`,
            created_by: user?.id,
        },
    ]);

    revalidatePath("/hr/payroll/bonuses");
    return debt;
}

/**
 * 5. Enregistrer un remboursement manuel direct (Paiement comptant)
 */
export async function recordManualDebtRepayment(payload: {
    debt_id: string;
    amount: number;
    notes?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const repaymentAmount = Number(payload.amount);

    // Récupérer le solde actuel de la dette
    const { data: debt, error: fetchError } = await supabase
        .from("employee_debts")
        .select("id, remaining_amount")
        .eq("id", payload.debt_id)
        .single();

    if (fetchError || !debt) {
        throw new Error("Dette introuvable.");
    }

    const currentRemaining = Number(debt.remaining_amount);
    if (repaymentAmount > currentRemaining) {
        throw new Error(`Le montant remboursé ($${repaymentAmount}) dépasse le solde restant ($${currentRemaining}).`);
    }

    const newRemaining = currentRemaining - repaymentAmount;
    const isCleared = newRemaining <= 0;

    // 1. Mettre à jour la dette
    const { error: updateError } = await supabase
        .from("employee_debts")
        .update({
            remaining_amount: newRemaining,
            status: isCleared ? "cleared" : "active",
        })
        .eq("id", debt.id);

    if (updateError) throw updateError;

    // 2. Journaliser l'opération
    await supabase.from("employee_debt_transactions").insert([
        {
            debt_id: debt.id,
            transaction_type: "manual_repayment",
            amount: repaymentAmount,
            notes: payload.notes || "Remboursement direct en caisse/comptant",
            created_by: user?.id,
        },
    ]);

    revalidatePath("/hr/payroll/bonuses");
    return { success: true, newRemaining, isCleared };
}