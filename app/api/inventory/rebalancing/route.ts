// app/api/inventory/rebalancing/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import type { RebalancingRow, RebalancingSource } from "@/app/inventory/rebalancing/_lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
];

export async function GET(request: NextRequest) {
    try {
        // ─── Auth ────────────────────────────────────────────────
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

        // ─── Params ──────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const companyParam = searchParams.get("company");
        const companyId = companyParam ? Number(companyParam) : null;

        if (!companyId || !Number.isFinite(companyId)) {
            return NextResponse.json(
                { error: "Company requise" },
                { status: 400 },
            );
        }

        // ─── Shops + leurs locations ─────────────────────────────
        const { data: shops, error: shopsErr } = await supabase
            .from("shops")
            .select(`
                id, name,
                shop_locations ( id, odoo_location_id, odoo_location_name, is_active )
            `)
            .eq("odoo_company_id", companyId);

        if (shopsErr) throw new Error(shopsErr.message);

        const shopsWithLocations = (shops ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            locations: ((s.shop_locations ?? []) as Array<{
                id: string;
                odoo_location_id: number;
                odoo_location_name: string;
                is_active: boolean;
            }>).filter((l) => l.is_active),
        }));

        const shopsWithoutLocations = shopsWithLocations
            .filter((s) => s.locations.length === 0)
            .map((s) => ({ id: s.id, name: s.name }));

        const locationToShop = new Map<
            number,
            { shopId: string; shopName: string }
        >();
        const allLocationIds: number[] = [];

        for (const shop of shopsWithLocations) {
            for (const loc of shop.locations) {
                allLocationIds.push(loc.odoo_location_id);
                locationToShop.set(loc.odoo_location_id, {
                    shopId: shop.id,
                    shopName: shop.name,
                });
            }
        }

        if (allLocationIds.length === 0) {
            return NextResponse.json({
                companyId,
                rows: [],
                shopsWithoutLocations,
            });
        }

        // ─── Quants négatifs dans ces locations ──────────────────
        const quants = await odooClient.searchRead<{
            id: number;
            product_id: [number, string] | false;
            location_id: [number, string] | false;
            quantity: number;
        }>("stock.quant", {
            domain: [
                ["location_id", "in", allLocationIds],
                ["quantity", "<", 0],
            ],
            fields: ["product_id", "location_id", "quantity"],
            limit: 5000,
            order: "product_id asc, quantity asc",
        });

        if (quants.length === 0) {
            return NextResponse.json({
                companyId,
                rows: [],
                shopsWithoutLocations,
            });
        }

        // ─── Enrichissement produits ─────────────────────────────
        const productIds = [
            ...new Set(
                quants
                    .map((q) =>
                        Array.isArray(q.product_id) ? q.product_id[0] : null,
                    )
                    .filter((v): v is number => v !== null),
            ),
        ];

        const products = await odooClient.searchRead<{
            id: number;
            barcode: string | false;
            default_code: string | false;
            standard_price: number;
            list_price: number;
        }>("product.product", {
            domain: [["id", "in", productIds]],
            fields: [
                "barcode",
                "default_code",
                "standard_price",
                "list_price",
            ],
            limit: productIds.length,
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // ═══════════════════════════════════════════════════════════
        // SOURCES POSITIVES — où trouver ces produits ailleurs
        // ═══════════════════════════════════════════════════════════

        // 1. Récupérer tous les quants positifs (toutes companies)
        const positiveQuants = await odooClient.searchRead<{
            id: number;
            product_id: [number, string] | false;
            location_id: [number, string] | false;
            quantity: number;
            company_id: [number, string] | false;
        }>("stock.quant", {
            domain: [
                ["product_id", "in", productIds],
                ["location_id.usage", "=", "internal"],
                ["quantity", ">", 0],
            ],
            fields: ["product_id", "location_id", "quantity", "company_id"],
            limit: 10000,
            order: "quantity desc",
        });

        // 2. Cache des locations Odoo (pour les noms complets)
        const positiveLocationIds = [
            ...new Set(
                positiveQuants
                    .map((q) =>
                        Array.isArray(q.location_id) ? q.location_id[0] : null,
                    )
                    .filter((v): v is number => v !== null),
            ),
        ];

        const odooLocations =
            positiveLocationIds.length > 0
                ? await odooClient.searchRead<{
                    id: number;
                    name: string;
                    complete_name: string | false;
                }>("stock.location", {
                    domain: [["id", "in", positiveLocationIds]],
                    fields: ["name", "complete_name"],
                    limit: positiveLocationIds.length,
                })
                : [];

        const odooLocationMap = new Map(
            odooLocations.map((l) => [
                l.id,
                {
                    name: l.name,
                    complete_name:
                        typeof l.complete_name === "string"
                            ? l.complete_name
                            : null,
                },
            ]),
        );

        // 3. Groupement par product_id
        const sourcesByProduct = new Map<number, RebalancingSource[]>();

        for (const q of positiveQuants) {
            if (
                !Array.isArray(q.product_id) ||
                !Array.isArray(q.location_id) ||
                !Array.isArray(q.company_id)
            ) {
                continue;
            }

            const productId = q.product_id[0];
            const locationId = q.location_id[0];
            const locationOdooName = q.location_id[1];
            const companyId = q.company_id[0];
            const companyName = q.company_id[1];
            const quantity = Number(q.quantity ?? 0);

            if (quantity <= 0) continue;

            const shopInfo = locationToShop.get(locationId);
            const locMeta = odooLocationMap.get(locationId);

            const list = sourcesByProduct.get(productId) ?? [];
            list.push({
                quantId: q.id,
                locationId,
                locationName: locMeta?.name ?? locationOdooName,
                locationCompleteName: locMeta?.complete_name ?? null,
                companyId,
                companyName,
                shopId: shopInfo?.shopId ?? null,
                shopName: shopInfo?.shopName ?? null,
                quantity,
                isConfigured: shopInfo !== undefined,
            });
            sourcesByProduct.set(productId, list);
        }

        // 4. Tri des sources : configured d'abord, puis par qty desc
        for (const [, list] of sourcesByProduct) {
            list.sort((a, b) => {
                if (a.isConfigured !== b.isConfigured) {
                    return a.isConfigured ? -1 : 1;
                }
                return b.quantity - a.quantity;
            });
        }

        // ═══════════════════════════════════════════════════════════
        // MAPPING FINAL → rows
        // ═══════════════════════════════════════════════════════════

        const rows: RebalancingRow[] = [];

        for (const q of quants) {
            if (
                !Array.isArray(q.product_id) ||
                !Array.isArray(q.location_id)
            ) {
                continue;
            }

            const productId = q.product_id[0];
            const productName = q.product_id[1];
            const locationId = q.location_id[0];
            const locationName = q.location_id[1];
            const quantity = Number(q.quantity ?? 0);

            if (quantity >= 0) continue;

            const shopInfo = locationToShop.get(locationId);
            const prodInfo = productMap.get(productId);

            const rawBarcode =
                prodInfo?.barcode || prodInfo?.default_code || null;
            const barcode =
                typeof rawBarcode === "string" && rawBarcode.trim()
                    ? rawBarcode.trim()
                    : null;

            let unitCost = Number(prodInfo?.standard_price ?? 0);
            if (!unitCost || unitCost <= 0) {
                unitCost = Number(prodInfo?.list_price ?? 0) * 0.4;
            }

            // Filtre : on exclut les sources qui sont la MÊME location
            // que la destination (pas pertinent de transférer vers soi-même)
            const sources = (
                sourcesByProduct.get(productId) ?? []
            ).filter((s) => s.locationId !== locationId);

            rows.push({
                quantId: q.id,
                odooProductId: productId,
                productName,
                barcode,
                locationId,
                locationName,
                shopId: shopInfo?.shopId ?? null,
                shopName: shopInfo?.shopName ?? null,
                quantity,
                unitCost,
                listPrice: Number(prodInfo?.list_price ?? 0),
                value: quantity * unitCost,
                sources,
            });
        }

        // ─── Totaux ──────────────────────────────────────────────
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
                    error instanceof Error
                        ? error.message
                        : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}