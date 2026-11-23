import { NextRequest, NextResponse } from "next/server";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import { clearTransfersCache } from "@/app/controls/store-transfers/_lib/server/transfer-service";

export const dynamic = "force-dynamic";

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const soId = Number((await params).id);
        const auth = await getServerAuth();
        if (!auth.user || !auth.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!["admin", "controller"].includes(auth.profile.role ?? "")) {
            return NextResponse.json({ error: "Seuls controller et admin peuvent valider" }, { status: 403 });
        }

        const supabase = await createClient();
        const { data: existing } = await (supabase as any)
            .from("inter_store_transfer_validations")
            .select("dp_out_file_path, dp_in_file_path")
            .eq("odoo_sale_order_id", soId)
            .maybeSingle();

        if (!existing?.dp_out_file_path || !existing?.dp_in_file_path) {
            return NextResponse.json(
                { error: "Les fichiers DP/OUT et DP/IN doivent être joints avant validation" },
                { status: 400 },
            );
        }

        const validatedAt = new Date().toISOString();
        const { error } = await (supabase as any)
            .from("inter_store_transfer_validations")
            .update({
                validated_by: auth.user.id,
                validated_at: validatedAt,
                updated_at: validatedAt,
            })
            .eq("odoo_sale_order_id", soId);

        if (error) return NextResponse.json({ error: "Échec validation" }, { status: 500 });

        clearTransfersCache();
        return NextResponse.json({
            success: true,
            saleOrderId: soId,
            isValidated: true,
            validatedAt,
            validatedBy: auth.profile.full_name ?? "—",
        });
    } catch (e) {
        console.error("[TRANSFERS_VALIDATE] POST:", e);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const soId = Number((await params).id);
        const auth = await getServerAuth();
        if (!auth.user || !auth.profile) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (auth.profile.role !== "admin") {
            return NextResponse.json({ error: "Seul un admin peut retirer la validation" }, { status: 403 });
        }

        const supabase = await createClient();
        const { error } = await (supabase as any)
            .from("inter_store_transfer_validations")
            .update({
                validated_by: null,
                validated_at: null,
                updated_at: new Date().toISOString(),
            })
            .eq("odoo_sale_order_id", soId);

        if (error) return NextResponse.json({ error: "Échec suppression" }, { status: 500 });

        clearTransfersCache();
        return NextResponse.json({
            success: true,
            saleOrderId: soId,
            isValidated: false,
            validatedAt: null,
            validatedBy: null,
        });
    } catch (e) {
        console.error("[TRANSFERS_VALIDATE] DELETE:", e);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}