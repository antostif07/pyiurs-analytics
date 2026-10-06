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

const ALLOWED_ROLES = ["admin", "financier", "controller"];

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

        // Auth + rôle
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !ALLOWED_ROLES.includes(profile.role ?? "")) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        // Parse form : validationFile (requis) + proofFile (optionnel)
        const formData = await request.formData();
        const validationFile = formData.get("validationFile") as File | null;
        const proofFile = formData.get("proofFile") as File | null;
        const notes = (formData.get("notes") as string | null) || null;

        if (!validationFile) {
            return NextResponse.json({ error: "Photo d'autorisation manquante" }, { status: 400 });
        }

        if (validationFile.size > MAX_SIZE) {
            return NextResponse.json({ error: "Autorisation : fichier trop lourd (max 5 Mo)" }, { status: 400 });
        }
        if (!ALLOWED_MIME.includes(validationFile.type)) {
            return NextResponse.json({ error: "Autorisation : format non autorisé" }, { status: 400 });
        }

        if (proofFile) {
            if (proofFile.size > MAX_SIZE) {
                return NextResponse.json({ error: "Preuve : fichier trop lourd (max 5 Mo)" }, { status: 400 });
            }
            if (!ALLOWED_MIME.includes(proofFile.type)) {
                return NextResponse.json({ error: "Preuve : format non autorisé" }, { status: 400 });
            }
        }

        // Récupérer l'existant
        const { data: previous } = await supabase
            .from("expense_validations")
            .select("validation_photo_path, proof_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        // Upload autorisation
        const validationPath = await uploadFile(
            supabase, odooExpenseId, validationFile, "auth",
        );
        if (!validationPath) {
            return NextResponse.json({ error: "Échec upload autorisation" }, { status: 500 });
        }

        // Upload preuve (optionnel)
        let proofPath: string | null = previous?.proof_photo_path ?? null;
        if (proofFile) {
            const uploaded = await uploadFile(supabase, odooExpenseId, proofFile, "proof");
            if (!uploaded) {
                // rollback autorisation
                await supabase.storage.from(BUCKET).remove([validationPath]);
                return NextResponse.json({ error: "Échec upload preuve" }, { status: 500 });
            }
            proofPath = uploaded;
        }

        // Upsert
        const { error: upsertErr } = await supabase
            .from("expense_validations")
            .upsert(
                {
                    odoo_expense_id: odooExpenseId,
                    validation_photo_path: validationPath,
                    proof_photo_path: proofPath,
                    notes,
                    validated_at: new Date().toISOString(),
                    validated_by: user.id,
                },
                { onConflict: "odoo_expense_id" },
            );

        if (upsertErr) {
            // rollback des uploads de cette requête
            const toRemove = [validationPath];
            if (proofFile && proofPath) toRemove.push(proofPath);
            await supabase.storage.from(BUCKET).remove(toRemove);
            return NextResponse.json({ error: "Échec enregistrement" }, { status: 500 });
        }

        // Cleanup anciens fichiers
        const cleanup: string[] = [];
        if (previous?.validation_photo_path && previous.validation_photo_path !== validationPath) {
            cleanup.push(previous.validation_photo_path);
        }
        if (
            previous?.proof_photo_path &&
            previous.proof_photo_path !== proofPath &&
            proofFile    // on ne supprime l'ancien proof QUE si on l'a remplacé
        ) {
            cleanup.push(previous.proof_photo_path);
        }
        if (cleanup.length > 0) {
            await supabase.storage.from(BUCKET).remove(cleanup);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[EXPENSES_API] POST validate:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

// Helper
async function uploadFile(
    supabase: Awaited<ReturnType<typeof createClient>>,
    odooExpenseId: number,
    file: File,
    kind: "auth" | "proof",
): Promise<string | null> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5);
    const path = `${odooExpenseId}/${kind}-${Date.now()}.${safeExt}`;

    const buf = await file.arrayBuffer();
    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, buf, { contentType: file.type, upsert: false });

    return error ? null : path;
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
            .select("validation_photo_path, proof_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        if (!existing) return NextResponse.json({ success: true });

        await supabase
            .from("expense_validations")
            .delete()
            .eq("odoo_expense_id", odooExpenseId);

        const paths = [existing.validation_photo_path, existing.proof_photo_path]
            .filter((p): p is string => typeof p === "string");
        if (paths.length > 0) {
            await supabase.storage.from(BUCKET).remove(paths);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[EXPENSES_API] DELETE validate error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}