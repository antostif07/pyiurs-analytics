// app/api/revenue/arpu/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getArpuStats } from "@/app/actions/arpu";
import { createClient } from "@/lib/supabase/server";
import { parseArpuFilters } from "@/app/revenue/arpu/_lib/filters";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
    "admin",
    "manager",
    "financier",
    "controller",
];

export async function GET(request: NextRequest) {
    try {
        // ─── Auth ──────────────────────────────────────────────
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 },
            );
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

        // ─── Filtres URL ───────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const filters = parseArpuFilters(
            Object.fromEntries(searchParams.entries()),
        );

        // ─── Conversion ISO → Date ─────────────────────────────
        const fromDate = new Date(filters.from + "T00:00:00");
        const toDate = new Date(filters.to + "T23:59:59");

        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
            return NextResponse.json(
                { error: "Dates invalides" },
                { status: 400 },
            );
        }

        // ─── Server Action (source de vérité métier) ───────────
        const data = await getArpuStats(
            { from: fromDate, to: toDate },
            filters.segments,
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("[ARPU_API]", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}