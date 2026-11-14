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

const PROOF_ROLES = ["admin", "manager", "controller"];
const VALIDATOR_ROLES = ["admin", "controller"];

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
        if (!auth.profile || !PROOF_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const allowedCompanies = await resolveAllowedCompanyIds(auth.profile);
        if (!(await checkExpenseCompanyAccess(odooExpenseId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const formData = await request.formData();
        const proofFile = formData.get("proofFile") as File | null;

        if (!proofFile) {
            return NextResponse.json({ error: "Fichier preuve manquant" }, { status: 400 });
        }
        if (proofFile.size > MAX_SIZE) {
            return NextResponse.json({ error: "Preuve : fichier trop lourd (max 5 Mo)" }, { status: 400 });
        }
        if (!ALLOWED_MIME.includes(proofFile.type)) {
            return NextResponse.json({ error: "Preuve : format non autorisé" }, { status: 400 });
        }

        const supabase = await createClient();

        const { data: existing } = await supabase
            .from("expense_validations")
            .select("validation_photo_path, proof_photo_path, validated_at")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        const isAlreadyValidated = Boolean(existing?.validation_photo_path && existing?.validated_at);
        if (isAlreadyValidated && !VALIDATOR_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json(
                { error: "Dépense déjà validée : la preuve est verrouillée" },
                { status: 409 },
            );
        }

        const ext = proofFile.name.split(".").pop()?.toLowerCase() ?? "bin";
        const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
        const newPath = `${odooExpenseId}/proof-${Date.now()}.${safeExt}`;

        const buf = await proofFile.arrayBuffer();
        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(newPath, buf, { contentType: proofFile.type, upsert: false });

        if (uploadErr) {
            return NextResponse.json({ error: "Échec upload preuve" }, { status: 500 });
        }

        const proofAttachedAt = new Date().toISOString();

        const { error: upsertErr } = await supabase
            .from("expense_validations")
            .upsert(
                {
                    odoo_expense_id: odooExpenseId,
                    proof_photo_path: newPath,
                    proof_attached_by: auth.user.id,
                    proof_attached_at: proofAttachedAt,
                    updated_at: proofAttachedAt,
                },
                { onConflict: "odoo_expense_id" },
            );

        if (upsertErr) {
            await supabase.storage.from(BUCKET).remove([newPath]);
            return NextResponse.json({ error: "Échec enregistrement" }, { status: 500 });
        }

        if (existing?.proof_photo_path && existing.proof_photo_path !== newPath) {
            await supabase.storage.from(BUCKET).remove([existing.proof_photo_path]);
        }

        return NextResponse.json({
            success: true,
            odooExpenseId,
            hasProofPhoto: true,
            proofAttachedAt,
            proofAttachedBy: auth.profile.full_name ?? "—",
        });
    } catch (error) {
        console.error("[EXPENSES_API] POST proof:", error);
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
        if (!auth.profile || !PROOF_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const allowedCompanies = await resolveAllowedCompanyIds(auth.profile);
        if (!(await checkExpenseCompanyAccess(odooExpenseId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const supabase = await createClient();
        const { data: existing } = await supabase
            .from("expense_validations")
            .select("validation_photo_path, proof_photo_path, validated_at")
            .eq("odoo_expense_id", odooExpenseId)
            .maybeSingle();

        if (!existing?.proof_photo_path) {
            return NextResponse.json({
                success: true,
                odooExpenseId,
                hasProofPhoto: false,
                proofAttachedAt: null,
                proofAttachedBy: null,
            });
        }

        const isAlreadyValidated = Boolean(existing.validation_photo_path && existing.validated_at);
        if (isAlreadyValidated && !VALIDATOR_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json(
                { error: "Dépense déjà validée : impossible de retirer la preuve" },
                { status: 409 },
            );
        }

        if (existing.validation_photo_path) {
            // La validation existe : on garde la ligne et on vide uniquement la preuve
            const { error } = await supabase
                .from("expense_validations")
                .update({
                    proof_photo_path: null,
                    proof_attached_by: null,
                    proof_attached_at: null,
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

        await supabase.storage.from(BUCKET).remove([existing.proof_photo_path]);

        return NextResponse.json({
            success: true,
            odooExpenseId,
            hasProofPhoto: false,
            proofAttachedAt: null,
            proofAttachedBy: null,
        });
    } catch (error) {
        console.error("[EXPENSES_API] DELETE proof:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}