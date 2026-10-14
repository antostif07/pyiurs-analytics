// app/api/inventory/audits/purchase-orders/route.ts
import { NextResponse } from "next/server";
import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Préfixes fournisseurs "à auditer" */
const SUPPLIER_PREFIXES = ["P.FEM", "P.BTY", "P.KID"] as const;

/**
 * Extrait le préfixe (P.FEM, P.BTY, P.KID) du nom fournisseur.
 * Retourne null si aucun match.
 */
function extractPrefix(supplierName: string): string | null {
    const upper = supplierName.toUpperCase();
    for (const p of SUPPLIER_PREFIXES) {
        if (upper.startsWith(p)) return p;
    }
    return null;
}

export async function GET() {
    try {
        // Auth
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
        }

        // Domain Odoo : 3 préfixes en OR
        const domain: OdooDomain = [
            "|",
            "|",
            ["partner_id.name", "=ilike", "P.FEM%"],
            ["partner_id.name", "=ilike", "P.BTY%"],
            ["partner_id.name", "=ilike", "P.KID%"],
            ["state", "in", ["purchase", "done"]],
        ];

        const orders = await odooClient.searchRead<{
            id: number;
            name: string;
            partner_id: [number, string] | false;
            partner_ref: string | false;
            date_order: string;
            amount_total: number;
            state: string;
        }>("purchase.order", {
            domain,
            fields: ["name", "partner_id", "date_order", "amount_total", "state", "partner_ref",],
            limit: 10000,
            order: "date_order desc, id desc",
        });

        // Normalisation + filtrage des préfixes non reconnus
        const result = orders
            .map((o) => {
                const supplierName = Array.isArray(o.partner_id)
                    ? o.partner_id[1]
                    : "—";
                const prefix = extractPrefix(supplierName);
                if (!prefix) return null;

                const partnerRef =
                    typeof o.partner_ref === "string" && o.partner_ref.trim()
                        ? o.partner_ref.trim()
                        : "—";

                return {
                    id: o.id,
                    name: o.name,
                    supplierName,
                    supplierPrefix: prefix,
                    partnerRef, // ⬅️ NOUVEAU
                    date: (o.date_order ?? "").split(" ")[0],
                    amount: Number(o.amount_total ?? 0),
                    state: o.state,
                };
            })
            .filter((o): o is NonNullable<typeof o> => o !== null);

        return NextResponse.json({ orders: result });
    } catch (error) {
        console.error("[AUDITS_PURCHASE_ORDERS] error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur serveur" },
            { status: 500 },
        );
    }
}