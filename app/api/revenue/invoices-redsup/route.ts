// app/api/revenue/invoices-redsup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { buildDomain } from "@/lib/odoo/domain";
import { createClient } from "@/lib/supabase/server";
import { parseRedsupFilters } from "@/app/revenue/invoices-redsup/_lib/filters";
import type {
    RedsupLine,
    RedsupInvoiceRow,
    RedsupKpis,
    RedsupReportData,
} from "@/app/revenue/invoices-redsup/_lib/types";

export const dynamic = "force-dynamic";

const REDSUP_MATCH = "redsup";

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function formatOdooDate(iso: string): string {
    if (!iso) return "";
    const [d] = iso.split(" ");
    return d;
}

function buildKpis(invoices: RedsupInvoiceRow[]): RedsupKpis {
    const validated = invoices.filter((i) => i.isValidated);
    return {
        totalOrders: invoices.length,
        totalAmount: invoices.reduce((s, i) => s + i.totalRedsupAmount, 0),
        totalQty: invoices.reduce((s, i) => s + i.totalRedsupQty, 0),
        validatedCount: validated.length,
        pendingCount: invoices.length - validated.length,
    };
}

const EMPTY_PAYLOAD: RedsupReportData = {
    kpis: {
        totalOrders: 0,
        totalAmount: 0,
        totalQty: 0,
        validatedCount: 0,
        pendingCount: 0,
    },
    invoices: [],
};

