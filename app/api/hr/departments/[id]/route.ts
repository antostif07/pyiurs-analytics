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
            .from("hr_departments")
            .select("id, name")
            .eq("id", id)
            .maybeSingle();

        if (!prev) {
            return NextResponse.json({ error: "Département introuvable" }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (typeof body.name === "string" && body.name.trim()) {
            updates.name = body.name.trim();
        }
        if ("description" in body) {
            updates.description =
                typeof body.description === "string" ? body.description.trim() || null : null;
        }
        if ("parent_department_id" in body) {
            const parentId =
                typeof body.parent_department_id === "string" && body.parent_department_id
                    ? body.parent_department_id
                    : null;
            if (parentId === id) {
                return NextResponse.json(
                    { error: "Un département ne peut pas être son propre parent" },
                    { status: 400 },
                );
            }
            updates.parent_department_id = parentId;
        }
        if ("hierarchy_level" in body) {
            updates.hierarchy_level = Math.max(1, Number(body.hierarchy_level ?? 1) || 1);
        }
        if (typeof body.is_active === "boolean") {
            updates.is_active = body.is_active;
        }

        const { data, error } = await (supabase as any)
            .from("hr_departments")
            .update(updates)
            .eq("id", id)
            .select("*")
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Synchroniser le texte rétrocompatible sur les employés liés
        if (updates.name && updates.name !== prev.name) {
            await (supabase as any)
                .from("employees")
                .update({ department: String(updates.name) })
                .eq("department_id", id);
        }

        return NextResponse.json({ department: data });
    } catch (error) {
        console.error("[HR_DEPARTMENTS_PATCH] error:", error);
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
            .from("hr_departments")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[HR_DEPARTMENTS_DELETE] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}