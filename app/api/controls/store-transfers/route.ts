import { parseTransferFilters } from "@/app/controls/store-transfers/_lib/filters";
import { EMPTY_TRANSFERS_PAYLOAD, fetchStoreTransfersReport, requireTransfersAccess } from "@/app/controls/store-transfers/_lib/server/transfer-service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const access = await requireTransfersAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const sp = new URL(request.url).searchParams;
        const filters = parseTransferFilters(Object.fromEntries(sp.entries()));
        const payload = await fetchStoreTransfersReport(filters, access.profile, {
            forceRefresh: sp.get("refresh") === "1",
        });

        return NextResponse.json(payload);
    } catch (error) {
        console.error("[STORE_TRANSFERS_API] GET:", error);
        return NextResponse.json(EMPTY_TRANSFERS_PAYLOAD, { status: 500 });
    }
}