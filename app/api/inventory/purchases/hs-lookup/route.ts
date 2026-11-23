import { NextRequest, NextResponse } from "next/server";
import { getServerAuth } from "@/lib/supabase/server";
import { canAccessPurchases } from "@/lib/auth/roles";
import { lookupOdooProducts } from "@/app/inventory/purchases/import-generator/_lib/server/import-odoo-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const auth = await getServerAuth();
        if (!auth.user || !auth.profile || !canAccessPurchases(auth.profile.role)) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const sp = request.nextUrl.searchParams;
        const codeHs = sp.get("code") ?? "";
        const brand = sp.get("brand") ?? "";
        const departement = sp.get("departement") ?? "";

        const data = await lookupOdooProducts({ codeHs, brand, departement });
        return NextResponse.json(data);
    } catch (error) {
        console.error("[HS_LOOKUP_API] error:", error);
        return NextResponse.json({ exactMatches: [], sameBrandProducts: [] }, { status: 500 });
    }
}