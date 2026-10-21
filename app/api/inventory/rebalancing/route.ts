// app/api/inventory/rebalancing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchRebalancingData } from "@/app/inventory/rebalancing/_lib/fetch-rebalancing";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
];

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !ALLOWED_ROLES.includes(profile.role ?? "")) {
            return NextResponse.json(
                { error: "Permissions insuffisantes" },
                { status: 403 },
            );
        }

        const { searchParams } = new URL(request.url);
        const companyParam = searchParams.get("company");
        const companyId = companyParam ? Number(companyParam) : null;

        if (!companyId || !Number.isFinite(companyId)) {
            return NextResponse.json(
                { error: "Company requise" },
                { status: 400 },
            );
        }

        const { rows, shopsWithoutLocations } = await fetchRebalancingData(
            supabase,
            companyId,
        );

        const totals = {
            count: rows.length,
            totalQty: rows.reduce((s, r) => s + r.quantity, 0),
            totalValue: rows.reduce((s, r) => s + r.value, 0),
            withSource: rows.filter((r) => r.sources.length > 0).length,
            lostCount: rows.filter((r) => r.sources.length === 0).length,
        };

        return NextResponse.json({
            companyId,
            rows,
            totals,
            shopsWithoutLocations,
        });
    } catch (error) {
        console.error("[REBALANCING_API]", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}