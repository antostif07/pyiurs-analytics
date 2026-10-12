// app/api/finance/loyalty/[orderId]/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppTemplate, formatPhoneNumber } from "@/lib/whatsapp/send";
import {
    computePointsEarned,
    computeExpirationDate,
    formatDateForTemplate,
} from "@/app/finance/loyalty/_lib/loyalty-helpers";
import type { SendLoyaltyResult } from "@/app/finance/loyalty/_lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "financier", "controller"];
const TEMPLATE_NAME = "solde_points_fidelite";

interface RouteParams {
    params: Promise<{ orderId: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
    try {
        const { orderId: rawId } = await params;
        const orderId = Number(rawId);

        if (!Number.isFinite(orderId) || orderId <= 0) {
            return NextResponse.json({ error: "ID invalide" }, { status: 400 });
        }

        // ─── 1. Auth + rôle ───────────────────────────────────────────
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

        // ─── 2. Idempotence — déjà envoyé ? ───────────────────────────
        const { data: existing } = await supabase
            .from("loyalty_transactions")
            .select("id, points_earned, points_balance_after, whatsapp_message_id")
            .eq("odoo_order_id", orderId)
            .maybeSingle();

        if (existing) {
            const result: SendLoyaltyResult = {
                success: true,
                orderId,
                pointsEarned: existing.points_earned,
                newBalance: existing.points_balance_after,
                whatsappMessageId: existing.whatsapp_message_id,
            };
            return NextResponse.json(result);
        }

        // ─── 3. Charger la commande Odoo ──────────────────────────────
        const orders = await odooClient.searchRead<{
            id: number;
            name: string;
            date_order: string;
            partner_id: [number, string] | false;
            session_id: [number, string] | false;
            amount_total: number;
            state: string;
        }>("pos.order", {
            domain: [["id", "=", orderId]],
            fields: ["name", "date_order", "partner_id", "session_id", "amount_total", "state"],
            limit: 1,
        });

        const order = orders[0];
        if (!order) {
            return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
        }

        if (!["paid", "done", "invoiced"].includes(order.state)) {
            return NextResponse.json(
                { error: `Statut ${order.state} non éligible` },
                { status: 400 },
            );
        }

        const amount = Number(order.amount_total ?? 0);
        if (amount <= 0) {
            return NextResponse.json(
                { error: "Montant nul ou négatif" },
                { status: 400 },
            );
        }

        const pointsEarned = computePointsEarned(amount);
        if (pointsEarned <= 0) {
            return NextResponse.json(
                { error: "Montant trop faible — aucun point à créditer" },
                { status: 400 },
            );
        }

        // ─── 4. Charger le partenaire (téléphone) ─────────────────────
        const partnerId = Array.isArray(order.partner_id) ? order.partner_id[0] : null;
        const partnerName = Array.isArray(order.partner_id) ? order.partner_id[1] : null;

        if (!partnerId) {
            return NextResponse.json(
                { error: "Aucun client associé à la commande" },
                { status: 400 },
            );
        }

        const partners = await odooClient.searchRead<{
            id: number;
            name: string;
            phone: string | false;
        }>("res.partner", {
            domain: [["id", "=", partnerId]],
            fields: ["name", "phone"],
            limit: 1,
        });

        const partner = partners[0];
        const rawPhone = partner?.phone && String(partner.phone).trim() || null;

        if (!rawPhone) {
            return NextResponse.json(
                { error: "Client sans numéro de téléphone" },
                { status: 400 },
            );
        }

        const normalizedPhone = formatPhoneNumber(rawPhone);
        if (!normalizedPhone) {
            return NextResponse.json(
                { error: `Numéro invalide : ${rawPhone}` },
                { status: 400 },
            );
        }

        // ─── 5. Upsert client fidélité ────────────────────────────────
        const { data: existingCustomer } = await supabase
            .from("loyalty_customers")
            .select("id, total_points")
            .eq("phone", normalizedPhone)
            .maybeSingle();

        const currentBalance = existingCustomer?.total_points ?? 0;
        const newBalance = currentBalance + pointsEarned;

        let customerId: string;

        if (existingCustomer) {
            customerId = existingCustomer.id;
            const { error: updErr } = await supabase
                .from("loyalty_customers")
                .update({
                    total_points: newBalance,
                    last_visit_at: new Date().toISOString(),
                    full_name: partnerName ?? undefined,
                    odoo_partner_id: partnerId,
                })
                .eq("id", customerId);

            if (updErr) {
                console.error("[LOYALTY_SEND] customer update error:", updErr.message);
                return NextResponse.json(
                    { error: "Échec mise à jour client" },
                    { status: 500 },
                );
            }
        } else {
            const { data: inserted, error: insErr } = await supabase
                .from("loyalty_customers")
                .insert({
                    phone: normalizedPhone,
                    full_name: partnerName,
                    odoo_partner_id: partnerId,
                    total_points: pointsEarned,
                    last_visit_at: new Date().toISOString(),
                })
                .select("id")
                .single();

            if (insErr || !inserted) {
                console.error("[LOYALTY_SEND] customer insert error:", insErr?.message);
                return NextResponse.json(
                    { error: "Échec création client" },
                    { status: 500 },
                );
            }

            customerId = inserted.id;
        }

        // ─── 6. Envoyer le WhatsApp ───────────────────────────────────
        const sentAt = new Date();
        const expiresAt = computeExpirationDate(sentAt);
        const expiresAtForTemplate = formatDateForTemplate(expiresAt);

        const wa = await sendWhatsAppTemplate({
            to: normalizedPhone,
            templateName: TEMPLATE_NAME,
            languageCode: "fr",
            bodyParams: [
                partnerName ?? "Client",
                Array.isArray(order.session_id) ? order.session_id[1] : "—",
                String(pointsEarned),
                String(newBalance),
                expiresAtForTemplate,
            ],
        });

        if (!wa.ok) {
            // ─── ROLLBACK : on annule les points déjà crédités ────────
            console.warn("[LOYALTY_SEND] Meta failed, rolling back:", wa.error);

            // Rollback : soustraire les points
            const { error: rbErr } = await supabase
                .from("loyalty_customers")
                .update({ total_points: currentBalance })
                .eq("id", customerId);

            if (rbErr) {
                console.error("[LOYALTY_SEND] rollback error:", rbErr.message);
            }

            return NextResponse.json(
                { error: `Échec envoi WhatsApp : ${wa.error}` },
                { status: 502 },
            );
        }

        // ─── 7. Insérer la transaction ────────────────────────────────
        const { error: txInsErr } = await supabase
            .from("loyalty_transactions")
            .insert({
                customer_id: customerId,
                odoo_order_id: orderId,
                order_name: order.name,
                odoo_partner_id: partnerId,
                partner_name: partnerName,
                pos_name: Array.isArray(order.session_id) ? order.session_id[1] : null,
                amount,
                points_earned: pointsEarned,
                points_balance_after: newBalance,
                expires_at: expiresAt,
                sent_at: sentAt.toISOString(),
                sent_by: user.id,
                whatsapp_message_id: wa.messageId ?? null,
            });

        if (txInsErr) {
            // Rollback points + on log l'erreur
            console.error("[LOYALTY_SEND] tx insert error:", txInsErr.message);
            await supabase
                .from("loyalty_customers")
                .update({ total_points: currentBalance })
                .eq("id", customerId);

            return NextResponse.json(
                { error: "Message envoyé mais échec de l'enregistrement" },
                { status: 500 },
            );
        }

        const result: SendLoyaltyResult = {
            success: true,
            orderId,
            pointsEarned,
            newBalance,
            whatsappMessageId: wa.messageId ?? null,
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error("[LOYALTY_SEND] error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}