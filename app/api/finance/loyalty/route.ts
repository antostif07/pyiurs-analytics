// app/api/finance/loyalty/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { buildDomain } from "@/lib/odoo/domain";
import { createClient } from "@/lib/supabase/server";
import { formatPhoneNumber } from "@/lib/whatsapp/send";
import {
    computePointsEarned,
    getTodayRangeKinshasa,
} from "@/app/finance/loyalty/_lib/loyalty-helpers";
import type {
    LoyaltyOrderRow,
    LoyaltyKpis,
    LoyaltyReportData,
} from "@/app/finance/loyalty/_lib/types";

export const dynamic = "force-dynamic";

function formatOdooDate(iso: string): string {
    if (!iso) return "";
    const [d] = iso.split(" ");
    return d;
}

function buildKpis(orders: LoyaltyOrderRow[]): LoyaltyKpis {
    const sent = orders.filter((o) => o.isSent);
    const pending = orders.filter((o) => !o.isSent);
    const invalidPhone = orders.filter((o) => !o.isPhoneValid);

    return {
        totalOrders: orders.length,
        totalAmount: orders.reduce((s, o) => s + o.amount, 0),
        sentCount: sent.length,
        pendingCount: pending.length,
        invalidPhoneCount: invalidPhone.length,
        totalPointsEarned: orders.reduce((s, o) => s + o.pointsEarned, 0),
    };
}

const EMPTY_PAYLOAD: LoyaltyReportData = {
    kpis: {
        totalOrders: 0,
        totalAmount: 0,
        sentCount: 0,
        pendingCount: 0,
        invalidPhoneCount: 0,
        totalPointsEarned: 0,
    },
    orders: [],
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Période : ?date=yyyy-MM-dd ou aujourd'hui par défaut
        const dateParam = searchParams.get("date");
        const { from, to } = dateParam
            ? { from: dateParam, to: dateParam }
            : getTodayRangeKinshasa();

        const fromDate = `${from} 00:00:00`;
        const toDate = `${to} 23:59:59`;

        // ─── 1. Récupérer les POS orders payés du jour ────────────────
        const orders = await odooClient.searchRead<{
            id: number;
            name: string;
            date_order: string;
            partner_id: [number, string] | false;
            session_id: [number, string] | false;
            amount_total: number;
            state: string;
        }>("pos.order", {
            domain: buildDomain(
                ["date_order", ">=", fromDate],
                ["date_order", "<=", toDate],
                ["state", "in", ["paid", "done", "invoiced"]],
                ["amount_total", ">", 0],
            ),
            fields: [
                "name",
                "date_order",
                "partner_id",
                "session_id",
                "amount_total",
                "state",
            ],
            limit: 500,
            order: "date_order desc",
        });

        if (orders.length === 0) {
            return NextResponse.json(EMPTY_PAYLOAD);
        }

        // ─── 2. Récupérer les partenaires (téléphones) ────────────────
        const partnerIds = [
            ...new Set(
                orders
                    .map((o) => (Array.isArray(o.partner_id) ? o.partner_id[0] : null))
                    .filter((v): v is number => v !== null),
            ),
        ];

        const partners = partnerIds.length
            ? await odooClient.searchRead<{
                id: number;
                name: string;
                phone: string | false;
                mobile: string | false;
            }>("res.partner", {
                domain: [["id", "in", partnerIds]],
                fields: ["name", "phone",],
                limit: partnerIds.length,
            })
            : [];

        const partnerById = new Map(partners.map((p) => [p.id, p]));

        // ─── 3. Jointure Supabase (transactions envoyées) ─────────────
        const orderIds = orders.map((o) => o.id);
        const supabase = await createClient();

        const { data: transactions, error: txErr } = await supabase
            .from("loyalty_transactions")
            .select("odoo_order_id, sent_at, sent_by, whatsapp_message_id")
            .in("odoo_order_id", orderIds);

        if (txErr) {
            console.warn("[LOYALTY_API] transactions fetch failed:", txErr.message);
        }

        // Noms des envoyeurs
        const senderIds = [
            ...new Set(
                (transactions ?? [])
                    .map((t) => t.sent_by)
                    .filter((v): v is string => typeof v === "string"),
            ),
        ];

        let nameById = new Map<string, string>();
        if (senderIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", senderIds);
            nameById = new Map(
                (profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]),
            );
        }

        const txByOrder = new Map(
            (transactions ?? []).map((t) => [t.odoo_order_id, t]),
        );

        // ─── 4. Construire les lignes ─────────────────────────────────
        const rows: LoyaltyOrderRow[] = orders.map((o) => {
            const partnerId = Array.isArray(o.partner_id) ? o.partner_id[0] : null;
            const partner = partnerId ? partnerById.get(partnerId) : undefined;

            // Téléphone : priorité mobile > phone
            const rawPhone =
                (partner?.mobile && String(partner.mobile).trim()) ||
                (partner?.phone && String(partner.phone).trim()) ||
                null;

            const normalizedPhone = rawPhone ? formatPhoneNumber(rawPhone) : null;
            const isPhoneValid = normalizedPhone !== null;

            const amount = Number(o.amount_total ?? 0);
            const tx = txByOrder.get(o.id);

            return {
                odooOrderId: o.id,
                orderName: o.name,
                date: formatOdooDate(o.date_order),
                partnerName: Array.isArray(o.partner_id) ? o.partner_id[1] : null,
                odooPartnerId: partnerId,
                posName: Array.isArray(o.session_id) ? o.session_id[1] : "—",
                amount,
                rawPhone,
                normalizedPhone,
                isPhoneValid,
                pointsEarned: computePointsEarned(amount),
                isSent: !!tx,
                sentAt: tx?.sent_at ?? null,
                sentBy: tx?.sent_by ? nameById.get(tx.sent_by) ?? "—" : null,
                whatsappMessageId: tx?.whatsapp_message_id ?? null,
            };
        });

        const payload: LoyaltyReportData = {
            kpis: buildKpis(rows),
            orders: rows,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("[LOYALTY_API] GET error:", error);
        return NextResponse.json(EMPTY_PAYLOAD, { status: 500 });
    }
}