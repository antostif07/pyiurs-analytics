import { NextRequest, NextResponse } from "next/server";
import {
    EMPTY_REDSUP_PAYLOAD,
    fetchRedsupReport,
    requireRedsupAccess,
} from "@/app/controls/validation-remise/_lib/server/redsup-service";
import { parseRedsupFilters } from "@/app/controls/validation-remise/_lib/filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const access = await requireRedsupAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const filters = parseRedsupFilters(
            Object.fromEntries(new URL(request.url).searchParams.entries()),
        );
        const payload = await fetchRedsupReport(filters, access.profile);
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[REDSUP_API] GET error:", error);
        return NextResponse.json(EMPTY_REDSUP_PAYLOAD, { status: 500 });
    }
}