import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/supabase/server";
import { isHrRole } from "@/lib/auth/hr-roles";
import { parseHrDashboardFilters } from "@/app/hr/_lib/filters";
import { fetchHrDashboardData } from "@/app/hr/_lib/server/hr-dashboard-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const auth = await getServerAuth();
        if (!auth.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        if (!auth.profile || !isHrRole(auth.profile.role)) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const filters = parseHrDashboardFilters(
            Object.fromEntries(new URL(request.url).searchParams.entries()),
        );
        const data = await fetchHrDashboardData(auth.profile, filters);
        return NextResponse.json(data);
    } catch (error) {
        console.error("[HR_DASHBOARD_API] GET:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}