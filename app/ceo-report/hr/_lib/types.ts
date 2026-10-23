// app/ceo-report/hr/_lib/types.ts

export interface LeasePartialAmount {
    month: string;
    val: number;
}

export interface LeaseRow {
    site: string;
    rent: number;
    paidMonths: number;
    partialAmount: LeasePartialAmount | null;
    totalPaid: number;
}

export interface LeaseTotals {
    rentMonthly: number;
    paidYtd: number;
}

export interface HrRow {
    team: string;
    staff: number;
    baseSalary: number;
    perks: number;
    totalCost: number;
    leaves: number;
}

export interface HrTotals {
    staff: number;
    baseSalary: number;
    perks: number;
    totalCost: number;
    leaves: number;
}

export interface PayrollRow {
    team: string;
    baseSalary: number;
    perks: number;
    total: number;
}

export interface HrKpis {
    activeStaff: number;
    staffInShops: number;
    staffInHQ: number;
    payrollLoaded: number;
    baseSalaryTotal: number;
    perksTotal: number;
    rentPaidYtd: number;
    monthlyRent: number;
    leavesTotal: number;
}

export interface HrResponse {
    kpis: HrKpis;
    payroll: PayrollRow[];
    leases: LeaseRow[];
    leaseTotals: LeaseTotals;
    hr: HrRow[];
    hrTotals: HrTotals;
}