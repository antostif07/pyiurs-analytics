// app/api/settings/shops/[id]/locations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

const adminCheck = async (
    supabase: Awaited<ReturnType<typeof createClient>>,
) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { ok: false as const, status: 401, error: "Non authentifié" };
    }
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

interface CreateLocationBody {
    odoo_location_id: number;
    odoo_location_name: string;
    odoo_location_complete_name?: string | null;
    odoo_usage?: string | null;
    odoo_company_id?: number | null;
    label?: string | null;
    sort_order?: number;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: shopId } = await params;
        const supabase = await createClient();
        const check = await adminCheck(supabase);
        if (!check.ok) {
            return NextResponse.json(
                { error: check.error },
                { status: check.status },
            );
        }

        const body: CreateLocationBody = await request.json();

        if (!body.odoo_location_id || !body.odoo_location_name) {
            return NextResponse.json(
                { error: "Location Odoo requise" },
                { status: 400 },
            );
        }

        const { data: shop } = await supabase
            .from("shops")
            .select("odoo_company_id")
            .eq("id", shopId)
            .single();

        if (!shop) {
            return NextResponse.json(
                { error: "Boutique introuvable" },
                { status: 404 },
            );
        }

        if (
            body.odoo_company_id != null &&
            shop.odoo_company_id != null &&
            body.odoo_company_id !== shop.odoo_company_id
        ) {
            return NextResponse.json(
                {
                    error:
                        "La company de la location ne correspond pas à celle du shop",
                },
                { status: 400 },
            );
        }

        const { data, error } = await supabase
            .from("shop_locations")
            .insert({
                shop_id: shopId,
                odoo_location_id: body.odoo_location_id,
                odoo_location_name: body.odoo_location_name,
                odoo_location_complete_name:
                    body.odoo_location_complete_name ?? null,
                odoo_usage: body.odoo_usage ?? null,
                odoo_company_id: body.odoo_company_id ?? null,
                label: body.label ?? null,
                sort_order: body.sort_order ?? 0,
                created_by: check.userId,
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23505") {
                return NextResponse.json(
                    {
                        error:
                            "Cet emplacement est déjà associé à cette boutique",
                    },
                    { status: 409 },
                );
            }
            if (error.code === "23503") {
                return NextResponse.json(
                    {
                        error:
                            "Référence invalide (profil ou boutique introuvable)",
                    },
                    { status: 400 },
                );
            }
            if (error.message.includes("row-level security")) {
                return NextResponse.json(
                    { error: "Permissions insuffisantes (RLS)" },
                    { status: 403 },
                );
            }
            console.error(
                "[LOC_CREATE]",
                error.code,
                error.message,
            );
            return NextResponse.json(
                { error: `Erreur DB: ${error.message}` },
                { status: 500 },
            );
        }

        return NextResponse.json({ location: data });
    } catch (error) {
        console.error("[LOC_CREATE]", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}

export async function GET() {
    return NextResponse.json(
        { error: "Méthode non autorisée" },
        { status: 405 },
    );
}