// lib/payroll-utils.ts
import { getDay } from "date-fns";

export const PAYROLL_BASIS = 26;
export const HOURS_PER_DAY = 8; // On assume une journée de 8h pour le ratio

export function calculateEmployeePayroll(emp: any, daysInMonth: number, selectedMonth: string, selectedYear: string) {
    const startDate = `${selectedYear}-${selectedMonth}-01`;
    const endDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).toISOString().split('T')[0];

    // Filtrer les attendances pour le mois
    const monthLogs = emp.attendances?.filter((a: any) => a.date >= startDate && a.date <= endDate) || [];

    let totalSalaryDeduction = 0;
    let transportPenaltyDays = 0;

    monthLogs.forEach((log: any) => {
        const isSunday = getDay(new Date(log.date)) === 0;
        if (isSunday) return;

        const status = log.validated_status || log.status;
        const dailyRate = emp.base_salary / PAYROLL_BASIS;
        const hourlyRate = dailyRate / HOURS_PER_DAY;

        // --- LOGIQUE SALAIRE ---
        if (status === 'late' && log.check_in) {
            const hour = parseInt(log.check_in.split(':')[0]);
            if (hour >= 9) {
                const hoursLate = hour - 8; // 09h01 -> 1h, 10h01 -> 2h...
                totalSalaryDeduction += hoursLate * hourlyRate;
            }
        } else if (status === 'sick' || status === 'congé circonstaciel') {
            totalSalaryDeduction += dailyRate * 0.70; // On enlève 70%
        } else if (['absent', 'congé non circonstanciel', 'suspension'].includes(status)) {
            totalSalaryDeduction += dailyRate; // On enlève 100%
        }

        // --- LOGIQUE TRANSPORT ---
        // Seuls absences, malades, congés (circ ou non) sont retenus
        if (['absent', 'sick', 'congé circonstaciel', 'congé non circonstanciel', 'suspension'].includes(status)) {
            transportPenaltyDays += 1;
        }
    });

    const transportEligibleDays = Math.max(0, PAYROLL_BASIS - transportPenaltyDays);
    const netTransport = (emp.transport_allowance / PAYROLL_BASIS) * transportEligibleDays;
    const totalBonuses = emp.employee_bonuses?.filter((b: any) => b.month === parseInt(selectedMonth))
                            .reduce((acc: number, b: any) => acc + b.amount, 0) || 0;

    return {
        penaltyDays: transportPenaltyDays,
        transportEligibleDays,
        netTransport,
        totalSalaryDeduction,
        totalBonuses,
        netSalaryBeforeDebt: (emp.base_salary - totalSalaryDeduction) + netTransport + totalBonuses
    };
}