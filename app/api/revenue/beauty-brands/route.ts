import { NextRequest, NextResponse } from "next/server";
import { parseBeautyFilters } from "@/app/revenue/beauty-brands/_lib/filters";
import {
    fetchBeautyBrandsReport,
    requireBeautyBrandsAccess,
} from "@/app/revenue/beauty-brands/_lib/server/beauty-brands-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const access = await requireBeautyBrandsAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }

        const sp = new URL(request.url).searchParams;
        const filters = parseBeautyFilters(Object.fromEntries(sp.entries()));
        const forceRefresh = sp.get("refresh") === "1";

        const payload = await fetchBeautyBrandsReport(filters, access.profile, {
            forceRefresh,
        });
        return NextResponse.json(payload);
    } catch (error) {
        console.error("[BEAUTY_BRANDS_API] GET error:", error);
        return NextResponse.json({ error: "Erreur chargement Beauty" }, { status: 500 });
    }
}