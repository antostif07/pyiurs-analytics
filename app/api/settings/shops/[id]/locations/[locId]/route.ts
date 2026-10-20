// app/api/settings/shops/[id]/locations/[locId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string; locId: string }>;
}

const ADMIN_CHECK = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, status: 401, error: "Non authentifié" };
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (profile?.role !== "admin") return { ok: false as const, status: 403, error: "Admin requis" };
    return { ok: true as const };
};

interface PatchBody {
    label?: string | null;
    is_active?: boolean;
    sort_order?: number;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: shopId, locId } = await params;
        const supabase = await createClient();
        const check = await ADMIN_CHECK(supabase);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

        const body: PatchBody = await request.json();
        const patch: Record<string, unknown> = {};
        if ("label" in body) patch.label = body.label;
        if ("is_active" in body) patch.is_active = body.is_active;
        if ("sort_order" in body) patch.sort_order = body.sort_order;

        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ error: "Aucun champ à modifier" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("shop_locations")
            .update(patch)
            .eq("id", locId)
            .eq("shop_id", shopId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return NextResponse.json({ location: data });
    } catch (error) {
        console.error("[SETTINGS_SHOP_LOCATION_PATCH]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id: shopId, locId } = await params;
        const supabase = await createClient();
        const check = await ADMIN_CHECK(supabase);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

        const { error } = await supabase
            .from("shop_locations")
            .delete()
            .eq("id", locId)
            .eq("shop_id", shopId);

        if (error) throw new Error(error.message);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SETTINGS_SHOP_LOCATION_DELETE]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}