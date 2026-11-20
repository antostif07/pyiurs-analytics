import { NextRequest, NextResponse } from "next/server";
import {
    fetchRedsupOrderDetails,
    requireRedsupAccess,
} from "@/app/controls/validation-remise/_lib/server/redsup-service";

export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const access = await requireRedsupAccess();
        if (!access.ok) {
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const odooOrderId = Number((await params).id);
        if (!Number.isFinite(odooOrderId) || odooOrderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }
        const details = await fetchRedsupOrderDetails(odooOrderId, access.profile);
        if (!details) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }
        return NextResponse.json(details);
    } catch (error) {
        console.error("[REDSUP_DETAILS_API] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}