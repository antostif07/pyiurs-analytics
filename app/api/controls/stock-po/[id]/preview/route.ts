import { NextRequest, NextResponse } from "next/server";
import {
    fetchStockPoExcelPreview,
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

        if (!Number.isFinite(poId) || poId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }
        if (!field || !STOCK_PO_FILE_FIELDS.includes(field)) {
            return NextResponse.json({ error: "Champ fichier invalide" }, { status: 400 });
        }

        const preview = await fetchStockPoExcelPreview(poId, field);
        if (!preview) {
            return NextResponse.json({ error: "Fichier Excel introuvable" }, { status: 404 });
        }

        return NextResponse.json(preview);
    } catch (error) {
        console.error("[STOCK_PO_EXCEL_PREVIEW_API] error:", error);
        return NextResponse.json({ error: "Impossible de lire le fichier Excel" }, { status: 500 });
    }
}