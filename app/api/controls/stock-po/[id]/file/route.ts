import { NextRequest, NextResponse } from "next/server";
import {
    fetchStockPoBinaryFile,
    requireStockPoAccess,
    STOCK_PO_FILE_FIELDS,
    type StockPoFileField,
} from "@/app/controls/stock-po/_lib/server/stock-po-service";

export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const access = await requireStockPoAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const poId = Number((await params).id);
        const field = request.nextUrl.searchParams.get("field") as StockPoFileField | null;
        const forceDownload = request.nextUrl.searchParams.get("download") === "1";

        if (!Number.isFinite(poId) || poId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }
        if (!field || !STOCK_PO_FILE_FIELDS.includes(field)) {
            return NextResponse.json({ error: "Champ fichier invalide" }, { status: 400 });
        }

        const file = await fetchStockPoBinaryFile(poId, field);
        if (!file) {
            return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
        }

        const isInlineable =
            !forceDownload &&
            (file.mimeType === "application/pdf" || file.mimeType.startsWith("image/"));

        const asciiFallback = file.fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
        const utf8Encoded = encodeURIComponent(file.fileName);

        return new NextResponse(new Uint8Array(file.buffer), {
            status: 200,
            headers: {
                "Content-Type": file.mimeType,
                "Content-Disposition": `${isInlineable ? "inline" : "attachment"}; filename="${asciiFallback}"; filename*=UTF-8''${utf8Encoded}`,
                "Content-Length": String(file.buffer.byteLength),
                "Cache-Control": "private, max-age=300",
            },
        });
    } catch (error) {
        console.error("[STOCK_PO_FILE_API] GET error:", error);
        return NextResponse.json({ error: "Erreur téléchargement" }, { status: 500 });
    }
}