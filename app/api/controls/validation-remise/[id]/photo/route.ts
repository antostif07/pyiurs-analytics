import { NextRequest, NextResponse } from "next/server";
import { createClient, getServerAuth } from "@/lib/supabase/server";
import {
    checkRedsupOrderCompanyAccess,
    requireRedsupAccess,
    resolveRedsupAllowedCompanies,
} from "@/app/controls/validation-remise/_lib/server/redsup-service";

export const dynamic = "force-dynamic";

const BUCKET = "redsup-validations";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const PHOTO_ROLES = ["admin", "controller", "manager"];
const VALIDATOR_ROLES = ["admin", "controller"];

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const access = await requireRedsupAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const odooOrderId = Number((await params).id);
        if (!Number.isFinite(odooOrderId) || odooOrderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const allowedCompanies = await resolveRedsupAllowedCompanies(access.profile);
        const supabase = await createClient();

        const [allowed, { data: row, error }] = await Promise.all([
            checkRedsupOrderCompanyAccess(odooOrderId, allowedCompanies),
            supabase
                .from("redsup_validations")
                .select("validation_photo_path")
                .eq("odoo_order_id", odooOrderId)
                .maybeSingle(),
        ]);

        if (!allowed) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }
        if (error || !row?.validation_photo_path) {
            return NextResponse.json({ error: "Photo introuvable" }, { status: 404 });
        }

        const { data: signed, error: signErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(row.validation_photo_path, 60 * 60);

        if (signErr || !signed?.signedUrl) {
            return NextResponse.json({ error: "Impossible de signer le fichier" }, { status: 500 });
        }

        return NextResponse.json({
            url: signed.signedUrl,
            isPdf: row.validation_photo_path.toLowerCase().endsWith(".pdf"),
        });
    } catch (err) {
        console.error("[REDSUP_PHOTO_API] GET:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const odooOrderId = Number((await params).id);
        if (!Number.isFinite(odooOrderId) || odooOrderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const auth = await getServerAuth();
        if (!auth.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!auth.profile || !PHOTO_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const allowedCompanies = await resolveRedsupAllowedCompanies(auth.profile);
        if (!(await checkRedsupOrderCompanyAccess(odooOrderId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        if (!file) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
        if (file.size > MAX_SIZE) return NextResponse.json({ error: "Fichier trop lourd (max 5 Mo)" }, { status: 400 });
        if (!ALLOWED_MIME.includes(file.type)) return NextResponse.json({ error: "Format non autorisé" }, { status: 400 });

        const supabase = await createClient();
        const { data: existing } = await supabase
            .from("redsup_validations")
            .select("validation_photo_path, validated_at")
            .eq("odoo_order_id", odooOrderId)
            .maybeSingle();

        if (existing?.validated_at && !VALIDATOR_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json(
                { error: "Commande déjà validée : la photo est verrouillée" },
                { status: 409 },
            );
        }

        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
        const newPath = `${odooOrderId}/${Date.now()}.${safeExt}`;

        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(newPath, await file.arrayBuffer(), { contentType: file.type, upsert: false });

        if (uploadErr) {
            return NextResponse.json({ error: "Échec de l'upload" }, { status: 500 });
        }

        const nowIso = new Date().toISOString();
        const { error: upsertErr } = await supabase
            .from("redsup_validations")
            .upsert(
                {
                    odoo_order_id: odooOrderId,
                    validation_photo_path: newPath,
                    photo_attached_by: auth.user.id,
                    photo_attached_at: nowIso,
                    updated_at: nowIso,
                },
                { onConflict: "odoo_order_id" },
            );

        if (upsertErr) {
            await supabase.storage.from(BUCKET).remove([newPath]);
            return NextResponse.json({ error: "Échec enregistrement" }, { status: 500 });
        }

        if (existing?.validation_photo_path && existing.validation_photo_path !== newPath) {
            await supabase.storage.from(BUCKET).remove([existing.validation_photo_path]);
        }

        return NextResponse.json({
            success: true,
            odooOrderId,
            hasPhoto: true,
            photoAttachedAt: nowIso,
            photoAttachedBy: auth.profile.full_name ?? "—",
        });
    } catch (err) {
        console.error("[REDSUP_PHOTO_API] POST:", err);
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
        if (!auth.profile || !PHOTO_ROLES.includes(auth.profile.role ?? "")) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const allowedCompanies = await resolveRedsupAllowedCompanies(auth.profile);
        if (!(await checkRedsupOrderCompanyAccess(odooOrderId, allowedCompanies))) {
            return NextResponse.json({ error: "Accès refusé à cette société" }, { status: 403 });
        }

        const supabase = await createClient();
        const { data: existing } = await supabase
            .from("redsup_validations")
            .select("validation_photo_path, validated_at")
            .eq("odoo_order_id", odooOrderId)
            .maybeSingle();

        if (!existing?.validation_photo_path) {
            return NextResponse.json({
                success: true,
                odooOrderId,
                hasPhoto: false,
                photoAttachedAt: null,
                photoAttachedBy: null,
            });
        }

        if (existing.validated_at) {
            return NextResponse.json(
                { error: "Impossible de supprimer la photo d'une commande déjà validée" },
                { status: 409 },
            );
        }

        const { error: delErr } = await supabase
            .from("redsup_validations")
            .delete()
            .eq("odoo_order_id", odooOrderId);

        if (delErr) {
            return NextResponse.json({ error: "Échec suppression" }, { status: 500 });
        }

        await supabase.storage.from(BUCKET).remove([existing.validation_photo_path]);

        return NextResponse.json({
            success: true,
            odooOrderId,
            hasPhoto: false,
            photoAttachedAt: null,
            photoAttachedBy: null,
        });
    } catch (err) {
        console.error("[REDSUP_PHOTO_API] DELETE:", err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}