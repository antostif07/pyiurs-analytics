import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    clearStockPoReportCache,
    requireStockPoValidateAccess,
} from "@/app/controls/stock-po/_lib/server/stock-po-service";
import {
    deleteLocalValidationFile,
    saveLocalValidationFile,
} from "@/app/controls/stock-po/_lib/server/stock-po-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const access = await requireStockPoValidateAccess(false);
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const odooPoId = Number((await params).id);
        if (!Number.isFinite(odooPoId) || odooPoId <= 0) {
            return NextResponse.json({ error: "ID PO invalide" }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const notes = (formData.get("notes") as string | null)?.trim() || null;

        if (!file) {
            return NextResponse.json({ error: "Fichier justificatif manquant" }, { status: 400 });
        }
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: "Fichier trop lourd (max 10 Mo)" }, { status: 400 });
        }
        if (!ALLOWED_MIME.includes(file.type)) {
            return NextResponse.json(
                { error: "Format non autorisé (PDF, JPEG, PNG ou WebP uniquement)" },
                { status: 400 },
            );
        }

        const supabase = await createClient();

        const { data: previous } = await (supabase as any)
            .from("stock_po_validations")
            .select("validation_file_path")
            .eq("odoo_po_id", odooPoId)
            .maybeSingle();

        // Sauvegarde sur disque (hébergement)
        const saved = await saveLocalValidationFile(odooPoId, file);
        const validatedAt = new Date().toISOString();

        const { error: upsertErr } = await (supabase as any)
            .from("stock_po_validations")
            .upsert(
                {
                    odoo_po_id: odooPoId,
                    validation_file_path: saved.relativePath,
                    validation_file_name: saved.fileName,
                    validation_mime_type: saved.mimeType,
                    notes,
                    validated_at: validatedAt,
                    validated_by: access.user.id,
                    updated_at: validatedAt,
                },
                { onConflict: "odoo_po_id" },
            );

        if (upsertErr) {
            await deleteLocalValidationFile(saved.relativePath);
            console.error("[STOCK_PO_VALIDATE] upsert error:", upsertErr.message);
            return NextResponse.json({ error: "Échec enregistrement validation" }, { status: 500 });
        }

        if (
            previous?.validation_file_path &&
            previous.validation_file_path !== saved.relativePath
        ) {
            await deleteLocalValidationFile(previous.validation_file_path);
        }

        clearStockPoReportCache();

        return NextResponse.json({
            success: true,
            odooPoId,
            isValidated: true,
            validationFileName: saved.fileName,
            validationMimeType: saved.mimeType,
            validationNotes: notes,
            validatedAt,
            validatedBy: access.profile.full_name ?? "—",
        });
    } catch (error) {
        console.error("[STOCK_PO_VALIDATE] POST:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        // Seul l'admin peut retirer une validation
        const access = await requireStockPoValidateAccess(true);
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const odooPoId = Number((await params).id);
        if (!Number.isFinite(odooPoId) || odooPoId <= 0) {
            return NextResponse.json({ error: "ID PO invalide" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: existing } = await (supabase as any)
            .from("stock_po_validations")
            .select("validation_file_path")
            .eq("odoo_po_id", odooPoId)
            .maybeSingle();

        if (!existing) {
            return NextResponse.json({
                success: true,
                odooPoId,
                isValidated: false,
                validationFileName: null,
                validationMimeType: null,
                validationNotes: null,
                validatedAt: null,
                validatedBy: null,
            });
        }

        const { error: delErr } = await (supabase as any)
            .from("stock_po_validations")
            .delete()
            .eq("odoo_po_id", odooPoId);

        if (delErr) {
            return NextResponse.json({ error: "Échec suppression validation" }, { status: 500 });
        }

        await deleteLocalValidationFile(existing.validation_file_path);
        clearStockPoReportCache();

        return NextResponse.json({
            success: true,
            odooPoId,
            isValidated: false,
            validationFileName: null,
            validationMimeType: null,
            validationNotes: null,
            validatedAt: null,
            validatedBy: null,
        });
    } catch (error) {
        console.error("[STOCK_PO_VALIDATE] DELETE:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}