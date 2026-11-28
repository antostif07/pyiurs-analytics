import { NextRequest, NextResponse } from "next/server";
import { createClient, getServerAuth } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
    const auth = await getServerAuth();
    if (!auth.user || !auth.profile || auth.profile.role !== "admin") {
        return NextResponse.json({ error: "Réservé à l'admin" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const employeeId = typeof body.employeeId === "string" ? body.employeeId : "";
    const managerId = typeof body.managerId === "string" && body.managerId ? body.managerId : null;

    if (!employeeId) return NextResponse.json({ error: "employeeId requis" }, { status: 400 });
    if (managerId === employeeId) {
        return NextResponse.json({ error: "Un employé ne peut pas être son propre supérieur" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
        .from("employees")
        .update({ manager_id: managerId, updated_at: new Date().toISOString() })
        .eq("id", employeeId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
}