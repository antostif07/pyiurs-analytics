// app/api/settings/shops/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
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
    return { ok: true as const, userId: user.id };
};

// ─────────────────────────────────────────────────────────────────────────
// GET — shop + toutes ses locations
// ─────────────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const check = await ADMIN_CHECK(supabase);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

        const { data: shop, error: shopErr } = await supabase
            .from("shops")
            .select("id, name, odoo_company_id, odoo_pos_ids, created_at, updated_at")
            .eq("id", id)
            .single();

        if (shopErr || !shop) {
            return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
        }

        const { data: locations, error: locErr } = await supabase
            .from("shop_locations")
            .select("*")
            .eq("shop_id", id)
            .order("sort_order")
            .order("odoo_location_name");

        if (locErr) throw new Error(locErr.message);

        return NextResponse.json({ shop, locations: locations ?? [] });
    } catch (error) {
        console.error("[SETTINGS_SHOP_GET]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────
// PATCH — modifier un shop
// ─────────────────────────────────────────────────────────────────────────

interface PatchShopBody {
    name?: string;
    odoo_company_id?: number | null;
    odoo_pos_ids?: number[] | null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const check = await ADMIN_CHECK(supabase);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

        const body: PatchShopBody = await request.json();
        const patch: Record<string, unknown> = {};

        if (typeof body.name === "string") patch.name = body.name.trim();
        if ("odoo_company_id" in body) patch.odoo_company_id = body.odoo_company_id;
        if ("odoo_pos_ids" in body) patch.odoo_pos_ids = body.odoo_pos_ids ?? [];

        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ error: "Aucun champ à modifier" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("shops")
            .update(patch)
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return NextResponse.json({ shop: data });
    } catch (error) {
        console.error("[SETTINGS_SHOP_PATCH]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────
// DELETE — supprimer un shop (cascade sur shop_locations)
// ─────────────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const check = await ADMIN_CHECK(supabase);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

        const { error } = await supabase.from("shops").delete().eq("id", id);
        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[SETTINGS_SHOP_DELETE]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}