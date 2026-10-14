// app/api/inventory/audits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    getAuditsAction,
    createAuditSessionAction,
} from "@/app/inventory/audits/_lib/audits-actions";
import { parseAuditFilters } from "@/app/inventory/audits/_lib/filters";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────
// GET — liste filtrée par scope + filtres UI
// ─────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const filters = parseAuditFilters(
            Object.fromEntries(new URL(request.url).searchParams.entries()),
        );

        // Server Action = source de vérité du scope (assigned_shops / companies)
        const audits = await getAuditsAction({
            status: filters.status === "all" ? undefined : filters.status,
            searchQuery: filters.search || undefined,
        });

        return NextResponse.json({ audits });
    } catch (error) {
        console.error("[AUDITS_LIST_API] error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────
// POST — création d'une session d'audit
// ─────────────────────────────────────────────────────────────────────────

interface CreateAuditBody {
    shopIds: string[];
    departments: string[];
    notes?: string;
    auditDate?: string;
    purchaseOrderIds?: number[];   // ⬅️ NOUVEAU
}


export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        const body: CreateAuditBody = await request.json();

        const shopIds = Array.isArray(body.shopIds) ? body.shopIds : [];
        const departments = Array.isArray(body.departments) ? body.departments : [];

        if (shopIds.length === 0) {
            return NextResponse.json(
                { error: "Veuillez sélectionner au moins une boutique." },
                { status: 400 },
            );
        }

        const result = await createAuditSessionAction(
            shopIds,
            departments,
            body.notes,
            body.auditDate,
            Array.isArray(body.purchaseOrderIds) && body.purchaseOrderIds.length > 0
                ? body.purchaseOrderIds
                : undefined,
        );

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[AUDITS_CREATE_API] error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}