// app/api/finance/loyalty/send-bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
    SendLoyaltyResult,
    SendBulkLoyaltyResult,
} from "@/app/finance/loyalty/_lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel : autoriser jusqu'à 60s

interface BulkBody {
    orderIds: number[];
}

export async function POST(request: NextRequest) {
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

        if (!profile || !["admin", "financier", "controller"].includes(profile.role ?? "")) {
            return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
        }

        const body: BulkBody = await request.json();
        const orderIds = Array.isArray(body.orderIds) ? body.orderIds : [];

        if (orderIds.length === 0) {
            return NextResponse.json({ error: "Aucun ID fourni" }, { status: 400 });
        }

        if (orderIds.length > 50) {
            return NextResponse.json(
                { error: "Trop d'IDs (max 50 par appel)" },
                { status: 400 },
            );
        }

        // Récupérer les cookies + URL absolue pour appeler le endpoint unitaire
        const origin = new URL(request.url).origin;

        const results: SendLoyaltyResult[] = [];
        let succeeded = 0;
        let failed = 0;
        let skippedAlreadySent = 0;
        let skippedInvalidPhone = 0;

        // Séquentiel : Meta a des rate limits stricts, on ne parallelise pas
        for (const orderId of orderIds) {
            try {
                const res = await fetch(
                    `${origin}/api/finance/loyalty/${orderId}/send`,
                    {
                        method: "POST",
                        headers: {
                            // On forward la session pour que l'endpoint unitaire authentifie
                            cookie: request.headers.get("cookie") ?? "",
                        },
                    },
                );

                const data = await res.json();

                if (res.ok) {
                    succeeded++;
                    results.push(data);
                } else {
                    // Classification des skips
                    const err = String(data.error ?? "");
                    if (err.includes("déjà") || err.includes("exist")) {
                        skippedAlreadySent++;
                    } else if (err.includes("téléphone") || err.includes("invalide")) {
                        skippedInvalidPhone++;
                    } else {
                        failed++;
                    }
                    results.push({
                        success: false,
                        orderId,
                        pointsEarned: 0,
                        newBalance: 0,
                        whatsappMessageId: null,
                        error: err,
                    });
                }

                // Pause 300ms entre chaque envoi (anti rate limit Meta)
                await new Promise((r) => setTimeout(r, 300));
            } catch (err) {
                failed++;
                results.push({
                    success: false,
                    orderId,
                    pointsEarned: 0,
                    newBalance: 0,
                    whatsappMessageId: null,
                    error: err instanceof Error ? err.message : "Erreur réseau",
                });
            }
        }

        const payload: SendBulkLoyaltyResult = {
            total: orderIds.length,
            succeeded,
            failed,
            skippedInvalidPhone,
            skippedAlreadySent,
            results,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("[LOYALTY_BULK] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}