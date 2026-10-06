// app/api/finance/expenses/[id]/validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "expense-validations";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const odooExpenseId = Number(id);

        if (!Number.isFinite(odooExpenseId) || odooExpenseId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        // ─── Auth + rôle ───────────────────────────────────────────────
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !["admin", "financier"].includes(profile.role ?? "")) {
            return NextResponse.json(
                { error: "Permissions insuffisantes" },
                { status: 403 },
            );
        }

        // ─── Parse form ────────────────────────────────────────────────
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const notes = (formData.get("notes") as string | null) || null;

        if (!file) {
            return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: `Fichier trop lourd (max ${MAX_SIZE / 1024 / 1024} MB)` },
                { status: 400 },
            );
        }

        if (!ALLOWED_MIME.includes(file.type)) {
            return NextResponse.json(
                { error: "Type de fichier non autorisé (JPEG, PNG, WebP, PDF)" },
                { status: 400 },
            );
        }

        // ─── Supprimer l'ancienne photo si elle existe ─────────────────
        const { data: previous } = await supabase
            .from("expense_validations")
            .select("validation_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        // ─── Upload Storage ────────────────────────────────────────────
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5);
        const path = `${odooExpenseId}/${Date.now()}.${safeExt}`;

        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, arrayBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadErr) {
            console.error("[EXPENSES_API] upload error:", uploadErr.message);
            return NextResponse.json(
                { error: "Échec de l'upload" },
                { status: 500 },
            );
        }

        // ─── Upsert validation ─────────────────────────────────────────
        const { error: upsertErr } = await supabase
            .from("expense_validations")
            .upsert(
                {
                    odoo_expense_id: odooExpenseId,
                    validation_photo_path: path,
                    notes,
                    validated_at: new Date().toISOString(),
                    validated_by: user.id,
                },
                { onConflict: "odoo_expense_id" },
            );

        if (upsertErr) {
            // Rollback du fichier uploadé
            await supabase.storage.from(BUCKET).remove([path]);
            console.error("[EXPENSES_API] upsert error:", upsertErr.message);
            return NextResponse.json(
                { error: "Échec de l'enregistrement" },
                { status: 500 },
            );
        }

        // ─── Cleanup ancien fichier (après upsert réussi) ─────────────
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
        console.error("[EXPENSES_API] POST validate error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const odooExpenseId = Number(id);

        if (!Number.isFinite(odooExpenseId) || odooExpenseId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !["admin", "financier"].includes(profile.role ?? "")) {
            return NextResponse.json(
                { error: "Permissions insuffisantes" },
                { status: 403 },
            );
        }

        // Récupérer le path avant delete
        const { data: existing } = await supabase
            .from("expense_validations")
            .select("validation_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        if (!existing) {
            return NextResponse.json({ success: true }); // idempotent
        }

        // Delete DB
        const { error: delErr } = await supabase
            .from("expense_validations")
            .delete()
            .eq("odoo_expense_id", odooExpenseId);

        if (delErr) {
            console.error("[EXPENSES_API] delete error:", delErr.message);
            return NextResponse.json(
                { error: "Échec de la suppression" },
                { status: 500 },
            );
        }

        // Delete Storage (best effort)
        if (existing.validation_photo_path) {
            await supabase.storage
                .from(BUCKET)
                .remove([existing.validation_photo_path]);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[EXPENSES_API] DELETE validate error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}