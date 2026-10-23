// app/api/inventory/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import type { OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import type {
    InventoryAnalyticsData,
    InventoryFlowPoint,
    InventoryHeatmapCell,
    InventorySegment,
    InventoryShopDistribution,
} from "@/app/inventory/_lib/types";

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

const EXCLUDED_PRODUCT_IDS: number[] = [499831, 543466, 103873];

const PIE_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEK_LABELS = ["S-3", "S-2", "S-1", "S-0"];

/* ══════════════════════════════════════════════════════════════════ */
/* HELPERS                                                          */
/* ══════════════════════════════════════════════════════════════════ */

type LocationField = "location_id" | "location_dest_id";

function buildCompanyLocationDomain(
    companies: number[],
    locationsByCompany: Map<number, number[]>,
    locationField: LocationField,
): OdooDomain {
    if (companies.length === 0) {
        return [[locationField, "=", -1]];
    }
    const withLocations: number[] = [];
    const withoutLocations: number[] = [];
    const locSet = new Set<number>();

    for (const cId of companies) {
        const locs = locationsByCompany.get(cId) ?? [];
        if (locs.length > 0) {
            withLocations.push(cId);
            for (const l of locs) locSet.add(l);
        } else {
            withoutLocations.push(cId);
        }
    }

    const locArr = Array.from(locSet);
    const usageField = `${locationField}.usage`;

    if (withLocations.length > 0 && withoutLocations.length === 0) {
        return [
            ["company_id", "in", withLocations],
            [locationField, "child_of", locArr],
        ];
    }
    if (withLocations.length === 0 && withoutLocations.length > 0) {
        return [
            ["company_id", "in", withoutLocations],
            [usageField, "=", "internal"],
        ];
    }
    return [
        "|",
        "&",
        ["company_id", "in", withLocations],
        [locationField, "child_of", locArr],
        "&",
        ["company_id", "in", withoutLocations],
        [usageField, "=", "internal"],
    ];
}

const pad = (n: number) => String(n).padStart(2, "0");

function isoDate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDayLabel(d: Date): string {
    const months = [
        "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
        "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc",
    ];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

function daysBetween(fromIso: string, toIso: string): Date[] {
    const out: Date[] = [];
    const start = new Date(fromIso + "T00:00:00");
    const end = new Date(toIso + "T00:00:00");
    const cur = new Date(start);
    while (cur <= end) {
        out.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}

/** Renvoie le lundi de la semaine ISO de la date donnée. */
function getMonday(d: Date): Date {
    const day = d.getDay() || 7; // lundi = 1, dimanche = 7
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
}

function toMapByDay(
    rows: Array<{ "date:day"?: string; product_uom_qty: number }>,
): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows) {
        const dayKey = r["date:day"];
        if (!dayKey) continue;
        m.set(dayKey, (m.get(dayKey) ?? 0) + Number(r.product_uom_qty ?? 0));
    }
    return m;
}

/* ══════════════════════════════════════════════════════════════════ */
/* GET                                                              */
/* ══════════════════════════════════════════════════════════════════ */

