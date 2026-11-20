import { NextRequest, NextResponse } from "next/server";
import { parseClotureFilters } from "@/app/revenue/cloture-vente/_lib/filters";
import {
    fetchDailyClosingReport,
    requireRevenueClotureAccess,
} from "@/app/revenue/cloture-vente/_lib/server/cloture-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const access = await requireRevenueClotureAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const filters = parseClotureFilters(
            Object.fromEntries(new URL(request.url).searchParams.entries()),
        );
        const payload = await fetchDailyClosingReport(filters, access.profile);
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[CLOTURE_API] GET error:", error);
        return NextResponse.json({ error: "Erreur chargement clôture" }, { status: 500 });
    }
}