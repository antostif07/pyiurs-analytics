export interface HrDepartmentItem {
    id: string;
    name: string;
    description: string | null;
    parentDepartmentId: string | null;
    parentDepartmentName: string | null;
    hierarchyLevel: number;
    isActive: boolean;
    employeeCount: number;
    positionsCount: number;
}

export interface HrJobTitleItem {
    id: string;
    departmentId: string | null;
    departmentName: string | null;
    parentJobTitleId: string | null;
    parentJobTitleName: string | null;
    hierarchyLevel: number;
    isDepartmentHead: boolean;
    title: string;
    defaultBaseSalary: number;
    currency: "USD" | "CDF";
    isActive: boolean;
    employeeCount: number;
}

export interface HrDepartmentsData {
    departments: HrDepartmentItem[];
    positions: HrJobTitleItem[];
    kpis: {
        totalDepartments: number;
        totalPositions: number;
        assignedEmployees: number;
        unassignedEmployees: number;
    };
}