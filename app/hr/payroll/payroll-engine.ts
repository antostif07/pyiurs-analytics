// app/hr/payroll/payroll-engine.ts
export const PAYROLL_BASIS = 26;
export const WORK_HOURS = 8;

export function calculatePayrollRow(emp: any, attendances: any[] = [], bonuses: any[] = [], debts: any[] = []) {
  let salaryDeductions = 0;
  let transportPenaltyDays = 0;

  const baseSalary = Number(emp.base_salary) || 0;
  const transportAllowance = Number(emp.transport_allowance) || 0;
  const dailyRate = baseSalary / PAYROLL_BASIS;
  const hourlyRate = dailyRate / WORK_HOURS;

  attendances.forEach((log) => {
    // Exclure les dimanches
    if (new Date(log.date).getDay() === 0) return;

    const status = log.validated_status || log.status;

    // 1. Logique Salaire
    if (status === 'late' && log.check_in) {
      const hour = parseInt(log.check_in.split(':')[0]);
      if (hour >= 9) {
        const hoursPenalty = hour - 8; 
        salaryDeductions += hoursPenalty * hourlyRate;
      }
    } else if (status === 'sick' || status === 'conge_circonstanciel') {
      salaryDeductions += dailyRate * 0.70; // Déduction 70%
      transportPenaltyDays += 1;
    } else if (['absent', 'conge_non_circonstanciel', 'suspension'].includes(status)) {
      salaryDeductions += dailyRate; // Déduction 100%
      transportPenaltyDays += 1;
    }
  });

  const transportEligibleDays = Math.max(0, PAYROLL_BASIS - transportPenaltyDays);
  const netTransport = (transportAllowance / PAYROLL_BASIS) * transportEligibleDays;
  const totalBonuses = (bonuses || []).reduce((acc: number, b: any) => acc + (Number(b.amount) || 0), 0);
  const totalDebtRemaining = (debts || []).reduce((acc: number, d: any) => acc + (Number(d.remaining_amount) || 0), 0);

  const netBeforeDebt = (baseSalary - salaryDeductions) + netTransport + totalBonuses;

  return {
    salaryDeductions: Math.round(salaryDeductions),
    transportPenaltyDays,
    transportEligibleDays,
    netTransport: Math.round(netTransport),
    totalBonuses,
    totalDebtRemaining,
    netBeforeDebt: Math.round(netBeforeDebt),
  };
}