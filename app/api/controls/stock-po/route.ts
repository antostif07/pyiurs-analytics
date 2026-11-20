import { NextRequest, NextResponse } from "next/server";
import { parseStockPoFilters } from "@/app/controls/stock-po/_lib/filters";
import {
    EMPTY_STOCK_PO_PAYLOAD,
    fetchStockPoReport,
    requireStockPoAccess,
} from "@/app/controls/stock-po/_lib/server/stock-po-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const access = await requireStockPoAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const sp = new URL(request.url).searchParams;
        const filters = parseStockPoFilters(Object.fromEntries(sp.entries()));
        const forceRefresh = sp.get("refresh") === "1";

        const payload = await fetchStockPoReport(filters, { forceRefresh });
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[STOCK_PO_API] GET error:", error);
        return NextResponse.json(EMPTY_STOCK_PO_PAYLOAD, { status: 500 });
    }
}