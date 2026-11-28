import { createClient } from "@/lib/supabase/server";
import type { EmployeeFolderData } from "../types";

export async function fetchEmployeeFolder(employeeId: string): Promise<EmployeeFolderData | null> {
    const supabase = await createClient();

    // 1. Informations de l'employé
    const { data: emp, error: empErr } = await (supabase as any)
        .from("employees")
        .select(`
            id, name, matricule, email, service_phone, private_phone, address,
            job_title, department, department_id, job_title_id, shop_id,
            base_salary, transport_allowance, salary_currency, daily_work_start_time,
            is_active, created_at, manager_id,
            shops:shop_id (name),
            manager:manager_id (name)
        `)
        .eq("id", employeeId)
        .maybeSingle();

    if (empErr || !emp) {
        console.error("[EMPLOYEE_FOLDER] Error:", empErr?.message);
        return null;
    }

    // 2. Récupération parallèle : Paies, Dettes et Dernières Présences
    const [payslipsRes, debtsRes, attendancesRes] = await Promise.all([
        supabase
            .from("payslips")
            .select(`
                id, month, year, base_salary, commissions_total, deductions_absences,
                advance_repayments, net_payable, currency, status,
                unexcused_absences_count, late_days_count
            `)
            .eq("employee_id", employeeId)
            .order("year", { ascending: false })
            .order("month", { ascending: false }),

        supabase
            .from("employee_debts")
            .select("id, reason, initial_amount, remaining_amount, status, created_at")
            .eq("employee_id", employeeId)
            .order("created_at", { ascending: false }),

        supabase
            .from("attendances")
            .select("id, date, status, check_in, check_out, is_late, arrival_late_minutes, observation")
            .eq("employee_id", employeeId)
            .order("date", { ascending: false })
            .limit(30),
    ]);

    const shopObj = Array.isArray(emp.shops) ? emp.shops[0] : emp.shops;
    const mgrObj = Array.isArray(emp.manager) ? emp.manager[0] : emp.manager;

    return {
        employee: {
            id: emp.id,
            name: emp.name,
            matricule: emp.matricule,
            email: emp.email,
            servicePhone: emp.service_phone,
            privatePhone: emp.private_phone,
            address: emp.address,
            jobTitle: emp.job_title,
            department: emp.department,
            departmentId: emp.department_id,
            jobTitleId: emp.job_title_id,
            shopId: emp.shop_id,
            shopName: shopObj?.name ?? null,
            managerId: emp.manager_id,
            managerName: mgrObj?.name ?? null,
            baseSalary: Number(emp.base_salary ?? 0),
            transportAllowance: Number(emp.transport_allowance ?? 0),
            salaryCurrency: emp.salary_currency === "CDF" ? "CDF" : "USD",
            dailyWorkStartTime: emp.daily_work_start_time,
            isActive: emp.is_active ?? true,
            createdAt: emp.created_at,
        },
        payslips: (payslipsRes.data ?? []).map((p) => ({
            id: p.id,
            month: p.month,
            year: p.year,
            baseSalary: Number(p.base_salary ?? 0),
            commissionsTotal: Number(p.commissions_total ?? 0),
            deductionsAbsences: Number(p.deductions_absences ?? 0),
            advanceRepayments: Number(p.advance_repayments ?? 0),
            netPayable: Number(p.net_payable ?? 0),
            currency: p.currency ?? "USD",
            status: p.status ?? "draft",
            unexcusedAbsencesCount: p.unexcused_absences_count ?? 0,
            lateDaysCount: p.late_days_count ?? 0,
        })),
        debts: (debtsRes.data ?? []).map((d) => ({
            id: d.id,
            reason: d.reason,
            initialAmount: Number(d.initial_amount ?? 0),
            remainingAmount: Number(d.remaining_amount ?? 0),
            status: d.status ?? "active",
            createdAt: d.created_at!,
        })),
        attendances: (attendancesRes.data ?? []).map((a) => ({
            id: a.id,
            date: a.date,
            status: a.status ?? "present",
            checkIn: a.check_in,
            checkOut: a.check_out,
            isLate: Boolean(a.is_late),
            arrivalLateMinutes: a.arrival_late_minutes ?? 0,
            observation: a.observation,
        })),
    };
}