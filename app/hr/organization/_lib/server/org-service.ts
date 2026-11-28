import { createClient } from "@/lib/supabase/server";

export interface OrgEmployeeNode {
    id: string;
    name: string;
    matricule: string | null;
    email: string | null;
    shopId: string | null;
    shopName: string | null;
    departmentId: string | null;
    departmentName: string | null;
    jobTitleId: string | null;
    jobTitle: string | null;
    hierarchyLevel: number;
    isDepartmentHead: boolean;
    explicitManagerId: string | null;
    resolvedManagerId: string | null;
    linkSource: "explicit" | "position" | "dept_head" | "parent_dept" | "root";
    children: OrgEmployeeNode[];
}

export interface OrgStructureData {
    roots: OrgEmployeeNode[];
    totalEmployees: number;
    explicitLinks: number;
    inferredLinks: number;
    departments: Array<{
        id: string;
        name: string;
        parentDepartmentId: string | null;
        hierarchyLevel: number;
    }>;
    positions: Array<{
        id: string;
        title: string;
        departmentId: string | null;
        parentJobTitleId: string | null;
        hierarchyLevel: number;
        isDepartmentHead: boolean;
    }>;
    shops: Array<{ id: string; name: string }>;
}

export async function fetchOrganizationData(): Promise<OrgStructureData> {
    const supabase = await createClient();

    const [empRes, deptRes, posRes, shopRes] = await Promise.all([
        (supabase as any)
            .from("employees")
            .select(
                "id, name, matricule, email, shop_id, department_id, job_title_id, department, job_title, manager_id, shops(name)",
            )
            .neq("is_active", false)
            .order("name", { ascending: true }),
        (supabase as any)
            .from("hr_departments")
            .select("id, name, parent_department_id, hierarchy_level")
            .eq("is_active", true)
            .order("hierarchy_level", { ascending: true }),
        (supabase as any)
            .from("hr_job_titles")
            .select("id, title, department_id, parent_job_title_id, hierarchy_level, is_department_head")
            .eq("is_active", true)
            .order("hierarchy_level", { ascending: true }),
        supabase.from("shops").select("id, name").order("name"),
    ]);

    const rawEmps = (empRes.data ?? []) as Array<{
        id: string;
        name: string;
        matricule: string | null;
        email: string | null;
        shop_id: string | null;
        department_id: string | null;
        job_title_id: string | null;
        department: string | null;
        job_title: string | null;
        manager_id: string | null;
        shops: { name: string } | { name: string }[] | null;
    }>;

    const departments = (deptRes.data ?? []) as OrgStructureData["departments"];
    const positions = (posRes.data ?? []) as OrgStructureData["positions"];
    const shops = (shopRes.data ?? []).map((s) => ({ id: s.id, name: s.name }));

    const deptById = new Map(departments.map((d) => [d.id, d]));
    const posById = new Map(positions.map((p) => [p.id, p]));

    const nodeMap = new Map<string, OrgEmployeeNode>();
    for (const e of rawEmps) {
        const dept = e.department_id ? deptById.get(e.department_id) : undefined;
        const pos = e.job_title_id ? posById.get(e.job_title_id) : undefined;
        const shopObj = Array.isArray(e.shops) ? e.shops[0] : e.shops;

        nodeMap.set(e.id, {
            id: e.id,
            name: e.name,
            matricule: e.matricule,
            email: e.email,
            shopId: e.shop_id,
            shopName: shopObj?.name ?? null,
            departmentId: e.department_id,
            departmentName: dept?.name ?? e.department ?? null,
            jobTitleId: e.job_title_id,
            jobTitle: pos?.title ?? e.job_title ?? null,
            hierarchyLevel: pos?.hierarchyLevel ?? dept?.hierarchyLevel ?? 99,
            isDepartmentHead: Boolean(pos?.isDepartmentHead),
            explicitManagerId: e.manager_id,
            resolvedManagerId: null,
            linkSource: "root",
            children: [],
        });
    }

    const allNodes = Array.from(nodeMap.values());

    // Résolution N+1 : explicite > parent_job_title_id > chef de département > département parent
    let explicitLinks = 0;
    let inferredLinks = 0;

    for (const node of allNodes) {
        if (node.explicitManagerId && node.explicitManagerId !== node.id && nodeMap.has(node.explicitManagerId)) {
            node.resolvedManagerId = node.explicitManagerId;
            node.linkSource = "explicit";
            explicitLinks += 1;
            continue;
        }

        const pos = node.jobTitleId ? posById.get(node.jobTitleId) : undefined;
        let foundManager: OrgEmployeeNode | undefined;
        let source: OrgEmployeeNode["linkSource"] = "root";

        // 1. Via parent_job_title_id (priorité même boutique/département, puis global)
        if (pos?.parentJobTitleId) {
            const parentPosId = pos.parentJobTitleId;
            foundManager =
                allNodes.find(
                    (c) =>
                        c.id !== node.id &&
                        c.jobTitleId === parentPosId &&
                        c.shopId === node.shopId &&
                        c.departmentId === node.departmentId,
                ) ??
                allNodes.find(
                    (c) =>
                        c.id !== node.id &&
                        c.jobTitleId === parentPosId &&
                        c.departmentId === node.departmentId,
                ) ??
                allNodes.find((c) => c.id !== node.id && c.jobTitleId === parentPosId);
            if (foundManager) source = "position";
        }

        // 2. Via Chef du même département (si ce n'est pas lui-même un chef)
        if (!foundManager && node.departmentId && !node.isDepartmentHead) {
            foundManager =
                allNodes.find(
                    (c) =>
                        c.id !== node.id &&
                        c.departmentId === node.departmentId &&
                        c.shopId === node.shopId &&
                        c.isDepartmentHead,
                ) ??
                allNodes.find(
                    (c) =>
                        c.id !== node.id &&
                        c.departmentId === node.departmentId &&
                        c.isDepartmentHead,
                );
            if (foundManager) source = "dept_head";
        }

        // 3. Via Chef du département parent
        if (!foundManager && node.departmentId) {
            const dept = deptById.get(node.departmentId);
            if (dept?.parentDepartmentId) {
                const parentDeptId = dept.parentDepartmentId;
                foundManager =
                    allNodes.find(
                        (c) =>
                            c.id !== node.id &&
                            c.departmentId === parentDeptId &&
                            c.isDepartmentHead,
                    ) ??
                    allNodes
                        .filter((c) => c.id !== node.id && c.departmentId === parentDeptId)
                        .sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)[0];
                if (foundManager) source = "parent_dept";
            }
        }

        if (foundManager) {
            node.resolvedManagerId = foundManager.id;
            node.linkSource = source;
            inferredLinks += 1;
        }
    }

    // Construction de l'arbre sans risque de cycle
    const createsCycle = (childId: string, managerId: string): boolean => {
        let cur: string | null = managerId;
        const visited = new Set<string>([childId]);
        while (cur) {
            if (visited.has(cur)) return true;
            visited.add(cur);
            cur = nodeMap.get(cur)?.resolvedManagerId ?? null;
        }
        return false;
    };

    const roots: OrgEmployeeNode[] = [];
    for (const node of allNodes) {
        if (node.resolvedManagerId && !createsCycle(node.id, node.resolvedManagerId)) {
            nodeMap.get(node.resolvedManagerId)!.children.push(node);
        } else {
            node.resolvedManagerId = null;
            node.linkSource = "root";
            roots.push(node);
        }
    }

    const sortTree = (nodes: OrgEmployeeNode[]) => {
        nodes.sort(
            (a, b) =>
                a.hierarchyLevel - b.hierarchyLevel || a.name.localeCompare(b.name),
        );
        for (const n of nodes) sortTree(n.children);
    };
    sortTree(roots);

    return {
        roots,
        totalEmployees: allNodes.length,
        explicitLinks,
        inferredLinks,
        departments,
        positions,
        shops,
    };
}