import { NextRequest, NextResponse } from "next/server";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import { resolveAllowedCompanyIds } from "@/app/finance/expenses/_lib/server/expenses-service";
import { odooClient } from "@/lib/odoo/odoo-json2-client";

export const dynamic = "force-dynamic";

const BUCKET = "expense-validations";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
];

const VALIDATE_ROLES = ["admin", "financier", "controller"];
const UNVALIDATE_ROLES = ["admin", "financier"];

interface RouteParams {
    params: Promise<{ id: string }>;
}

async function checkCompanyAccess(
    odooExpenseId: number,
    allowedCompanies: number[] | null,
): Promise<boolean> {
    if (allowedCompanies === null) return true;
    if (allowedCompanies.length === 0) return false;
    const rows = await odooClient.searchRead<{
        id: number;
        company_id: [number, string] | false;
    }>("hr.expense", {
        domain: [["id", "=", odooExpenseId]],
        fields: ["company_id"],
        limit: 1,
    });
    const compId = Array.isArray(rows[0]?.company_id) ? rows[0].company_id[0] : null;
    return compId !== null && allowedCompanies.includes(compId);
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
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const allowedCompanies = await resolveAllowedCompanyIds(auth.profile);
        if (!(await checkCompanyAccess(odooExpenseId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const formData = await request.formData();
        const validationFile = formData.get("validationFile") as File | null;
        const proofFile = formData.get("proofFile") as File | null;
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

        if (proofFile) {
            if (proofFile.size > MAX_SIZE) {
                return NextResponse.json({ error: "Preuve : fichier trop lourd (max 5 Mo)" }, { status: 400 });
            }
            if (!ALLOWED_MIME.includes(proofFile.type)) {
                return NextResponse.json({ error: "Preuve : format non autorisé" }, { status: 400 });
            }
        }

        const supabase = await createClient();

        const { data: previous } = await supabase
            .from("expense_validations")
            .select("validation_photo_path, proof_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        // Upload parallèle autorisation + preuve
        const [validationPath, uploadedProofPath] = await Promise.all([
            uploadFile(supabase, odooExpenseId, validationFile, "auth"),
            proofFile ? uploadFile(supabase, odooExpenseId, proofFile, "proof") : Promise.resolve(null),
        ]);

        if (!validationPath || (proofFile && !uploadedProofPath)) {
            const rollback = [validationPath, uploadedProofPath].filter(
                (p): p is string => typeof p === "string",
            );
            if (rollback.length > 0) {
                await supabase.storage.from(BUCKET).remove(rollback);
            }
            return NextResponse.json({ error: "Échec upload fichier" }, { status: 500 });
        }

        const proofPath = uploadedProofPath ?? previous?.proof_photo_path ?? null;
        const validatedAt = new Date().toISOString();

        const { error: upsertErr } = await supabase
            .from("expense_validations")
            .upsert(
                {
                    odoo_expense_id: odooExpenseId,
                    validation_photo_path: validationPath,
                    proof_photo_path: proofPath,
                    notes,
                    validated_at: validatedAt,
                    validated_by: auth.user.id,
                },
                { onConflict: "odoo_expense_id" },
            );

        if (upsertErr) {
            const toRemove = [validationPath, uploadedProofPath].filter(
                (p): p is string => typeof p === "string",
            );
            if (toRemove.length > 0) {
                await supabase.storage.from(BUCKET).remove(toRemove);
            }
            return NextResponse.json({ error: "Échec enregistrement" }, { status: 500 });
        }

        // Cleanup anciens fichiers
        const cleanup: string[] = [];
        if (previous?.validation_photo_path && previous.validation_photo_path !== validationPath) {
            cleanup.push(previous.validation_photo_path);
        }
        if (previous?.proof_photo_path && uploadedProofPath && previous.proof_photo_path !== uploadedProofPath) {
            cleanup.push(previous.proof_photo_path);
        }
        if (cleanup.length > 0) {
            await supabase.storage.from(BUCKET).remove(cleanup);
        }

        return NextResponse.json({
            success: true,
            odooExpenseId,
            isValidated: true,
            hasValidationPhoto: true,
            hasProofPhoto: Boolean(proofPath),
            validationNotes: notes,
            validatedAt,
            validatedBy: auth.profile.full_name ?? "—",
        });
    } catch (error) {
        console.error("[EXPENSES_API] POST validate:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

async function uploadFile(
    supabase: Awaited<ReturnType<typeof createClient>>,
    odooExpenseId: number,
    file: File,
    kind: "auth" | "proof",
): Promise<string | null> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
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

        const auth = await getServerAuth();
        if (!auth.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!auth.profile || !UNVALIDATE_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const allowedCompanies = await resolveAllowedCompanyIds(auth.profile);
        if (!(await checkCompanyAccess(odooExpenseId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const supabase = await createClient();

        const { data: existing } = await supabase
            .from("expense_validations")
            .select("validation_photo_path, proof_photo_path")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        if (!existing) {
            return NextResponse.json({
                success: true,
                odooExpenseId,
                isValidated: false,
                hasValidationPhoto: false,
                hasProofPhoto: false,
                validationNotes: null,
                validatedAt: null,
                validatedBy: null,
            });
        }

        const { error: delErr } = await supabase
            .from("expense_validations")
            .delete()
            .eq("odoo_expense_id", odooExpenseId);

        if (delErr) {
            return NextResponse.json({ error: "Échec suppression" }, { status: 500 });
        }

        const paths = [existing.validation_photo_path, existing.proof_photo_path].filter(
            (p): p is string => typeof p === "string",
        );
        if (paths.length > 0) {
            await supabase.storage.from(BUCKET).remove(paths);
        }

        return NextResponse.json({
            success: true,
            odooExpenseId,
            isValidated: false,
            hasValidationPhoto: false,
            hasProofPhoto: false,
            validationNotes: null,
            validatedAt: null,
            validatedBy: null,
        });
    } catch (error) {
        console.error("[EXPENSES_API] DELETE validate error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}