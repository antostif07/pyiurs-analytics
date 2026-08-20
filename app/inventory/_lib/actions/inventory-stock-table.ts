"use server";

import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { format } from "date-fns";

export interface StockTableRow {
    id: string;
    productId: number;
    product: string;
    category: string;
    hsCode: string;
    barcode: string;
    segment: string;
    openingStock: number;
    incomingStock: number;
    outgoingStock: number;
    currentStock: number;
    unitCost: number;
    stockValue: number;
    alert: "out_of_stock" | "low" | "overstock" | "healthy";
    history: Array<{ date: string; incoming: number; outgoing: number }>;
}

export async function getStockTableData(
    shopIds: string[] = [],
    segment: string = "Tous",
    dateRange: { from: Date; to: Date }
): Promise<StockTableRow[]> {
    const start = format(dateRange.from, "yyyy-MM-dd 00:00:00");
    const end = format(dateRange.to, "yyyy-MM-dd 23:59:59");

    try {
        // 1. Lecture des produits Odoo filtrés par Segment
        const productDomain: any[] = [
            ["active", "=", true],
            ["available_in_pos", "=", true]
        ];

        if (segment && segment !== "Tous") {
            productDomain.push(["x_studio_segment", "ilike", segment]);
        }

        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: productDomain,
            fields: ["id", "name", "barcode", "default_code", "hs_code", "standard_price", "x_studio_segment", "pos_categ_ids"],
            limit: 2000
        });

        if (!products || products.length === 0) return [];

        const productIds = products.map((p: any) => p.id);

        // 2. Stock physique actuel en rayon (stock.quant)
        const quants = await odooJsonClient.searchRead<any>("stock.quant", {
            domain: [
                ["product_id", "in", productIds],
                ["location_id.usage", "=", "internal"]
            ],
            fields: ["product_id", "quantity", "company_id"]
        });

        const stockMap = new Map<number, number>();
        quants.forEach((q: any) => {
            const pid = q.product_id[0];
            stockMap.set(pid, (stockMap.get(pid) || 0) + (q.quantity || 0));
        });

        // 3. Mouvements de stock sur la période (stock.move)
        const moves = await odooJsonClient.searchRead<any>("stock.move", {
            domain: [
                ["product_id", "in", productIds],
                ["state", "=", "done"],
                ["date", ">=", start],
                ["date", "<=", end]
            ],
            fields: ["product_id", "product_uom_qty", "picking_code", "date"]
        });

        const moveStatsMap = new Map<number, { incoming: number; outgoing: number; historyByDay: Record<string, { in: number; out: number }> }>();

        moves.forEach((m: any) => {
            const pid = m.product_id[0];
            if (!moveStatsMap.has(pid)) {
                moveStatsMap.set(pid, { incoming: 0, outgoing: 0, historyByDay: {} });
            }
            const entry = moveStatsMap.get(pid)!;
            const qty = m.product_uom_qty || 0;
            const dayKey = m.date ? m.date.slice(0, 10) : "";

            if (!entry.historyByDay[dayKey]) {
                entry.historyByDay[dayKey] = { in: 0, out: 0 };
            }

            if (m.picking_code === "incoming" || m.picking_code === "internal") {
                entry.incoming += qty;
                entry.historyByDay[dayKey].in += qty;
            } else {
                entry.outgoing += qty;
                entry.historyByDay[dayKey].out += qty;
            }
        });

        // 4. Construction et calcul des métriques de chaque ligne
        return products.map((p: any) => {
            const current = Math.round(stockMap.get(p.id) || 0);
            const stats = moveStatsMap.get(p.id) || { incoming: 0, outgoing: 0, historyByDay: {} };
            const opening = Math.max(0, current - stats.incoming + stats.outgoing);
            const unitCost = p.standard_price || 0;
            const stockValue = Math.round(current * unitCost);

            // Calcul de l'alerte
            let alert: StockTableRow["alert"] = "healthy";
            if (current === 0) alert = "out_of_stock";
            else if (current < 5 || (opening > 0 && current / opening < 0.3)) alert = "low";
            else if (opening > 0 && current / opening > 2.5) alert = "overstock";

            const history = Object.entries(stats.historyByDay)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 10)
                .map(([date, h]) => ({
                    date,
                    incoming: h.in,
                    outgoing: h.out
                }));

            return {
                id: String(p.id),
                productId: p.id,
                product: p.name,
                category: p.x_studio_segment || "Général",
                hsCode: p.hs_code || "—",
                barcode: p.barcode || p.default_code || "—",
                segment: p.x_studio_segment || "Autres",
                openingStock: opening,
                incomingStock: stats.incoming,
                outgoingStock: stats.outgoing,
                currentStock: current,
                unitCost,
                stockValue,
                alert,
                history
            };
        });

    } catch (error) {
        console.error("[STOCK_TABLE_ERROR] Erreur récupération stock table Odoo:", error);
        return [];
    }
}