// ─────────────────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = parseRedsupFilters(
            Object.fromEntries(searchParams.entries()),
        );

        const fromDate = `${filters.from} 00:00:00`;
        const toDate = `${filters.to} 23:59:59`;

        // ─── 1. Produits RedSup ───────────────────────────────────────
        const redsupProducts = await odooClient.searchRead<{
            id: number;
            name: string;
        }>("product.product", {
            domain: [["name", "ilike", `%${REDSUP_MATCH}%`]],
            fields: ["name"],
            limit: 500,
        });

        if (redsupProducts.length === 0) {
            return NextResponse.json(EMPTY_PAYLOAD);
        }

        const productNameById = new Map(
            redsupProducts.map((p) => [p.id, p.name]),
        );
        const redsupProductIds = redsupProducts.map((p) => p.id);

        // ─── 2. Lignes POS contenant ces produits ─────────────────────
        const lines = await odooClient.searchRead<{
            id: number;
            order_id: [number, string] | false;
            product_id: [number, string] | false;
            qty: number;
            price_unit: number;
            price_subtotal_incl: number;
        }>("pos.order.line", {
            domain: buildDomain(
                ["product_id", "in", redsupProductIds],
                ["order_id.date_order", ">=", fromDate],
                ["order_id.date_order", "<=", toDate],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
            ),
            fields: [
                "order_id",
                "product_id",
                "qty",
                "price_unit",
                "price_subtotal_incl",
            ],
            limit: 5000,
        });

        if (lines.length === 0) {
            return NextResponse.json(EMPTY_PAYLOAD);
        }

        // ─── 3. Récupérer les POS orders uniques ──────────────────────
        const orderIds = [
            ...new Set(
                lines
                    .map((l) =>
                        Array.isArray(l.order_id) ? l.order_id[0] : null,
                    )
                    .filter((v): v is number => v !== null),
            ),
        ];

        const orders = await odooClient.searchRead<{
            id: number;
            name: string;
            date_order: string;
            partner_id: [number, string] | false;
            session_id: [number, string] | false;
            state: string;
        }>("pos.order", {
            domain: [["id", "in", orderIds]],
            fields: ["name", "date_order", "partner_id", "session_id", "state"],
            limit: orderIds.length,
        });

        const orderById = new Map(orders.map((o) => [o.id, o]));

        // ─── 4. Agréger les lignes par order ──────────────────────────
        const linesByOrder = new Map<number, RedsupLine[]>();
        for (const l of lines) {
            const orderId = Array.isArray(l.order_id) ? l.order_id[0] : 0;
            const productId = Array.isArray(l.product_id) ? l.product_id[0] : 0;
            if (!orderId || !productId) continue;

            const list = linesByOrder.get(orderId) ?? [];
            list.push({
                productId,
                productName: productNameById.get(productId) ?? "—",
                qty: Number(l.qty ?? 0),
                unitPrice: Number(l.price_unit ?? 0),
                subtotal: Number(l.price_subtotal_incl ?? 0),
            });
            linesByOrder.set(orderId, list);
        }

        // ─── 5. Jointure Supabase validations ─────────────────────────
        const supabase = await createClient();

        const { data: validations, error: vErr } = await supabase
            .from("redsup_validations")
            .select(
                "odoo_order_id, validation_photo_path, validated_at, validated_by",
            )
            .in("odoo_order_id", orderIds);

        if (vErr) {
            console.warn(
                "[REDSUP_API] validations fetch failed:",
                vErr.message,
            );
        }

        // Noms des valideurs
        const validatorIds = [
            ...new Set(
                (validations ?? [])
                    .map((v) => v.validated_by)
                    .filter((v): v is string => typeof v === "string"),
            ),
        ];

        let nameById = new Map<string, string>();
        if (validatorIds.length > 0) {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", validatorIds);
            nameById = new Map(
                (profiles ?? []).map((p) => [p.id, p.full_name ?? "—"]),
            );
        }

        // Signed URLs
        const photoPaths = (validations ?? [])
            .map((v) => v.validation_photo_path)
            .filter(Boolean);

        const signedUrlByPath = new Map<string, string>();
        if (photoPaths.length > 0) {
            const { data: signed } = await supabase.storage
                .from("redsup-validations")
                .createSignedUrls(photoPaths, 60 * 60);

            for (const s of signed ?? []) {
                if (s.signedUrl && s.path) {
                    signedUrlByPath.set(s.path, s.signedUrl);
                }
            }
        }

        const validationMap = new Map<
            number,
            {
                photoUrl: string | null;
                validatedAt: string;
                validatedBy: string | null;
            }
        >();

        for (const v of validations ?? []) {
            validationMap.set(v.odoo_order_id, {
                photoUrl:
                    signedUrlByPath.get(v.validation_photo_path) ?? null,
                validatedAt: v.validated_at,
                validatedBy: v.validated_by
                    ? nameById.get(v.validated_by) ?? "—"
                    : null,
            });
        }

        // ─── 6. Construire les invoices ───────────────────────────────
        const invoices: RedsupInvoiceRow[] = [];

        for (const [orderId, orderLines] of linesByOrder.entries()) {
            const order = orderById.get(orderId);
            if (!order) continue;

            const v = validationMap.get(orderId);
            const total = orderLines.reduce((s, l) => s + l.subtotal, 0);
            const qty = orderLines.reduce((s, l) => s + l.qty, 0);

            invoices.push({
                odooOrderId: orderId,
                orderName: order.name,
                date: formatOdooDate(order.date_order),
                partnerName: Array.isArray(order.partner_id)
                    ? order.partner_id[1]
                    : "—",
                posName: Array.isArray(order.session_id)
                    ? order.session_id[1]
                    : "—",
                state: order.state,
                totalRedsupAmount: total,
                totalRedsupQty: qty,
                lineCount: orderLines.length,
                lines: orderLines,
                isValidated: !!v,
                validationPhotoUrl: v?.photoUrl ?? null,
                validatedAt: v?.validatedAt ?? null,
                validatedBy: v?.validatedBy ?? null,
            });
        }

        // Tri par date décroissante
        invoices.sort((a, b) => (a.date < b.date ? 1 : -1));

        // ─── 7. Filtre statut local ───────────────────────────────────
        const filtered =
            filters.state === "all"
                ? invoices
                : filters.state === "validated"
                    ? invoices.filter((i) => i.isValidated)
                    : invoices.filter((i) => !i.isValidated);

        const payload: RedsupReportData = {
            kpis: buildKpis(filtered),
            invoices: filtered,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("[REDSUP_API] error:", error);
        return NextResponse.json(EMPTY_PAYLOAD, { status: 500 });
    }
}