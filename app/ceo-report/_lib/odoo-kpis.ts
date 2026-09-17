import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { KPI_CODES } from "./kpi-codes";
import type { KpiData, KpiStatus } from "./types";

interface KpiQueryParams {
    from: string;
    to: string;
    companyId?: number;
}

function buildContext(companyId?: number) {
    return companyId ? { allowed_company_ids: [companyId] } : {};
}

function deltaToStatus(delta: number, upIsGood = true): KpiStatus {
    const effective = upIsGood ? delta : -delta;
    if (effective >= 5) return "good";
    if (effective >= -5) return "warning";
    return "critical";
}

function computeDelta(current: number, previous: number): number | undefined {
    if (!previous || previous === 0) return undefined;
    return ((current - previous) / previous) * 100;
}

function previousPeriod(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const durationMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    return { from: fmt(prevFrom), to: fmt(prevTo) };
}

// ─── 1. VALEUR STOCK TOTAL ───
export async function fetchStockValueTotal({
    companyId,
}: KpiQueryParams): Promise<KpiData> {
    const domain: OdooDomain = [["remaining_qty", ">", 0]];
    if (companyId) domain.push(["company_id", "=", companyId]);

    let value = 0;

    try {
        const groups = await odooClient.readGroup<{ remaining_value: number }>(
            "stock.valuation.layer",
            {
                domain,
                fields: ["remaining_value:sum"],
                context: buildContext(companyId),
            }
        );
        value = groups[0]?.remaining_value ?? 0;
    } catch {
        const layers = await odooClient.searchRead<{ remaining_value: number }>(
            "stock.valuation.layer",
            { domain, fields: ["remaining_value"], limit: 5000 }
        );
        value = layers.reduce((s, l) => s + (l.remaining_value ?? 0), 0);
    }

    return {
        code: KPI_CODES.STOCK_VALUE_TOTAL,
        label: "Valeur du stock",
        value,
        unit: "currency",
        currency: "USD",
        status: "neutral",
        hint: "Valorisation totale des stocks internes (SVL)",
    };
}

// ─── 2. CA DU MOIS ───
export async function fetchSalesRevenue({
    from,
    to,
    companyId,
}: KpiQueryParams): Promise<KpiData> {
    const domain: OdooDomain = [
        ["state", "in", ["sale", "done"]],
        ["date_order", ">=", `${from} 00:00:00`],
        ["date_order", "<=", `${to} 23:59:59`],
    ];
    if (companyId) domain.push(["company_id", "=", companyId]);

    const current = await odooClient.readGroup<{ amount_untaxed: number }>(
        "sale.order",
        {
            domain,
            fields: ["amount_untaxed:sum"],
            context: buildContext(companyId),
        }
    );

    const prev = previousPeriod(from, to);
    const prevDomain: OdooDomain = [
        ["state", "in", ["sale", "done"]],
        ["date_order", ">=", `${prev.from} 00:00:00`],
        ["date_order", "<=", `${prev.to} 23:59:59`],
    ];
    if (companyId) prevDomain.push(["company_id", "=", companyId]);

    const previous = await odooClient.readGroup<{ amount_untaxed: number }>(
        "sale.order",
        {
            domain: prevDomain,
            fields: ["amount_untaxed:sum"],
            context: buildContext(companyId),
        }
    );

    const value = current[0]?.amount_untaxed ?? 0;
    const previousValue = previous[0]?.amount_untaxed ?? 0;
    const delta = computeDelta(value, previousValue);

    return {
        code: KPI_CODES.SALES_REVENUE,
        label: "CA de la période",
        value,
        unit: "currency",
        currency: "USD",
        delta,
        upIsGood: true,
        status: delta !== undefined ? deltaToStatus(delta, true) : "neutral",
        hint: "Ventes confirmées HT sur la période",
    };
}

// ─── 3. MARGE BRUTE ───
export async function fetchGrossMargin({
    from,
    to,
    companyId,
}: KpiQueryParams): Promise<KpiData> {
    const domain: OdooDomain = [
        ["order_id.state", "in", ["sale", "done"]],
        ["order_id.date_order", ">=", `${from} 00:00:00`],
        ["order_id.date_order", "<=", `${to} 23:59:59`],
        ["price_subtotal", ">", 0],
    ];
    if (companyId) domain.push(["order_id.company_id", "=", companyId]);

    const lines = await odooClient.searchRead<{
        price_subtotal: number;
        purchase_price: number;
        product_uom_qty: number;
    }>("sale.order.line", {
        domain,
        fields: ["price_subtotal", "purchase_price", "product_uom_qty"],
        limit: 5000,
    });

    const totalRevenue = lines.reduce((s, l) => s + (l.price_subtotal ?? 0), 0);
    const totalCost = lines.reduce(
        (s, l) => s + (l.purchase_price ?? 0) * (l.product_uom_qty ?? 0),
        0
    );

    const marginPercent =
        totalRevenue > 0
            ? ((totalRevenue - totalCost) / totalRevenue) * 100
            : 0;

    return {
        code: KPI_CODES.SALES_MARGIN,
        label: "Marge brute",
        value: marginPercent,
        unit: "percent",
        status:
            marginPercent >= 40
                ? "good"
                : marginPercent >= 25
                    ? "warning"
                    : "critical",
        hint: "Marge brute moyenne pondérée sur la période",
    };
}

// ─── 4. RUPTURES ACTIVES ───
export async function fetchOutOfStock({
    companyId,
}: KpiQueryParams): Promise<KpiData> {
    const domain: OdooDomain = [["qty_to_order", ">", 0]];
    if (companyId) domain.push(["company_id", "=", companyId]);

    const count = await odooClient.searchCount(
        "stock.warehouse.orderpoint",
        domain
    );

    return {
        code: KPI_CODES.STOCK_OUT_OF_STOCK,
        label: "Ruptures actives",
        value: count,
        unit: "count",
        upIsGood: false,
        status: count > 30 ? "critical" : count > 10 ? "warning" : "good",
        hint: "Produits sous le seuil de réapprovisionnement",
    };
}

// ─── API PUBLIQUE ───
export async function fetchAllVitalKpis(
    params: KpiQueryParams
): Promise<KpiData[]> {
    const results = await Promise.allSettled([
        fetchStockValueTotal(params),
        fetchSalesRevenue(params),
        fetchGrossMargin(params),
        fetchOutOfStock(params),
    ]);

    return results
        .filter(
            (r): r is PromiseFulfilledResult<KpiData> => r.status === "fulfilled"
        )
        .map((r) => r.value);
}