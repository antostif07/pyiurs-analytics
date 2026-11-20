import { NextRequest, NextResponse } from "next/server";
import { createClient, getServerAuth } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALIDATE_ROLES = ["admin", "controller"];
const UNVALIDATE_ROLES = ["admin"]; // controller ne peut PAS supprimer une validation

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const odooOrderId = Number((await params).id);
        if (!Number.isFinite(odooOrderId) || odooOrderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const auth = await getServerAuth();
        if (!auth.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!auth.profile || !VALIDATE_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json(
                { error: "Seuls un controller ou un admin peuvent valider" },
                { status: 403 },
            );
        }

        const supabase = await createClient();
        const { data: existing } = await supabase
            .from("redsup_validations")
            .select("validation_photo_path")
            .eq("odoo_order_id", odooOrderId)
            .maybeSingle();

        if (!existing?.validation_photo_path) {
            return NextResponse.json(
                { error: "Aucune photo d'autorisation attachée à cette commande" },
                { status: 400 },
            );
        }

        const validatedAt = new Date().toISOString();
        const { error: updErr } = await supabase
            .from("redsup_validations")
            .update({
                validated_at: validatedAt,
                validated_by: auth.user.id,
                updated_at: validatedAt,
            })
            .eq("odoo_order_id", odooOrderId);

        if (updErr) {
            return NextResponse.json({ error: "Échec de la validation" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            odooOrderId,
            isValidated: true,
            validatedAt,
            validatedBy: auth.profile.full_name ?? "—",
        });
    } catch (err) {
        console.error("[REDSUP_VALIDATE_API] POST:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const odooOrderId = Number((await params).id);
        if (!Number.isFinite(odooOrderId) || odooOrderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const auth = await getServerAuth();
        if (!auth.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!auth.profile || !UNVALIDATE_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json(
                { error: "Seul un admin peut supprimer une validation" },
                { status: 403 },
            );
        }

        const supabase = await createClient();
        const { error: updErr } = await supabase
            .from("redsup_validations")
            .update({
                validated_at: null,
                validated_by: null,
                updated_at: new Date().toISOString(),
            })
            .eq("odoo_order_id", odooOrderId);

        if (updErr) {
            return NextResponse.json({ error: "Échec de la suppression" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            odooOrderId,
            isValidated: false,
            validatedAt: null,
            validatedBy: null,
        });
    } catch (err) {
        console.error("[REDSUP_VALIDATE_API] DELETE:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}