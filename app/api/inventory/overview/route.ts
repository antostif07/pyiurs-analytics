// app/api/inventory/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import type { OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import type {
    InventoryOverviewData,
    InventorySegment,
    InventoryStockSnapshot,
} from "@/app/inventory/_lib/types";
import { buildCompanyLocationDomain } from "./helpers";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
    "financier",
    "controller",
];

const GROUP_WIDE_ROLES = ["admin", "financier", "controller"];

/* ══════════════════════════════════════════════════════════════════ */
/* RÈGLES MÉTIER                                                    */
/* ══════════════════════════════════════════════════════════════════ */

function resolveSaleUnitPrice(listPrice: number, segment: string): number {
    if (!Number.isFinite(listPrice) || listPrice <= 0) return 0;
    if (segment.trim().toLowerCase() === "beauty") return listPrice;
    return listPrice * 1.25;
}

function resolveCostUnitPrice(
    standardPrice: number,
    listPrice: number,
): number {
    const std = Number(standardPrice);
    if (Number.isFinite(std) && std > 0) return std;
    const lp = Number(listPrice);
    if (Number.isFinite(lp) && lp > 0) return lp * 0.4;
    return 0;
}

function emptySnapshot(): InventoryStockSnapshot {
    return {
        totalUnits: 0,
        productCount: 0,
        saleValue: 0,
        costValue: 0,
        marginValue: 0,
        marginRate: 0,
    };
}

function finalizeSnapshot(
    s: InventoryStockSnapshot,
): InventoryStockSnapshot {
    const margin = s.saleValue - s.costValue;
    const rate = s.saleValue > 0 ? (margin / s.saleValue) * 100 : 0;
    return { ...s, marginValue: margin, marginRate: rate };
}

