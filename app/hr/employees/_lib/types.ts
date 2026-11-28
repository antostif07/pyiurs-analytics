export interface EmployeeFolderData {
    employee: {
        id: string;
        name: string;
        matricule: string | null;
        email: string | null;
        servicePhone: string | null;
        privatePhone: string | null;
        address: string | null;
        jobTitle: string | null;
        department: string | null;
        departmentId: string | null;
        jobTitleId: string | null;
        shopId: string | null;
        shopName: string | null;
        managerId: string | null;
        managerName: string | null;
        baseSalary: number;
        transportAllowance: number;
        salaryCurrency: "USD" | "CDF";
        dailyWorkStartTime: string | null;
        isActive: boolean;
        createdAt: string;
    };
    payslips: Array<{
        id: string;
        month: number;
        year: number;
        baseSalary: number;
        commissionsTotal: number;
        deductionsAbsences: number;
        advanceRepayments: number;
        netPayable: number;
        currency: string;
        status: string;
        unexcusedAbsencesCount: number;
        lateDaysCount: number;
    }>;
    debts: Array<{
        id: string;
        reason: string;
        initialAmount: number;
        remainingAmount: number;
        status: string;
        createdAt: string;
    }>;
    attendances: Array<{
        id: string;
        date: string;
        status: string;
        checkIn: string | null;
        checkOut: string | null;
        isLate: boolean;
        arrivalLateMinutes: number;
        observation: string | null;
    }>;
}