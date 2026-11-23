import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStockPoAccess } from "@/app/controls/stock-po/_lib/server/stock-po-service";
import { readLocalValidationFile } from "@/app/controls/stock-po/_lib/server/stock-po-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const access = await requireStockPoAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const odooPoId = Number((await params).id);
        const forceDownload = request.nextUrl.searchParams.get("download") === "1";

        if (!Number.isFinite(odooPoId) || odooPoId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: row } = await (supabase as any)
            .from("stock_po_validations")
            .select("validation_file_path, validation_file_name, validation_mime_type")
            .eq("odoo_po_id", odooPoId)
            .maybeSingle();

        if (!row?.validation_file_path) {
            return NextResponse.json({ error: "Justificatif introuvable" }, { status: 404 });
        }

        const buffer = await readLocalValidationFile(row.validation_file_path);
        if (!buffer) {
            return NextResponse.json({ error: "Fichier absent sur le serveur" }, { status: 404 });
        }

        const fileName = row.validation_file_name || `validation-${odooPoId}`;
        const mimeType = row.validation_mime_type || "application/octet-stream";
        const isInlineable =
            !forceDownload &&
            (mimeType === "application/pdf" || mimeType.startsWith("image/"));

        const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
        const utf8Encoded = encodeURIComponent(fileName);

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type": mimeType,
                "Content-Disposition": `${isInlineable ? "inline" : "attachment"}; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`,
                "Content-Length": String(buffer.byteLength),
                "Cache-Control": "private, max-age=300",
            },
        });
    } catch (error) {
        console.error("[STOCK_PO_VALIDATION_FILE] GET:", error);
        return NextResponse.json({ error: "Erreur lecture fichier" }, { status: 500 });
    }
}