"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ✅ Import officiel du moteur de calcul
import {
    calculatePayrollRow,
    PAYROLL_BASIS,
    PayrollRowCalculation,
} from "../payroll-engine";
import { EmployeeRow, PayslipRow, ShopRow } from "@/lib/supabase/types";

export type PayslipWithDetails = PayslipRow & {
    employees: Pick<
        EmployeeRow,
        "id" | "name" | "matricule" | "job_title" | "department" | "shop_id" | "base_salary" | "transport_allowance"
    > & {
        shops: Pick<ShopRow, "id" | "name"> | null;
    };
};

/**
 * 1. Récupère la préparation de paie du mois sélectionné
 */
export async function getPayrollPreparationData(month: number, year: number, shopId?: string) {
    const supabase = await createClient();

    // A. Requête sur payslips avec jointure obligatoire sur employees.is_active = true
    let payslipQuery = supabase
        .from("payslips")
        .select(`
      *,
      employees!inner (
        id,
        name,
        matricule,
        job_title,
        department,
        shop_id,
        base_salary,
        transport_allowance,
        is_active,
        shops (
          id,
          name
        )
      )
    `)
        .eq("month", month)
        .eq("year", year)
        .eq("employees.is_active", true); // ✅ FILTRE STRICT : UNIQUEMENT LES EMPLOYÉS ACTIFS

    // Filtrage par boutique si spécifié
    if (shopId && shopId !== "all") {
        payslipQuery = payslipQuery.eq("employees.shop_id", shopId);
    }

    const { data: payslips, error: payslipsError } = await payslipQuery
        .order("gross_salary", { ascending: false });

    if (payslipsError) {
        console.error("Erreur récupération fiches de paie:", payslipsError.message);
    }

    // B. Recherche du lot associé
    let batchQuery = supabase
        .from("payslip_batches")
        .select("*")
        .eq("month", month)
        .eq("year", year);

    if (shopId && shopId !== "all") {
        batchQuery = batchQuery.eq("shop_id", shopId);
    }

    const { data: batch } = await batchQuery.maybeSingle();

    return {
        batch: batch || null,
        payslips: (payslips as unknown as PayslipWithDetails[]) || [],
    };
}

/**
 * 2. Génération / Recalcul avec branchement direct sur calculatePayrollRow (Zéro N+1 & Zéro Null Error)
 */
