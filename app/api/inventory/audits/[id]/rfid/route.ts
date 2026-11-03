// app/api/inventory/audits/[id]/rfid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordRfidBatchAction } from "@/app/inventory/audits/_lib/rfid-actions";

export const dynamic = "force-dynamic";

interface RfidBatchBody {
    epcs: string[];
    readerId?: string;
}

const MAX_EPCS = 1000;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 },
            );
        }

        const { id: auditId } = await params;

        if (!auditId || auditId.trim().length === 0) {
            return NextResponse.json(
                { error: "auditId invalide" },
                { status: 400 },
            );
        }

        const body: RfidBatchBody = await request.json().catch(() => ({
            epcs: [],
        }));

        if (!Array.isArray(body.epcs) || body.epcs.length === 0) {
            return NextResponse.json(
                { error: "Champ `epcs` requis (array non vide)" },
                { status: 400 },
            );
        }

        if (body.epcs.length > MAX_EPCS) {
            return NextResponse.json(
                {
                    error: `Maximum ${MAX_EPCS} EPC par batch (reçu ${body.epcs.length})`,
                },
                { status: 400 },
            );
        }

        const result = await recordRfidBatchAction(
            auditId,
            body.epcs,
            typeof body.readerId === "string" ? body.readerId : undefined,
        );

        if (!result.success) {
            const status =
                result.error?.includes("verrouillé") ||
                    result.error?.includes("introuvable")
                    ? 400
                    : 500;
            return NextResponse.json(
                { error: result.error ?? "Erreur inconnue" },
                { status },
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[RFID_API_ERROR]", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}