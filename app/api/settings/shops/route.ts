// app/api/settings/shops/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ADMIN_CHECK = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false as const, status: 401, error: "Non authentifié" };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") {
        return { ok: false as const, status: 403, error: "Admin requis" };
    }
    return { ok: true as const, userId: user.id };
};

// ─────────────────────────────────────────────────────────────────────────
// GET — liste shops + stats
// ─────────────────────────────────────────────────────────────────────────

export async function GET() {
    try {
        const supabase = await createClient();
        const check = await ADMIN_CHECK(supabase);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

        const { data, error } = await supabase
            .from("shops")
            .select(`
                id, name, odoo_company_id, odoo_pos_ids,
                created_at, updated_at,
                shop_locations ( id, is_active )
            `)
            .order("name");

        if (error) throw new Error(error.message);

        const shops = (data ?? []).map((s) => {
            const locs = (s.shop_locations ?? []) as Array<{ id: string; is_active: boolean }>;
            return {
                id: s.id,
                name: s.name,
                odoo_company_id: s.odoo_company_id,
                odoo_pos_ids: s.odoo_pos_ids,
                created_at: s.created_at,
                updated_at: s.updated_at,
                locations_count: locs.length,
                active_locations_count: locs.filter((l) => l.is_active).length,
            };
        });

        return NextResponse.json({ shops });
    } catch (error) {
        console.error("[SETTINGS_SHOPS_LIST]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────
// POST — créer un shop
// ─────────────────────────────────────────────────────────────────────────

interface CreateShopBody {
    name: string;
    odoo_company_id: number | null;
    odoo_pos_ids: number[] | null;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const check = await ADMIN_CHECK(supabase);
        if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });

        const body: CreateShopBody = await request.json();
        const name = (body.name ?? "").trim();

        if (!name) {
            return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("shops")
            .insert({
                name,
                odoo_company_id: body.odoo_company_id ?? null,
                odoo_pos_ids: body.odoo_pos_ids ?? [],
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return NextResponse.json({ shop: data });
    } catch (error) {
        console.error("[SETTINGS_SHOPS_CREATE]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}