export async function generateOrRecalculatePayrollBatch(month: number, year: number, shopId?: string) {
    const supabase = await createClient();
    const targetShopId = shopId && shopId !== "all" ? shopId : null;

    // A. Créer ou récupérer le lot
    let batchQuery = supabase
        .from("payslip_batches")
        .select("*")
        .eq("month", month)
        .eq("year", year);

    if (targetShopId) {
        batchQuery = batchQuery.eq("shop_id", targetShopId);
    } else {
        batchQuery = batchQuery.is("shop_id", null);
    }

    let { data: batch } = await batchQuery.maybeSingle();

    if (!batch) {
        const batchName = `Paie ${String(month).padStart(2, "0")}/${year}${targetShopId ? " (Boutique)" : " (Consolidée)"}`;
        const { data: newBatch, error: createBatchError } = await supabase
            .from("payslip_batches")
            .insert([
                {
                    name: batchName,
                    month,
                    year,
                    shop_id: targetShopId,
                    status: "draft",
                },
            ])
            .select()
            .single();

        if (createBatchError) throw createBatchError;
        batch = newBatch;
    }

    if (batch.status === "validated" || batch.status === "paid") {
        throw new Error("Ce lot de paie est déjà validé et clôturé.");
    }

    // B. ✅ Récupérer STRICTEMENT les agents actifs
    let empQuery = supabase
        .from("employees")
        .select("id, name, matricule, base_salary, transport_allowance, salary_currency, shop_id")
        .eq("is_active", true); // ✅ Exclusion de tout agent inactif/démissionnaire

    if (targetShopId) {
        empQuery = empQuery.eq("shop_id", targetShopId);
    }

    const { data: employees, error: empError } = await empQuery;
    if (empError || !employees || employees.length === 0) {
        throw new Error("Aucun agent actif trouvé pour cette sélection.");
    }

    const employeeIds = employees.map((e) => e.id);

    // Bornes de dates (Timezone-safe)
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // C. Récupérations en batch pour les employés actifs uniquement
    const [attendancesRes, bonusesRes, debtsRes] = await Promise.all([
        supabase
            .from("attendances")
            .select("employee_id, date, status, validated_status, check_in")
            .in("employee_id", employeeIds)
            .gte("date", startDate)
            .lte("date", endDate),

        supabase
            .from("employee_bonuses")
            .select("employee_id, amount")
            .in("employee_id", employeeIds)
            .eq("month", month)
            .eq("year", year),

        supabase
            .from("employee_debts")
            .select("id, employee_id, remaining_amount, status")
            .in("employee_id", employeeIds)
            .eq("status", "active"),
    ]);

    // Indexation mémoire
    const attendancesMap = new Map<string, any[]>();
    (attendancesRes.data || []).forEach((att) => {
        if (!att.employee_id) return;
        const list = attendancesMap.get(att.employee_id) || [];
        list.push(att);
        attendancesMap.set(att.employee_id, list);
    });

    const bonusesMap = new Map<string, any[]>();
    (bonusesRes.data || []).forEach((b) => {
        if (!b.employee_id) return;
        const list = bonusesMap.get(b.employee_id) || [];
        list.push(b);
        bonusesMap.set(b.employee_id, list);
    });

    const debtsMap = new Map<string, any[]>();
    (debtsRes.data || []).forEach((d) => {
        if (!d.employee_id) return;
        const list = debtsMap.get(d.employee_id) || [];
        list.push(d);
        debtsMap.set(d.employee_id, list);
    });

    // D. Calcul pour chaque employé actif
    const payslipsPayload = [];

    for (const emp of employees) {
        const empAttendances = attendancesMap.get(emp.id) || [];
        const empBonuses = bonusesMap.get(emp.id) || [];
        const empDebts = debtsMap.get(emp.id) || [];

        const calc = calculatePayrollRow(
            {
                id: emp.id,
                base_salary: emp.base_salary,
                transport_allowance: emp.transport_allowance,
            },
            empAttendances,
            empBonuses,
            empDebts
        );

        const maxDebtDeductible = calc.baseSalary * 0.30;
        const debtRepayment = Number(Math.min(calc.totalDebtRemaining, maxDebtDeductible).toFixed(2));
        const finalNetPayable = Number((calc.netBeforeDebt - debtRepayment).toFixed(2));
        const grossSalary = Number((calc.baseSalary + calc.netTransport + calc.totalBonuses).toFixed(2));

        payslipsPayload.push({
            batch_id: batch.id,
            employee_id: emp.id,
            month,
            year,
            base_salary: calc.baseSalary,
            transport_allowance: calc.netTransport,
            performance_bonus: calc.totalBonuses,
            deductions_absences: calc.salaryDeductions, // Total déduit comptablement
            advance_repayments: debtRepayment,
            gross_salary: grossSalary,
            net_payable: finalNetPayable,
            status: "draft",
            currency: (emp as any).salary_currency || "USD",
            // ✅ Stockage structuré des déductions distinctes et de l'historique des jours
            note: JSON.stringify({
                absenceDeductions: calc.absenceDeductions,
                lateDeductions: calc.lateDeductions,
                penalties: calc.penaltyBreakdown,
            }),
            updated_at: new Date().toISOString(),
        });
    }

    // E. Enregistrement des fiches des actifs
    if (payslipsPayload.length > 0) {
        const { error: upsertError } = await supabase
            .from("payslips")
            .upsert(payslipsPayload, { onConflict: "employee_id,month,year" });

        if (upsertError) {
            throw new Error(`Échec de l'enregistrement de la paie: ${upsertError.message}`);
        }
    }

    revalidatePath("/hr/payroll/preparation");
    revalidatePath("/hr/payroll");
    return { success: true, batchId: batch.id, processedCount: payslipsPayload.length };
}

