import { fetchRevenue } from "./odoo/revenue";
import { fetchStockValue } from "./odoo/stock-value";
import { fetchTurnover } from "./odoo/turnover";
import { fetchDormantStock } from "./odoo/dormant-stock";
import { DOMAIN_SUMMARIES } from "./mock-data";
import { KPI_CODES } from "./kpi-codes";
import type { KpiData, DomainSummary } from "./types";
import { Banknote, Package, RefreshCw, PackageX } from "lucide-react";

interface KpiQueryParams {
    from: string;
    to: string;
    companyId?: number;
}

export async function fetchVitalKpis({
    from,
    to,
    companyId,
}: KpiQueryParams): Promise<KpiData[]> {
    const results = await Promise.allSettled([
        fetchRevenue({ from, to, companyId }),
        fetchStockValue({ companyId }),
        fetchTurnover({ from, to, companyId }),
        fetchDormantStock({ companyId, thresholdDays: 90 }),
    ]);

    const kpis: KpiData[] = [];

    // ─── 1. CA ───
    if (results[0].status === "fulfilled") {
        const r = results[0].value;
        kpis.push({
            code: KPI_CODES.SALES_REVENUE,
            label: "Chiffre d'affaires",
            value: r.ttc,
            unit: "currency",
            currency: "USD",
            icon: Banknote,
            hint: "Ventes POS encaissées (TTC)",
            secondary: {
                label: "Dont TVA",
                value: `${Math.round(r.tax).toLocaleString("fr-FR")} $`,
            },
        });
    } else {
        console.error("[CA] échec:", results[0].reason);
    }

    // ─── 2. Valeur stock ───
    if (results[1].status === "fulfilled") {
        const r = results[1].value;
        kpis.push({
            code: KPI_CODES.STOCK_VALUE_TOTAL,
            label: "Valeur du stock",
            value: r.total,
            unit: "currency",
            currency: r.currency,
            icon: Package,
            hint: "Quantité × coût d'achat",
            secondary: {
                label: "Références",
                value: `${r.productCount} produits`,
            },
        });
    } else {
        console.error("[STOCK VALUE] échec:", results[1].reason);
    }

    // ─── 3. Rotation ───
    if (results[2].status === "fulfilled") {
        const t = results[2].value;
        kpis.push({
            code: KPI_CODES.STOCK_TURNOVER,
            label: "Rotation du stock",
            value: t.ratio,
            unit: "ratio",
            icon: RefreshCw,
            hint: `COGS ${Math.round(t.cogs).toLocaleString("fr-FR")} $ / Stock ${Math.round(t.stockValue).toLocaleString("fr-FR")} $`,
            status:
                t.ratio >= 4
                    ? "good"
                    : t.ratio >= 2
                        ? "warning"
                        : t.ratio > 0
                            ? "critical"
                            : "neutral",
            secondary: {
                label: "Couverture",
                value: `${Math.round(t.daysOfStock)} jours`,
            },
        });
    } else {
        console.error("[TURNOVER] échec:", results[2].reason);
    }

    // ─── 4. Stock dormant ───
    if (results[3].status === "fulfilled") {
        const d = results[3].value;
        kpis.push({
            code: KPI_CODES.STOCK_DORMANT,
            label: "Stock dormant",
            value: d.value,
            unit: "currency",
            currency: "USD",
            icon: PackageX,
            hint: `Produits sans vente depuis ${d.thresholdDays} jours`,
            upIsGood: false,
            status:
                d.percentOfStock >= 30
                    ? "critical"
                    : d.percentOfStock >= 15
                        ? "warning"
                        : "good",
            secondary: {
                label: "Références dormantes",
                value: `${d.count} · ${d.percentOfStock.toFixed(1)}% du stock`,
            },
        });
    } else {
        console.error("[DORMANT] échec:", results[3].reason);
    }

    return kpis;
}

export async function fetchDomainSummaries(
    _params: KpiQueryParams
): Promise<DomainSummary[]> {
    return DOMAIN_SUMMARIES;
}