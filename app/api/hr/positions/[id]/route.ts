import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireHrAdmin } from "@/app/hr/settings/departments/_lib/server/departments-service";

export const dynamic = "force-dynamic";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const access = await requireHrAdmin();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { id } = await params;
        const body = await req.json().catch(() => ({}));
        const supabase = await createClient();

        const { data: prev } = await (supabase as any)
            .from("hr_job_titles")
            .select("id, title")
            .eq("id", id)
            .maybeSingle();

        if (!prev) {
            return NextResponse.json({ error: "Poste introuvable" }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (typeof body.title === "string" && body.title.trim()) {
            updates.title = body.title.trim();
        }
        if ("department_id" in body) {
            updates.department_id =
                typeof body.department_id === "string" && body.department_id
                    ? body.department_id
                    : null;
        }
        if ("parent_job_title_id" in body) {
            const parentId =
                typeof body.parent_job_title_id === "string" && body.parent_job_title_id
                    ? body.parent_job_title_id
                    : null;
            if (parentId === id) {
                return NextResponse.json(
                    { error: "Un poste ne peut pas être son propre supérieur" },
                    { status: 400 },
                );
            }
            updates.parent_job_title_id = parentId;
        }
        if ("hierarchy_level" in body) {
            updates.hierarchy_level = Math.max(1, Number(body.hierarchy_level ?? 1) || 1);
        }
        if (typeof body.is_department_head === "boolean") {
            updates.is_department_head = body.is_department_head;
        }
        if ("default_base_salary" in body) {
            updates.default_base_salary = Number(body.default_base_salary ?? 0) || 0;
        }
        if (body.currency === "USD" || body.currency === "CDF") {
            updates.currency = body.currency;
        }
        if (typeof body.is_active === "boolean") {
            updates.is_active = body.is_active;
        }

        const { data, error } = await (supabase as any)
            .from("hr_job_titles")
            .update(updates)
            .eq("id", id)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Synchroniser le texte rétrocompatible sur les employés liés
        if (updates.title && updates.title !== prev.title) {
            await (supabase as any)
                .from("employees")
                .update({ job_title: String(updates.title) })
                .eq("job_title_id", id);
        }

        return NextResponse.json({ position: data });
    } catch (error) {
        console.error("[HR_POSITIONS_PATCH] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const access = await requireHrAdmin();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { id } = await params;
        const supabase = await createClient();

        const { error } = await (supabase as any)
            .from("hr_job_titles")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[HR_POSITIONS_DELETE] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}