// app/api/settings/odoo-locations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Admin requis" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const companyFilter = searchParams.get("company");
        const includeAll = searchParams.get("all") === "true";
        const companyId = companyFilter ? Number(companyFilter) : null;

        const domain: (string | [string, string, unknown])[] = [
            ["usage", "=", "internal"],
            ["active", "=", true],
        ];

        // ─── Filtre company (company du shop + locations partagées) ──
        if (!includeAll && companyId !== null && Number.isFinite(companyId)) {
            domain.push(
                "|",
                ["company_id", "=", companyId],
                ["company_id", "=", false],
            );
        }

        const locations = await odooClient.searchRead<{
            id: number;
            name: string;
            complete_name: string | false;
            usage: string;
            company_id: [number, string] | false;
        }>("stock.location", {
            domain,
            fields: ["name", "complete_name", "usage", "company_id"],
            limit: 2000,
            order: "complete_name asc",
        });

        console.log(
            `[ODOO_LOCATIONS] company=${companyId ?? "all"} includeAll=${includeAll} → ${locations.length} résultats`,
        );

        return NextResponse.json({ locations });
    } catch (error) {
        console.error("[SETTINGS_ODOO_LOCATIONS]", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}