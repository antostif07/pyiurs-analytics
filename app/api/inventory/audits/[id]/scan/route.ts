// app/api/inventory/audits/[id]/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordBarcodeScanAction } from "@/app/inventory/audits/_lib/audits-actions";

export const dynamic = "force-dynamic";

interface RouteParams {
    params: Promise<{ id: string }>;
}

interface ScanBody {
    barcode: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: auditId } = await params;
        if (!auditId) {
            return NextResponse.json(
                { error: "ID d'audit manquant" },
                { status: 400 },
            );
        }

        // Auth
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // Body
        const body: ScanBody = await request.json();
        const barcode =
            typeof body.barcode === "string" ? body.barcode.trim() : "";

        if (!barcode) {
            return NextResponse.json(
                { error: "Code-barres manquant" },
                { status: 400 },
            );
        }

        // Délègue au Server Action existant (logique métier inchangée)
        const result = await recordBarcodeScanAction(auditId, barcode);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[AUDIT_SCAN_API] error:", error);
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Erreur serveur lors du scan",
            },
            { status: 500 },
        );
    }
}