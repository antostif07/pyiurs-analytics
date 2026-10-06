// app/api/revenue/invoices-redsup/[id]/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "redsup-validations";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_ROLES = ["admin", "financier", "controller"];

interface RouteParams {
    params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────
// POST — upload + validate
// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const odooOrderId = Number(id);

        if (!Number.isFinite(odooOrderId) || odooOrderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        // Auth + rôle
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !ALLOWED_ROLES.includes(profile.role ?? "")) {
            return NextResponse.json(
                { error: "Permissions insuffisantes" },
                { status: 403 },
            );
        }

        // Parse form
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file)
            return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
        if (file.size > MAX_SIZE)
            return NextResponse.json({ error: "Fichier trop lourd (max 5 Mo)" }, { status: 400 });
        if (!ALLOWED_MIME.includes(file.type))
            return NextResponse.json({ error: "Format non autorisé" }, { status: 400 });

        // Supprimer l'ancien si existe
        const { data: previous } = await supabase
            .from("redsup_validations")
            .select("validation_photo_path")
            .eq("odoo_order_id", odooOrderId)
            .maybeSingle();

        // Upload
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5);
        const path = `${odooOrderId}/${Date.now()}.${safeExt}`;

        const buf = await file.arrayBuffer();
        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, buf, { contentType: file.type, upsert: false });

        if (uploadErr) {
            console.error("[REDSUP_API] upload error:", uploadErr.message);
            return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 });
        }

        // Upsert
        const { error: upsertErr } = await supabase
            .from("redsup_validations")
            .upsert(
                {
                    odoo_order_id: odooOrderId,
                    validation_photo_path: path,
                    validated_at: new Date().toISOString(),
                    validated_by: user.id,
                },
                { onConflict: "odoo_order_id" },
            );

        if (upsertErr) {
            await supabase.storage.from(BUCKET).remove([path]);
            console.error("[REDSUP_API] upsert error:", upsertErr.message);
            return NextResponse.json(
                { error: "Échec de l'enregistrement" },
                { status: 500 },
            );
        }

        // Cleanup ancien fichier
        if (
            previous?.validation_photo_path &&
            previous.validation_photo_path !== path
        ) {
            await supabase.storage
                .from(BUCKET)
                .remove([previous.validation_photo_path]);
        }

        return NextResponse.json({ success: true, path });
    } catch (error) {
        console.error("[REDSUP_API] POST validate error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────
// DELETE — retirer la validation
// ─────────────────────────────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const odooOrderId = Number(id);

        if (!Number.isFinite(odooOrderId) || odooOrderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user)
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !ALLOWED_ROLES.includes(profile.role ?? "")) {
            return NextResponse.json(
                { error: "Permissions insuffisantes" },
                { status: 403 },
            );
        }

        const { data: existing } = await supabase
            .from("redsup_validations")
            .select("validation_photo_path")
            .eq("odoo_order_id", odooOrderId)
            .maybeSingle();

        if (!existing) return NextResponse.json({ success: true });

        const { error: delErr } = await supabase
            .from("redsup_validations")
            .delete()
            .eq("odoo_order_id", odooOrderId);

        if (delErr) {
            console.error("[REDSUP_API] delete error:", delErr.message);
            return NextResponse.json({ error: "Échec de la suppression" }, { status: 500 });
        }

        if (existing.validation_photo_path) {
            await supabase.storage
                .from("redsup-validations")
                .remove([existing.validation_photo_path]);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[REDSUP_API] DELETE error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}