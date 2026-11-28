import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHrAdmin } from "@/app/hr/settings/departments/_lib/server/departments-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const access = await requireHrAdmin();
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const department_id = typeof body.department_id === "string" && body.department_id ? body.department_id : null;
    const default_base_salary = Number(body.default_base_salary ?? 0) || 0;
    const currency = body.currency === "CDF" ? "CDF" : "USD";

    if (!title) return NextResponse.json({ error: "Intitulé du poste requis" }, { status: 400 });

    const supabase = await createClient();
    const parent_job_title_id =
        typeof body.parent_job_title_id === "string" && body.parent_job_title_id
            ? body.parent_job_title_id
            : null;
    const hierarchy_level = Math.max(1, Number(body.hierarchy_level ?? 1) || 1);
    const is_department_head = Boolean(body.is_department_head);

    const { data, error } = await (supabase as any)
        .from("hr_job_titles")
        .insert({
            title,
            department_id,
            parent_job_title_id,
            hierarchy_level,
            is_department_head,
            default_base_salary,
            currency,
        })
        .select("*")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ position: data });
}