// app/api/ceo-report/operations/transfers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseFilters, resolveDateRange } from "@/app/ceo-report/_lib/filters";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import type {
    TransferControlRow,
    TransfersKpis,
    TransfersChartPoint,
    TransfersReportData,
} from "@/app/ceo-report/operations/transfers/_lib/types";

export const dynamic = "force-dynamic";

const COMPANY_PBC_ID = 8;

// ─── Cache module-level ─────────────────────────────────────────────────
type CompanyMap = Record<number, string>;
let companyMapCache: { map: CompanyMap; at: number } | null = null;
const COMPANY_MAP_TTL = 5 * 60 * 1000;

async function getCompanyDestinationMap(): Promise<CompanyMap> {
    if (companyMapCache && Date.now() - companyMapCache.at < COMPANY_MAP_TTL) {
        return companyMapCache.map;
    }
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("shops")
            .select("name, odoo_company_id")
            .not("odoo_company_id", "is", null);

        if (error) {
            console.warn("[TRANSFERS_API] shops fetch failed:", error.message);
            return companyMapCache?.map ?? {};
        }

        const map: CompanyMap = {};
        for (const shop of data ?? []) {
            if (shop.odoo_company_id != null) {
                map[shop.odoo_company_id] = shop.name;
            }
        }
        companyMapCache = { map, at: Date.now() };
        return map;
    } catch (error) {
        console.error("[TRANSFERS_API] getCompanyMap error:", error);
        return companyMapCache?.map ?? {};
    }
}

function formatOdooDate(iso: string): string {
    if (!iso) return "";
    const [d] = iso.split(" ");
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
}

function resolveDestination(
    companyMap: CompanyMap,
    partnerId: number | false,
    partnerName: string | false,
): string {
    if (typeof partnerId === "number" && companyMap[partnerId]) {
        return companyMap[partnerId];
    }
    if (typeof partnerName === "string") {
        const match = partnerName.match(/\b(P\.?[A-Z]{2,4}|P24)\b/);
        return match ? match[0] : partnerName;
    }
    return "—";
}

function buildKpis(transfers: TransferControlRow[]): TransfersKpis {
    const conformCount = transfers.filter(
        (t) => t.docCompliance === "conforme",
    ).length;
    const barcodeMissing = transfers.filter(
        (t) => t.barcodeCompliance === "manquant",
    );
    const firstMissing = barcodeMissing[0]?.refTransfert ?? null;
    const total = transfers.length;

    return {
        validatedCount: total,
        itemsOrdered: transfers.reduce((s, t) => s + t.orderedCount, 0),
        itemsShipped: transfers.reduce((s, t) => s + t.itemCount, 0),
        transferValue: transfers.reduce((s, t) => s + t.value, 0),
        signatureConformCount: conformCount,
        signatureTotalCount: total,
        signatureCompliancePct: total > 0 ? (conformCount / total) * 100 : 0,
        barcodeMissingCount: barcodeMissing.length,
        barcodeMissingRef: firstMissing,
    };
}

function buildDestinationChart(
    transfers: TransferControlRow[],
): TransfersChartPoint[] {
    const map = new Map<string, TransfersChartPoint>();
    for (const t of transfers) {
        const existing = map.get(t.destination);
        if (existing) {
            existing["Valeur ($)"] += t.value;
            existing["Prévu (pcs)"] += t.orderedCount;
            existing["Expédié (pcs)"] += t.itemCount;
        } else {
            map.set(t.destination, {
                name: t.destination,
                "Valeur ($)": t.value,
                "Prévu (pcs)": t.orderedCount,
                "Expédié (pcs)": t.itemCount,
            });
        }
    }
    return Array.from(map.values());
}

const EMPTY_PAYLOAD: TransfersReportData = {
    kpis: {
        validatedCount: 0,
        itemsOrdered: 0,
        itemsShipped: 0,
        transferValue: 0,
        signatureCompliancePct: 0,
        signatureConformCount: 0,
        signatureTotalCount: 0,
        barcodeMissingCount: 0,
        barcodeMissingRef: null,
    },
    transfers: [],
    destinationChartData: [],
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = parseFilters(Object.fromEntries(searchParams.entries()));
        const { from, to } = resolveDateRange(filters);

        const fromDate = `${from} 00:00:00`;
        const toDate = `${to} 23:59:59`;

        const companyMap = await getCompanyDestinationMap();

        // ─── 1. sale.order de P.BC ────────────────────────────────────────
        const saleOrders = await odooClient.searchRead<{
            id: number;
            name: string;
            date_order: string;
            partner_id: [number, string] | false;
            company_id: [number, string] | false;
            amount_total: number;
            state: string;
            order_line: number[];
        }>("sale.order", {
            domain: [
                ["company_id", "=", COMPANY_PBC_ID],
                ["date_order", ">=", fromDate],
                ["date_order", "<=", toDate],
            ],
            fields: [
                "name",
                "date_order",
                "partner_id",
                "company_id",
                "amount_total",
                "state",
                "order_line",
            ],
            limit: 1000,
        });

        if (saleOrders.length === 0) {
            return NextResponse.json(EMPTY_PAYLOAD);
        }

        // ─── 2. Lignes — ordered + delivered ──────────────────────────────
        const allLineIds = saleOrders.flatMap((o) => o.order_line ?? []);

        const lines = allLineIds.length
            ? await odooClient.searchRead<{
                id: number;
                order_id: [number, string] | false;
                product_uom_qty: number;
                qty_delivered: number;
            }>("sale.order.line", {
                domain: [["id", "in", allLineIds]],
                fields: ["order_id", "product_uom_qty", "qty_delivered"],
                limit: 10000,
            })
            : [];

        // Agrégation par order_id : { ordered, delivered }
        const itemsByOrder = new Map<
            number,
            { ordered: number; delivered: number }
        >();
        for (const line of lines) {
            const orderId = Array.isArray(line.order_id) ? line.order_id[0] : 0;
            if (!orderId) continue;

            const current = itemsByOrder.get(orderId) ?? { ordered: 0, delivered: 0 };
            current.ordered += Number(line.product_uom_qty ?? 0);
            current.delivered += Number(line.qty_delivered ?? 0);
            itemsByOrder.set(orderId, current);
        }

        // ─── 3. Mapping vers TransferControlRow ───────────────────────────
        const transfers: TransferControlRow[] = saleOrders.map((so) => {
            const partnerId = Array.isArray(so.partner_id) ? so.partner_id[0] : false;
            const partnerName = Array.isArray(so.partner_id) ? so.partner_id[1] : false;
            const counts = itemsByOrder.get(so.id) ?? { ordered: 0, delivered: 0 };

            return {
                refTransfert: so.name,
                date: formatOdooDate(so.date_order),
                origin: "P.BC",
                destination: resolveDestination(companyMap, partnerId, partnerName),
                orderedCount: Math.round(counts.ordered),
                itemCount: Math.round(counts.delivered),
                value: Math.round(Number(so.amount_total ?? 0)),
                docCompliance: "conforme",
                barcodeCompliance: "scanne",
            };
        });

        // ─── 4. Filtre boutique local ─────────────────────────────────────
        const filtered = transfers.filter((t) => {
            if (filters.store !== "all" && t.destination !== filters.store) {
                return false;
            }
            return true;
        });

        return NextResponse.json({
            kpis: buildKpis(filtered),
            transfers: filtered,
            destinationChartData: buildDestinationChart(filtered),
        } satisfies TransfersReportData);
    } catch (error) {
        console.error("[TRANSFERS_API] error:", error);
        return NextResponse.json(EMPTY_PAYLOAD, { status: 500 });
    }
}