/* ══════════════════════════════════════════════════════════════════ */
/* GET                                                              */
/* ══════════════════════════════════════════════════════════════════ */

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
            .select("role, assigned_companies")
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
        const segmentParam = searchParams.get("segment");
        const fromParam = searchParams.get("from");
        const toParam = searchParams.get("to");

        const requestedCompanyId = companyParam ? Number(companyParam) : null;
        const segment: InventorySegment =
            segmentParam === "Femme" ||
                segmentParam === "Beauty" ||
                segmentParam === "Enfant"
                ? segmentParam
                : "Tous";

        const today = new Date().toISOString().slice(0, 10);
        const from = fromParam ?? today;
        const to = toParam ?? today;
        const fromDate = `${from} 00:00:00`;
        const toDate = `${to} 23:59:59`;

        // ─── Scope companies ─────────────────────────────────────
        const isGroupWide = GROUP_WIDE_ROLES.includes(profile.role ?? "");
        let allowedCompanyIds: number[];

        if (isGroupWide) {
            const { data: shops } = await supabase
                .from("shops")
                .select("odoo_company_id")
                .not("odoo_company_id", "is", null);
            allowedCompanyIds = [
                ...new Set(
                    (shops ?? [])
                        .map((s) => s.odoo_company_id)
                        .filter((id): id is number => typeof id === "number"),
                ),
            ];
        } else {
            allowedCompanyIds = Array.isArray(profile.assigned_companies)
                ? (profile.assigned_companies as unknown[]).filter(
                    (id): id is number => typeof id === "number",
                )
                : [];
        }

        const effectiveCompanyIds =
            requestedCompanyId !== null
                ? allowedCompanyIds.includes(requestedCompanyId)
                    ? [requestedCompanyId]
                    : []
                : allowedCompanyIds;

        const emptyPayload: InventoryOverviewData = {
            period: { from, to },
            opening: emptySnapshot(),
            closing: emptySnapshot(),
            movements: {
                receivedUnits: 0,
                soldUnits: 0,
                netVariation: 0,
            },
            byCompany: [],
        };

        if (effectiveCompanyIds.length === 0) {
            return NextResponse.json(emptyPayload);
        }

        // ═══════════════════════════════════════════════════════════
        // Locations configurées par company (ou absence)
        // ═══════════════════════════════════════════════════════════
        const { data: shopsWithLocations, error: shopsErr } = await supabase
            .from("shops")
            .select(`
                id, odoo_company_id,
                shop_locations ( odoo_location_id, is_active )
            `)
            .in("odoo_company_id", effectiveCompanyIds);

        if (shopsErr) {
            console.warn(
                "[INVENTORY_OVERVIEW] shops fetch failed:",
                shopsErr.message,
            );
        }

        const locationsByCompany = new Map<number, number[]>();

        for (const shop of shopsWithLocations ?? []) {
            const cId = shop.odoo_company_id;
            if (typeof cId !== "number") continue;

            const shopLocs = (shop.shop_locations ?? []) as Array<{
                odoo_location_id: number;
                is_active: boolean;
            }>;

            const activeIds = shopLocs
                .filter((l) => l.is_active && l.odoo_location_id > 0)
                .map((l) => l.odoo_location_id);

            if (!locationsByCompany.has(cId)) {
                locationsByCompany.set(cId, []);
            }
            locationsByCompany.get(cId)!.push(...activeIds);
        }

        // Déduplique par company
        for (const [cId, locs] of locationsByCompany.entries()) {
            locationsByCompany.set(cId, [...new Set(locs)]);
        }

        // Diagnostic : combien de companies sans config
        const companiesWithoutConfig = effectiveCompanyIds.filter(
            (cId) => (locationsByCompany.get(cId) ?? []).length === 0,
        );
        if (companiesWithoutConfig.length > 0) {
            console.log(
                `[INVENTORY_OVERVIEW] Fallback "toutes locations internes" pour: ${companiesWithoutConfig.join(", ")}`,
            );
        }

        // ═══════════════════════════════════════════════════════════
        // Quants — filtrés selon config (fallback = tout internal)
        // ═══════════════════════════════════════════════════════════
        const quantsDomain: OdooDomain = [
            ...buildCompanyLocationDomain(
                effectiveCompanyIds,
                locationsByCompany,
                "location_id",
            ),
        ];

        const quants = await odooClient.searchRead<{
            product_id: [number, string] | false;
            quantity: number;
            company_id: [number, string] | false;
        }>("stock.quant", {
            domain: quantsDomain,
            fields: ["product_id", "quantity", "company_id"],
            limit: 100000,
        });

        // ═══════════════════════════════════════════════════════════
        // Mouvements dans la période
        // ═══════════════════════════════════════════════════════════
        const receivedDomain: OdooDomain = [
            ["date", ">=", fromDate],
            ["date", "<=", toDate],
            ["state", "=", "done"],
            ["location_id.usage", "!=", "internal"],
            ...buildCompanyLocationDomain(
                effectiveCompanyIds,
                locationsByCompany,
                "location_dest_id",
            ),
        ];

        const soldDomain: OdooDomain = [
            ["date", ">=", fromDate],
            ["date", "<=", toDate],
            ["state", "=", "done"],
            ["location_dest_id.usage", "!=", "internal"],
            ...buildCompanyLocationDomain(
                effectiveCompanyIds,
                locationsByCompany,
                "location_id",
            ),
        ];

        const [receivedInPeriod, soldInPeriod] = await Promise.all([
            odooClient.readGroup<{
                product_id: [number, string] | false;
                product_uom_qty: number;
            }>("stock.move", {
                domain: receivedDomain,
                fields: ["product_uom_qty:sum"],
                groupby: ["product_id"],
                lazy: false,
            }),
            odooClient.readGroup<{
                product_id: [number, string] | false;
                product_uom_qty: number;
            }>("stock.move", {
                domain: soldDomain,
                fields: ["product_uom_qty:sum"],
                groupby: ["product_id"],
                lazy: false,
            }),
        ]);

        // ─── Mouvements après la période ─────────────────────────
        const needsAfterPeriod = to < today;
        let receivedAfter: typeof receivedInPeriod = [];
        let soldAfter: typeof soldInPeriod = [];

        if (needsAfterPeriod) {
            const afterFrom = `${to} 23:59:59`;
            const afterTo = `${today} 23:59:59`;

            const receivedAfterDomain: OdooDomain = [
                ["date", ">", afterFrom],
                ["date", "<=", afterTo],
                ["state", "=", "done"],
                ["location_id.usage", "!=", "internal"],
                ...buildCompanyLocationDomain(
                    effectiveCompanyIds,
                    locationsByCompany,
                    "location_dest_id",
                ),
            ];

            const soldAfterDomain: OdooDomain = [
                ["date", ">", afterFrom],
                ["date", "<=", afterTo],
                ["state", "=", "done"],
                ["location_dest_id.usage", "!=", "internal"],
                ...buildCompanyLocationDomain(
                    effectiveCompanyIds,
                    locationsByCompany,
                    "location_id",
                ),
            ];

            [receivedAfter, soldAfter] = await Promise.all([
                odooClient.readGroup<{
                    product_id: [number, string] | false;
                    product_uom_qty: number;
                }>("stock.move", {
                    domain: receivedAfterDomain,
                    fields: ["product_uom_qty:sum"],
                    groupby: ["product_id"],
                    lazy: false,
                }),
                odooClient.readGroup<{
                    product_id: [number, string] | false;
                    product_uom_qty: number;
                }>("stock.move", {
                    domain: soldAfterDomain,
                    fields: ["product_uom_qty:sum"],
                    groupby: ["product_id"],
                    lazy: false,
                }),
            ]);
        }

        // ─── Indexation ──────────────────────────────────────────
        const toMap = (
            rows: Array<{
                product_id: [number, string] | false;
                product_uom_qty: number;
            }>,
        ) => {
            const m = new Map<number, number>();
            for (const r of rows) {
                if (!Array.isArray(r.product_id)) continue;
                const pid = r.product_id[0];
                m.set(
                    pid,
                    (m.get(pid) ?? 0) + Number(r.product_uom_qty ?? 0),
                );
            }
            return m;
        };

        const receivedInPeriodMap = toMap(receivedInPeriod);
        const soldInPeriodMap = toMap(soldInPeriod);
        const receivedAfterMap = toMap(receivedAfter);
        const soldAfterMap = toMap(soldAfter);

        // ─── Quants actuels ──────────────────────────────────────
        const currentQtyByProduct = new Map<number, number>();
        const currentQtyByProductCompany = new Map<
            string,
            { productId: number; companyId: number; qty: number }
        >();

        for (const q of quants) {
            if (!Array.isArray(q.product_id) || !Array.isArray(q.company_id)) {
                continue;
            }
            const pid = q.product_id[0];
            const cid = q.company_id[0];
            const qty = Number(q.quantity ?? 0);

            currentQtyByProduct.set(
                pid,
                (currentQtyByProduct.get(pid) ?? 0) + qty,
            );

            const key = `${cid}|${pid}`;
            const existing = currentQtyByProductCompany.get(key);
            if (existing) {
                existing.qty += qty;
            } else {
                currentQtyByProductCompany.set(key, {
                    productId: pid,
                    companyId: cid,
                    qty,
                });
            }
        }

        // ─── Union product IDs ──────────────────────────────────
        const allProductIds = new Set<number>();
        for (const pid of currentQtyByProduct.keys()) allProductIds.add(pid);
        for (const pid of receivedInPeriodMap.keys()) allProductIds.add(pid);
        for (const pid of soldInPeriodMap.keys()) allProductIds.add(pid);
        for (const pid of receivedAfterMap.keys()) allProductIds.add(pid);
        for (const pid of soldAfterMap.keys()) allProductIds.add(pid);

        if (allProductIds.size === 0) {
            return NextResponse.json(emptyPayload);
        }

        // ─── Fetch produits ──────────────────────────────────────
        const productIds = Array.from(allProductIds);

        const products = await odooClient.searchRead<{
            id: number;
            list_price: number;
            standard_price: number;
            x_studio_segment: string | false;
        }>("product.product", {
            domain: [["id", "in", productIds], ["active", "=", true]],
            fields: ["list_price", "standard_price", "x_studio_segment"],
            limit: productIds.length,
        });

        const productMap = new Map(
            products.map((p) => [
                p.id,
                {
                    listPrice: Number(p.list_price ?? 0),
                    standardPrice: Number(p.standard_price ?? 0),
                    segment:
                        typeof p.x_studio_segment === "string"
                            ? p.x_studio_segment
                            : "",
                },
            ]),
        );

        // ─── Noms companies ──────────────────────────────────────
        const companies = await odooClient.searchRead<{
            id: number;
            name: string;
        }>("res.company", {
            domain: [["id", "in", effectiveCompanyIds]],
            fields: ["name"],
            limit: effectiveCompanyIds.length,
        });

        const companyNameById = new Map(companies.map((c) => [c.id, c.name]));

        // ═══════════════════════════════════════════════════════════
        // CALCULS
        // ═══════════════════════════════════════════════════════════

        type ProductCalc = {
            productId: number;
            openingQty: number;
            closingQty: number;
            receivedQty: number;
            soldQty: number;
            saleUnit: number;
            costUnit: number;
        };

        const productCalcs: ProductCalc[] = [];

        for (const pid of allProductIds) {
            const prod = productMap.get(pid);
            if (!prod) continue;

            if (segment !== "Tous") {
                const ps = prod.segment.trim().toLowerCase();
                if (ps !== segment.toLowerCase()) continue;
            }

            const saleUnit = resolveSaleUnitPrice(prod.listPrice, prod.segment);
            const costUnit = resolveCostUnitPrice(
                prod.standardPrice,
                prod.listPrice,
            );

            const currentQty = currentQtyByProduct.get(pid) ?? 0;
            const recAfter = receivedAfterMap.get(pid) ?? 0;
            const soldAfter = soldAfterMap.get(pid) ?? 0;
            const recInPeriod = receivedInPeriodMap.get(pid) ?? 0;
            const soldInPeriod = soldInPeriodMap.get(pid) ?? 0;

            const closingQty = currentQty - recAfter + soldAfter;
            const openingQty = closingQty - recInPeriod + soldInPeriod;

            productCalcs.push({
                productId: pid,
                openingQty,
                closingQty,
                receivedQty: recInPeriod,
                soldQty: soldInPeriod,
                saleUnit,
                costUnit,
            });
        }

        // ─── Agrégation globale ─────────────────────────────────
        const opening = emptySnapshot();
        const closing = emptySnapshot();
        let receivedUnits = 0;
        let soldUnits = 0;

        for (const c of productCalcs) {
            opening.totalUnits += c.openingQty;
            opening.saleValue += c.openingQty * c.saleUnit;
            opening.costValue += c.openingQty * c.costUnit;
            if (Math.abs(c.openingQty) > 0.001) opening.productCount += 1;

            closing.totalUnits += c.closingQty;
            closing.saleValue += c.closingQty * c.saleUnit;
            closing.costValue += c.closingQty * c.costUnit;
            if (Math.abs(c.closingQty) > 0.001) closing.productCount += 1;

            receivedUnits += c.receivedQty;
            soldUnits += c.soldQty;
        }

        const finalOpening = finalizeSnapshot(opening);
        const finalClosing = finalizeSnapshot(closing);
        const movements = {
            receivedUnits,
            soldUnits,
            netVariation: receivedUnits - soldUnits,
        };

        // ─── Agrégation par company (approximation : closing = current) ──
        const byCompanyMap = new Map<
            number,
            {
                opening: InventoryStockSnapshot;
                closing: InventoryStockSnapshot;
                receivedUnits: number;
                soldUnits: number;
            }
        >();

        for (const [, entry] of currentQtyByProductCompany.entries()) {
            const cid = entry.companyId;
            let bucket = byCompanyMap.get(cid);
            if (!bucket) {
                bucket = {
                    opening: emptySnapshot(),
                    closing: emptySnapshot(),
                    receivedUnits: 0,
                    soldUnits: 0,
                };
                byCompanyMap.set(cid, bucket);
            }

            const prod = productMap.get(entry.productId);
            if (!prod) continue;

            if (segment !== "Tous") {
                const ps = prod.segment.trim().toLowerCase();
                if (ps !== segment.toLowerCase()) continue;
            }

            const saleUnit = resolveSaleUnitPrice(prod.listPrice, prod.segment);
            const costUnit = resolveCostUnitPrice(
                prod.standardPrice,
                prod.listPrice,
            );

            bucket.closing.totalUnits += entry.qty;
            bucket.closing.saleValue += entry.qty * saleUnit;
            bucket.closing.costValue += entry.qty * costUnit;
            if (Math.abs(entry.qty) > 0.001) bucket.closing.productCount += 1;

            bucket.opening.totalUnits += entry.qty;
            bucket.opening.saleValue += entry.qty * saleUnit;
            bucket.opening.costValue += entry.qty * costUnit;
            if (Math.abs(entry.qty) > 0.001) bucket.opening.productCount += 1;
        }

        const byCompany = Array.from(byCompanyMap.entries())
            .map(([companyId, b]) => ({
                companyId,
                companyName:
                    companyNameById.get(companyId) ?? `Company ${companyId}`,
                opening: finalizeSnapshot(b.opening),
                closing: finalizeSnapshot(b.closing),
                movements: {
                    receivedUnits: b.receivedUnits,
                    soldUnits: b.soldUnits,
                    netVariation: b.receivedUnits - b.soldUnits,
                },
            }))
            .sort((a, b) => b.closing.saleValue - a.closing.saleValue);

        return NextResponse.json({
            period: { from, to },
            opening: finalOpening,
            closing: finalClosing,
            movements,
            byCompany,
        } satisfies InventoryOverviewData);
    } catch (error) {
        console.error("[INVENTORY_OVERVIEW_API]", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}