import { createClient, getServerAuth } from "@/lib/supabase/server";
import type {
    HrDepartmentItem,
    HrDepartmentsData,
    HrJobTitleItem,
} from "../types";

export async function requireHrAdmin() {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile || auth.profile.role !== "admin") {
        return { ok: false as const, status: 403, error: "Réservé à l'administrateur" };
    }
    return { ok: true as const, user: auth.user, profile: auth.profile };
}

export async function fetchDepartmentsAndPositions(): Promise<HrDepartmentsData> {
    const supabase = await createClient();

    const [deptRes, posRes, empRes] = await Promise.all([
        (supabase as any)
            .from("hr_departments")
            .select("id, name, description, parent_department_id, hierarchy_level, is_active")
            .order("hierarchy_level", { ascending: true })
            .order("name", { ascending: true }),
        (supabase as any)
            .from("hr_job_titles")
            .select(
                "id, department_id, parent_job_title_id, hierarchy_level, is_department_head, title, default_base_salary, currency, is_active",
            )
            .order("hierarchy_level", { ascending: true })
            .order("title", { ascending: true }),
        (supabase as any)
            .from("employees")
            .select("id, department_id, job_title_id, department, job_title, is_active")
            .neq("is_active", false),
    ]);

    const rawDepts = (deptRes.data ?? []) as Array<{
        id: string;
        name: string;
        description: string | null;
        parent_department_id: string | null;
        hierarchy_level: number;
        is_active: boolean;
    }>;
    const rawPos = (posRes.data ?? []) as Array<{
        id: string;
        department_id: string | null;
        parent_job_title_id: string | null;
        hierarchy_level: number;
        is_department_head: boolean;
        title: string;
        default_base_salary: number;
        currency: "USD" | "CDF";
        is_active: boolean;
    }>;
    const rawEmps = (empRes.data ?? []) as Array<{
        id: string;
        department_id: string | null;
        job_title_id: string | null;
        department: string | null;
        job_title: string | null;
    }>;

    const deptCountById = new Map<string, number>();
    const posCountById = new Map<string, number>();
    let assignedEmployees = 0;
    let unassignedEmployees = 0;

    for (const e of rawEmps) {
        if (e.department_id) {
            deptCountById.set(e.department_id, (deptCountById.get(e.department_id) ?? 0) + 1);
        }
        if (e.job_title_id) {
            posCountById.set(e.job_title_id, (posCountById.get(e.job_title_id) ?? 0) + 1);
        }
        if (e.department_id && e.job_title_id) assignedEmployees += 1;
        else unassignedEmployees += 1;
    }

    const deptNameById = new Map(rawDepts.map((d) => [d.id, d.name]));
    const posTitleById = new Map(rawPos.map((p) => [p.id, p.title]));
    const posCountByDeptId = new Map<string, number>();

    for (const p of rawPos) {
        if (p.department_id) {
            posCountByDeptId.set(p.department_id, (posCountByDeptId.get(p.department_id) ?? 0) + 1);
        }
    }

    const departments: HrDepartmentItem[] = rawDepts.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? null,
        parentDepartmentId: d.parent_department_id ?? null,
        parentDepartmentName: d.parent_department_id
            ? (deptNameById.get(d.parent_department_id) ?? null)
            : null,
        hierarchyLevel: Number(d.hierarchy_level ?? 1),
        isActive: d.is_active ?? true,
        employeeCount: deptCountById.get(d.id) ?? 0,
        positionsCount: posCountByDeptId.get(d.id) ?? 0,
    }));

    const positions: HrJobTitleItem[] = rawPos.map((p) => ({
        id: p.id,
        departmentId: p.department_id,
        departmentName: p.department_id ? (deptNameById.get(p.department_id) ?? null) : null,
        parentJobTitleId: p.parent_job_title_id ?? null,
        parentJobTitleName: p.parent_job_title_id
            ? (posTitleById.get(p.parent_job_title_id) ?? null)
            : null,
        hierarchyLevel: Number(p.hierarchy_level ?? 1),
        isDepartmentHead: Boolean(p.is_department_head),
        title: p.title,
        defaultBaseSalary: Number(p.default_base_salary ?? 0),
        currency: p.currency === "CDF" ? "CDF" : "USD",
        isActive: p.is_active ?? true,
        employeeCount: posCountById.get(p.id) ?? 0,
    }));

    return {
        departments,
        positions,
        kpis: {
            totalDepartments: departments.length,
            totalPositions: positions.length,
            assignedEmployees,
            unassignedEmployees,
        },
    };
}