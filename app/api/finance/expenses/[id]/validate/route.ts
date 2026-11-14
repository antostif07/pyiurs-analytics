import { NextRequest, NextResponse } from "next/server";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import {
    checkExpenseCompanyAccess,
    resolveAllowedCompanyIds,
} from "@/app/finance/expenses/_lib/server/expenses-service";

export const dynamic = "force-dynamic";

const BUCKET = "expense-validations";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];

// Seuls controller et admin peuvent valider / retirer une validation
const VALIDATE_ROLES = ["admin", "controller"];

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

        const auth = await getServerAuth();
        if (!auth.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!auth.profile || !VALIDATE_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json(
                { error: "Seuls un controller ou un admin peuvent valider" },
                { status: 403 },
            );
        }

        const allowedCompanies = await resolveAllowedCompanyIds(auth.profile);
        if (!(await checkExpenseCompanyAccess(odooExpenseId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const formData = await request.formData();
        const validationFile = formData.get("validationFile") as File | null;
        const notes = (formData.get("notes") as string | null)?.trim() || null;

        if (!validationFile) {
            return NextResponse.json({ error: "Photo d'autorisation manquante" }, { status: 400 });
        }
        if (validationFile.size > MAX_SIZE) {
            return NextResponse.json({ error: "Autorisation : fichier trop lourd (max 5 Mo)" }, { status: 400 });
        }
        if (!ALLOWED_MIME.includes(validationFile.type)) {
            return NextResponse.json({ error: "Autorisation : format non autorisé" }, { status: 400 });
        }

        const supabase = await createClient();

        const { data: previous } = await supabase
            .from("expense_validations")
            .select("validation_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        const ext = validationFile.name.split(".").pop()?.toLowerCase() ?? "bin";
        const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
        const validationPath = `${odooExpenseId}/auth-${Date.now()}.${safeExt}`;

        const buf = await validationFile.arrayBuffer();
        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(validationPath, buf, { contentType: validationFile.type, upsert: false });

        if (uploadErr) {
            return NextResponse.json({ error: "Échec upload autorisation" }, { status: 500 });
        }

        const validatedAt = new Date().toISOString();

        const { error: upsertErr } = await supabase
            .from("expense_validations")
            .upsert(
                {
                    odoo_expense_id: odooExpenseId,
                    validation_photo_path: validationPath,
                    notes,
                    validated_at: validatedAt,
                    validated_by: auth.user.id,
                    updated_at: validatedAt,
                },
                { onConflict: "odoo_expense_id" },
            );

        if (upsertErr) {
            await supabase.storage.from(BUCKET).remove([validationPath]);
            return NextResponse.json({ error: "Échec enregistrement" }, { status: 500 });
        }

        if (previous?.validation_photo_path && previous.validation_photo_path !== validationPath) {
            await supabase.storage.from(BUCKET).remove([previous.validation_photo_path]);
        }

        return NextResponse.json({
            success: true,
            odooExpenseId,
            isValidated: true,
            hasValidationPhoto: true,
            validationNotes: notes,
            validatedAt,
            validatedBy: auth.profile.full_name ?? "—",
        });
    } catch (error) {
        console.error("[EXPENSES_API] POST validate:", error);
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

        const auth = await getServerAuth();
        if (!auth.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!auth.profile || !VALIDATE_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json(
                { error: "Seuls un controller ou un admin peuvent retirer une validation" },
                { status: 403 },
            );
        }

        const allowedCompanies = await resolveAllowedCompanyIds(auth.profile);
        if (!(await checkExpenseCompanyAccess(odooExpenseId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const supabase = await createClient();

        const { data: existing } = await supabase
            .from("expense_validations")
            .select("validation_photo_path, proof_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        if (!existing?.validation_photo_path) {
            return NextResponse.json({
                success: true,
                odooExpenseId,
                isValidated: false,
                hasValidationPhoto: false,
                validationNotes: null,
                validatedAt: null,
                validatedBy: null,
            });
        }

        if (existing.proof_photo_path) {
            // Préserver la preuve du manager !
            const { error } = await supabase
                .from("expense_validations")
                .update({
                    validation_photo_path: null,
                    validated_at: null,
                    validated_by: null,
                    notes: null,
                    updated_at: new Date().toISOString(),
                })
                .eq("odoo_expense_id", odooExpenseId);

            if (error) return NextResponse.json({ error: "Échec suppression" }, { status: 500 });
        } else {
            const { error } = await supabase
                .from("expense_validations")
                .delete()
                .eq("odoo_expense_id", odooExpenseId);

            if (error) return NextResponse.json({ error: "Échec suppression" }, { status: 500 });
        }

        await supabase.storage.from(BUCKET).remove([existing.validation_photo_path]);

        return NextResponse.json({
            success: true,
            odooExpenseId,
            isValidated: false,
            hasValidationPhoto: false,
            validationNotes: null,
            validatedAt: null,
            validatedBy: null,
        });
    } catch (error) {
        console.error("[EXPENSES_API] DELETE validate error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}