export async function GET(request: NextRequest) {
    try {
        // ─── Auth ──────────────────────────────────────────────
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
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

        // ─── Params ────────────────────────────────────────────
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

        const today = new Date();
        const from = fromParam ?? isoDate(today);
        const to = toParam ?? isoDate(today);

        const fromDate = `${from} 00:00:00`;
        const toDate = `${to} 23:59:59`;

        // ─── Scope companies ──────────────────────────────────
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

        const emptyPayload: InventoryAnalyticsData = {
            flowSeries: [],
            shopDistribution: [],
            heatmapData: [],
        };

        if (effectiveCompanyIds.length === 0) {
            return NextResponse.json(emptyPayload);
        }

        // ─── Shop locations ────────────────────────────────────
        const { data: shopsWithLocations } = await supabase
            .from("shops")
            .select(`
                id, name, odoo_company_id,
                shop_locations ( odoo_location_id, is_active )
            `)
            .in("odoo_company_id", effectiveCompanyIds);

        const locationsByCompany = new Map<number, number[]>();
        const companyNameById = new Map<number, string>();

        for (const shop of shopsWithLocations ?? []) {
            const cId = shop.odoo_company_id;
            if (typeof cId !== "number") continue;

            companyNameById.set(cId, shop.name);

            const shopLocs = (shop.shop_locations ?? []) as Array<{
                odoo_location_id: number;
                is_active: boolean;
            }>;
            const activeIds = shopLocs
                .filter((l) => l.is_active && l.odoo_location_id > 0)
                .map((l) => l.odoo_location_id);

            if (!locationsByCompany.has(cId)) locationsByCompany.set(cId, []);
            locationsByCompany.get(cId)!.push(...activeIds);
        }

        for (const [cId, locs] of locationsByCompany.entries()) {
            locationsByCompany.set(cId, [...new Set(locs)]);
        }

        // ─── Domaines de base ──────────────────────────────────
        const baseIncoming: OdooDomain = [
            ["state", "=", "done"],
            ["location_id.usage", "!=", "internal"],
            ...buildCompanyLocationDomain(
                effectiveCompanyIds,
                locationsByCompany,
                "location_dest_id",
            ),
        ];

        const baseOutgoing: OdooDomain = [
            ["state", "=", "done"],
            ["location_dest_id.usage", "!=", "internal"],
            ...buildCompanyLocationDomain(
                effectiveCompanyIds,
                locationsByCompany,
                "location_id",
            ),
        ];

        const exclusionDomain: OdooDomain =
            EXCLUDED_PRODUCT_IDS.length > 0
                ? [["product_id", "not in", EXCLUDED_PRODUCT_IDS]]
                : [];

        // ─── Flow (from → to) ──────────────────────────────────
        const [incomingPeriod, outgoingPeriod] = await Promise.all([
            odooClient.readGroup<{ "date:day"?: string; product_uom_qty: number }>(
                "stock.move",
                {
                    domain: [
                        ...baseIncoming,
                        ...exclusionDomain,
                        ["date", ">=", fromDate],
                        ["date", "<=", toDate],
                    ],
                    fields: ["product_uom_qty:sum"],
                    groupby: ["date:day"],
                    lazy: false,
                },
            ),
            odooClient.readGroup<{ "date:day"?: string; product_uom_qty: number }>(
                "stock.move",
                {
                    domain: [
                        ...baseOutgoing,
                        ...exclusionDomain,
                        ["date", ">=", fromDate],
                        ["date", "<=", toDate],
                    ],
                    fields: ["product_uom_qty:sum"],
                    groupby: ["date:day"],
                    lazy: false,
                },
            ),
        ]);

        const incomingByDay = toMapByDay(incomingPeriod);
        const outgoingByDay = toMapByDay(outgoingPeriod);

        // ─── Flow series ───────────────────────────────────────
        const dayDates = daysBetween(from, to);
        const flowSeries: InventoryFlowPoint[] = [];
        let cum = 0;
        for (const d of dayDates) {
            const key = isoDate(d);
            const incoming = incomingByDay.get(key) ?? 0;
            const outgoing = outgoingByDay.get(key) ?? 0;
            cum += incoming - outgoing;
            flowSeries.push({
                label: formatDayLabel(d),
                incoming,
                outgoing,
                cumulative: cum,
            });
        }

        // ─── Heatmap (4 dernières semaines ISO) ────────────────
        const todayMonday = getMonday(today);
        const heatmapStart = new Date(todayMonday);
        heatmapStart.setDate(heatmapStart.getDate() - 21); // S-3 → lundi

        const heatmapFrom = `${isoDate(heatmapStart)} 00:00:00`;
        const heatmapTo = `${isoDate(today)} 23:59:59`;

        const [incomingHeat, outgoingHeat] = await Promise.all([
            odooClient.readGroup<{ "date:day"?: string; product_uom_qty: number }>(
                "stock.move",
                {
                    domain: [
                        ...baseIncoming,
                        ...exclusionDomain,
                        ["date", ">=", heatmapFrom],
                        ["date", "<=", heatmapTo],
                    ],
                    fields: ["product_uom_qty:sum"],
                    groupby: ["date:day"],
                    lazy: false,
                },
            ),
            odooClient.readGroup<{ "date:day"?: string; product_uom_qty: number }>(
                "stock.move",
                {
                    domain: [
                        ...baseOutgoing,
                        ...exclusionDomain,
                        ["date", ">=", heatmapFrom],
                        ["date", "<=", heatmapTo],
                    ],
                    fields: ["product_uom_qty:sum"],
                    groupby: ["date:day"],
                    lazy: false,
                },
            ),
        ]);

        const incomingHeatMap = toMapByDay(incomingHeat);
        const outgoingHeatMap = toMapByDay(outgoingHeat);

        const heatmapData: InventoryHeatmapCell[] = [];
        for (let w = 0; w < 4; w++) {
            const weekLabel = WEEK_LABELS[w];
            for (let d = 0; d < 7; d++) {
                const date = new Date(heatmapStart);
                date.setDate(date.getDate() + w * 7 + d);
                if (date > today) continue; // pas de cellules futures

                const key = isoDate(date);
                const value =
                    (incomingHeatMap.get(key) ?? 0) +
                    (outgoingHeatMap.get(key) ?? 0);

                heatmapData.push({
                    week: weekLabel,
                    day: DAYS_FR[d],
                    value,
                });
            }
        }

        // ─── Pie : distribution par company ────────────────────
        const quantsDomain: OdooDomain = [
            ...buildCompanyLocationDomain(
                effectiveCompanyIds,
                locationsByCompany,
                "location_id",
            ),
            ...exclusionDomain,
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

        // Filtre segment (via product si besoin)
        let segmentFilterProductIds: Set<number> | null = null;
        if (segment !== "Tous") {
            const productIds = [
                ...new Set(
                    quants
                        .map((q) =>
                            Array.isArray(q.product_id)
                                ? q.product_id[0]
                                : null,
                        )
                        .filter((v): v is number => v !== null),
                ),
            ];
            const productsSeg = await odooClient.searchRead<{
                id: number;
                x_studio_segment: string | false;
            }>("product.product", {
                domain: [
                    ["id", "in", productIds],
                    ["x_studio_segment", "=", segment],
                ],
                fields: ["x_studio_segment"],
                limit: productIds.length,
            });
            segmentFilterProductIds = new Set(productsSeg.map((p) => p.id));
        }

        const unitsByCompany = new Map<number, number>();
        for (const q of quants) {
            if (
                !Array.isArray(q.product_id) ||
                !Array.isArray(q.company_id)
            )
                continue;
            const pid = q.product_id[0];
            const cid = q.company_id[0];
            if (segmentFilterProductIds && !segmentFilterProductIds.has(pid))
                continue;
            const qty = Number(q.quantity ?? 0);
            if (qty <= 0) continue;
            unitsByCompany.set(cid, (unitsByCompany.get(cid) ?? 0) + qty);
        }

        const shopDistribution: InventoryShopDistribution[] = Array.from(
            unitsByCompany.entries(),
        )
            .map(([cid, qty], idx) => ({
                name: companyNameById.get(cid) ?? `Company ${cid}`,
                value: qty,
                color: PIE_COLORS[idx % PIE_COLORS.length],
            }))
            .filter((d) => d.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((d, idx) => ({
                ...d,
                color: PIE_COLORS[idx % PIE_COLORS.length],
            }));

        return NextResponse.json({
            flowSeries,
            shopDistribution,
            heatmapData,
        } satisfies InventoryAnalyticsData);
    } catch (error) {
        console.error("[INVENTORY_ANALYTICS_API]", error);
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