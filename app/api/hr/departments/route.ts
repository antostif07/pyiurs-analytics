import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    fetchDepartmentsAndPositions,
    requireHrAdmin,
} from "@/app/hr/settings/departments/_lib/server/departments-service";

export const dynamic = "force-dynamic";

export async function GET() {
    const access = await requireHrAdmin();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const data = await fetchDepartmentsAndPositions();
    return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
    const access = await requireHrAdmin();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() || null : null;
    const parent_department_id =
        typeof body.parent_department_id === "string" && body.parent_department_id
            ? body.parent_department_id
            : null;
    const hierarchy_level = Math.max(1, Number(body.hierarchy_level ?? 1) || 1);

    if (!name) return NextResponse.json({ error: "Nom du département requis" }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
        .from("hr_departments")
        .insert({ name, description, parent_department_id, hierarchy_level })
        .select("*")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ department: data });
}