/**
 * 3. Mise à jour manuelle d'un bulletin avant validation
 */
export async function updateSinglePayslip(
    payslipId: string,
    payload: {
        performance_bonus?: number;
        other_bonuses?: number;
        advance_repayments?: number;
        note?: string;
    }
) {
    const supabase = await createClient();

    const { data: current, error: fetchErr } = await supabase
        .from("payslips")
        .select("base_salary, transport_allowance, deductions_absences, status")
        .eq("id", payslipId)
        .single();

    if (fetchErr || !current) throw new Error("Fiche de paie introuvable.");
    if (current.status === "validated" || current.status === "paid") {
        throw new Error("Bulletin verrouillé : modification interdite.");
    }

    const base = Number(current.base_salary);
    const transport = Number(current.transport_allowance);
    const absence = Number(current.deductions_absences);
    const bonus = payload.performance_bonus !== undefined ? Number(payload.performance_bonus) : 0;
    const otherBonus = payload.other_bonuses !== undefined ? Number(payload.other_bonuses) : 0;
    const debt = payload.advance_repayments !== undefined ? Number(payload.advance_repayments) : 0;

    const gross = Number((base + transport + bonus + otherBonus).toFixed(2));
    const net = Number((gross - absence - debt).toFixed(2));

    const { error } = await supabase
        .from("payslips")
        .update({
            performance_bonus: bonus,
            other_bonuses: otherBonus,
            advance_repayments: debt,
            gross_salary: gross,
            net_payable: net,
            note: payload.note,
            updated_at: new Date().toISOString(),
        })
        .eq("id", payslipId);

    if (error) throw error;
    revalidatePath("/hr/payroll/preparation");
    revalidatePath("/hr/payroll");
    return { success: true };
}

/**
 * 4. Clôture Définitive du Lot : Verrouillage & Journalisation au Grand Livre
 */
export async function lockAndValidatePayrollBatch(batchId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // A. Vérification du lot
    const { data: batch, error: bErr } = await supabase
        .from("payslip_batches")
        .select("*")
        .eq("id", batchId)
        .single();

    if (bErr || !batch) throw new Error("Lot introuvable.");

    // B. Fiches du lot avec retenue sur avance
    const { data: payslips } = await supabase
        .from("payslips")
        .select("id, employee_id, advance_repayments")
        .eq("batch_id", batchId);

    // C. Décrémenter les dettes et inscrire au journal employee_debt_transactions
    for (const slip of payslips || []) {
        const repayment = Number(slip.advance_repayments || 0);
        // ✅ Garde contre employee_id null
        if (repayment > 0 && slip.employee_id) {
            const { data: activeDebt } = await supabase
                .from("employee_debts")
                .select("id, remaining_amount")
                .eq("employee_id", slip.employee_id)
                .eq("status", "active")
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (activeDebt) {
                const newRemaining = Math.max(0, Number(activeDebt.remaining_amount) - repayment);

                // 1. Mise à jour de la dette
                await supabase
                    .from("employee_debts")
                    .update({
                        remaining_amount: newRemaining,
                        status: newRemaining <= 0 ? "cleared" : "active",
                    })
                    .eq("id", activeDebt.id);

                // 2. Écriture comptable au grand livre d'audit
                await supabase.from("employee_debt_transactions").insert([
                    {
                        debt_id: activeDebt.id,
                        payslip_id: slip.id,
                        transaction_type: "repayment_payroll",
                        amount: repayment,
                        notes: `Retenue automatique sur bulletin de paie ${batch.month}/${batch.year}`,
                        created_by: user?.id || null,
                    },
                ]);
            }
        }
    }

    // D. Verrouiller les fiches de paie
    await supabase
        .from("payslips")
        .update({ status: "validated", updated_at: new Date().toISOString() })
        .eq("batch_id", batchId);

    // E. Clôturer le lot
    await supabase
        .from("payslip_batches")
        .update({ status: "validated" })
        .eq("id", batchId);

    revalidatePath("/hr/payroll/preparation");
    revalidatePath("/hr/payroll");
    return { success: true };
}