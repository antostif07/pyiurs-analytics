import { NextRequest, NextResponse } from "next/server";
import { parseSansCodeFilters } from "@/app/controls/sans-code/_lib/filters";
import {
    EMPTY_SANS_CODE_PAYLOAD,
    fetchSansCodeReport,
    requireSansCodeAccess,
} from "@/app/controls/sans-code/_lib/server/sans-code-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const access = await requireSansCodeAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const { searchParams } = new URL(request.url);
        const filters = parseSansCodeFilters(
            Object.fromEntries(searchParams.entries()),
        );

        const payload = await fetchSansCodeReport(filters, access.profile);
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[SANS_CODE_API] error:", error);
        return NextResponse.json(EMPTY_SANS_CODE_PAYLOAD, { status: 500 });
    }
}