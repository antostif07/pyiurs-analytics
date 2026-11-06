import { AttendanceRow, BonusRow, DebtRow, EmployeeRow } from "@/lib/supabase/types";

export const PAYROLL_BASIS = 26;
export const WORK_HOURS = 8;

export interface PenaltyDayDetail {
  date: string;
  status: string;
  checkIn?: string | null;
  penaltyType: "late" | "absence" | "sick" | "leave" | "tele_travail";
  amountDeducted: number;
  transportDeducted: boolean;
  reason: string;
}

export interface PayrollRowCalculation {
  baseSalary: number;
  salaryDeductions: number;
  absenceDeductions: number;
  lateDeductions: number;
  transportAllowance: number;
  transportPenaltyDays: number;
  transportEligibleDays: number;
  netTransport: number;
  totalBonuses: number;
  totalDebtRemaining: number;
  netBeforeDebt: number;
  workedDaysCount: number;
  penaltyBreakdown: PenaltyDayDetail[];
}

export function calculatePayrollRow(
  emp: Pick<EmployeeRow, "id" | "base_salary" | "transport_allowance">,
  attendances: Pick<AttendanceRow, "date" | "status" | "validated_status" | "check_in">[] = [],
  bonuses: Pick<BonusRow, "amount">[] = [],
  debts: Pick<DebtRow, "remaining_amount" | "status">[] = []
): PayrollRowCalculation {
  const baseSalary = Number(emp.base_salary) || 0;
  const transportAllowance = Number(emp.transport_allowance) || 0;
  const dailyRate = baseSalary / PAYROLL_BASIS;
  const hourlyRate = dailyRate / WORK_HOURS;

  const totalBonuses = bonuses.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalDebtRemaining = debts
    .filter((d) => d.status === "active")
    .reduce((acc, d) => acc + (Number(d.remaining_amount) || 0), 0);

  // 1. CAS ZÉRO POINTAGE
  if (!attendances || attendances.length === 0) {
    return {
      baseSalary: Number(baseSalary.toFixed(2)),
      salaryDeductions: Number(baseSalary.toFixed(2)),
      absenceDeductions: Number(baseSalary.toFixed(2)),
      lateDeductions: 0,
      transportAllowance: Number(transportAllowance.toFixed(2)),
      transportPenaltyDays: PAYROLL_BASIS,
      transportEligibleDays: 0,
      netTransport: 0,
      totalBonuses: Number(totalBonuses.toFixed(2)),
      totalDebtRemaining: Number(totalDebtRemaining.toFixed(2)),
      netBeforeDebt: Number(totalBonuses.toFixed(2)),
      workedDaysCount: 0,
      penaltyBreakdown: [
        {
          date: "Mois complet",
          status: "absent",
          penaltyType: "absence",
          amountDeducted: baseSalary,
          transportDeducted: true,
          reason: "Aucun pointage enregistré pour le mois (26j non prestés)",
        },
      ],
    };
  }

  // 2. CAS AVEC POINTAGES
  let absenceDeductions = 0;
  let lateDeductions = 0;
  let transportPenaltyDays = 0;
  let workedDaysCount = 0;
  const penaltyBreakdown: PenaltyDayDetail[] = [];

  const processedDates = new Set<string>();

  attendances.forEach((log) => {
    if (!log.date) return;

    const logDate = new Date(log.date);
    if (logDate.getUTCDay() === 0 || logDate.getDay() === 0) return;

    const dateKey = log.date.split("T")[0];
    if (processedDates.has(dateKey)) return;
    processedDates.add(dateKey);

    // ✅ Priorité au statut validé, sinon fallback sur le statut brut
    const isAutoDetected = log.validated_status == null;
    const status = log.validated_status ?? log.status;

    // A. Présence normale ou Télétravail
    if (status === "present" || status === "tele_travail") {
      workedDaysCount += 1;

      if (status === "tele_travail") {
        // Salaire 100% maintenu, mais pas de transport
        transportPenaltyDays += 1;
        penaltyBreakdown.push({
          date: dateKey,
          status: "tele_travail",
          amountDeducted: 0,
          transportDeducted: true,
          penaltyType: "tele_travail",
          reason: "Télétravail (salaire maintenu, transport non dû)",
        });
      } else if (isAutoDetected && log.check_in) {
        // ✅ Détection auto du retard UNIQUEMENT si le manager n'a pas validé
        //    (sinon sa décision "present" prime → aucune pénalité)
        const hour = parseInt(String(log.check_in).split(":")[0], 10);
        if (hour >= 9) {
          const hoursPenalty = hour - 8;
          const penaltyAmount = Number((hoursPenalty * hourlyRate).toFixed(2));
          lateDeductions += penaltyAmount;

          penaltyBreakdown.push({
            date: dateKey,
            status: "late",
            checkIn: String(log.check_in).substring(0, 5),
            penaltyType: "late",
            amountDeducted: penaltyAmount,
            transportDeducted: false,
            reason: `Arrivée à ${String(log.check_in).substring(0, 5)} (${hoursPenalty}h de pénalité, non validée manager)`,
          });
        }
      }
    }
    // B. Retard validé
    else if (status === "late") {
      workedDaysCount += 1;
      if (log.check_in) {
        const hour = parseInt(String(log.check_in).split(":")[0], 10);
        if (hour >= 9) {
          const hoursPenalty = hour - 8;
          const penaltyAmount = Number((hoursPenalty * hourlyRate).toFixed(2));
          lateDeductions += penaltyAmount;

          penaltyBreakdown.push({
            date: dateKey,
            status: "late",
            checkIn: String(log.check_in).substring(0, 5),
            penaltyType: "late",
            amountDeducted: penaltyAmount,
            transportDeducted: false,
            reason: `Arrivée à ${String(log.check_in).substring(0, 5)} (${hoursPenalty}h de pénalité, validée manager)`,
          });
        }
      }
    }
    // C. Congé non circonstanciel
    else if (status === "conge_non_circonstanciel") {
      const penaltyAmount = Number((dailyRate * 0.30).toFixed(2));
      absenceDeductions += penaltyAmount;
      transportPenaltyDays += 1;

      penaltyBreakdown.push({
        date: dateKey,
        status,
        penaltyType: "leave",
        amountDeducted: penaltyAmount,
        transportDeducted: true,
        reason: "Congé non circonstanciel (30% déduit)",
      });
    }
    // D. Maladie
    else if (status === "sick") {
      const penaltyAmount = Number((dailyRate * 0.70).toFixed(2));
      absenceDeductions += penaltyAmount;
      transportPenaltyDays += 1;

      penaltyBreakdown.push({
        date: dateKey,
        status,
        penaltyType: "sick",
        amountDeducted: penaltyAmount,
        transportDeducted: true,
        reason: "Arrêt maladie (70% déduit)",
      });
    }
    // E. Congé circonstanciel
    else if (status === "conge_circonstanciel") {
      transportPenaltyDays += 1;
      penaltyBreakdown.push({
        date: dateKey,
        status,
        penaltyType: "leave",
        amountDeducted: 0,
        transportDeducted: true,
        reason: "Congé circonstanciel (Salaire maintenu, transport déduit)",
      });
    }
    // F. Absence / Suspension
    else if (status === "absent" || status === "suspension") {
      const penaltyAmount = Number(dailyRate.toFixed(2));
      absenceDeductions += penaltyAmount;
      transportPenaltyDays += 1;

      penaltyBreakdown.push({
        date: dateKey,
        status,
        penaltyType: "absence",
        amountDeducted: penaltyAmount,
        transportDeducted: true,
        reason: status === "suspension" ? "Suspension disciplinaire" : "Absence injustifiée (100% déduit)",
      });
    }
  });

  const totalDeductions = Math.min(baseSalary, Number((absenceDeductions + lateDeductions).toFixed(2)));
  const transportEligibleDays = Math.max(0, PAYROLL_BASIS - transportPenaltyDays);
  const netTransport = (transportAllowance / PAYROLL_BASIS) * transportEligibleDays;
  const netBeforeDebt = Math.max(0, baseSalary - totalDeductions + netTransport + totalBonuses);

  return {
    baseSalary: Number(baseSalary.toFixed(2)),
    salaryDeductions: totalDeductions,
    absenceDeductions: Number(absenceDeductions.toFixed(2)),
    lateDeductions: Number(lateDeductions.toFixed(2)),
    transportAllowance: Number(transportAllowance.toFixed(2)),
    transportPenaltyDays,
    transportEligibleDays,
    netTransport: Number(netTransport.toFixed(2)),
    totalBonuses: Number(totalBonuses.toFixed(2)),
    totalDebtRemaining: Number(totalDebtRemaining.toFixed(2)),
    netBeforeDebt: Number(netBeforeDebt.toFixed(2)),
    workedDaysCount,
    penaltyBreakdown,
  };
}