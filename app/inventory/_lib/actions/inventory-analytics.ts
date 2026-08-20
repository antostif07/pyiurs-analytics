"use server";

import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";

export interface InventoryAnalyticsData {
    flowSeries: Array<{ date: string; label: string; incoming: number; outgoing: number; cumulative: number }>;
    shopDistribution: Array<{ name: string; value: number; color: string }>;
    heatmapData: Array<{ week: string; day: string; value: number; key: string }>;
}

export async function getInventoryAnalyticsData(
    shopIds: string[] = [],
    segment: string = "Tous",
    dateRange: { from: Date; to: Date }
): Promise<InventoryAnalyticsData> {
    const supabase = await createClient();

    const start = format(dateRange.from, "yyyy-MM-dd 00:00:00");
    const end = format(dateRange.to, "yyyy-MM-dd 23:59:59");
    const fourWeeksAgo = format(subDays(new Date(), 28), "yyyy-MM-dd 00:00:00");

    try {
        // 1. Récupération des boutiques Supabase pour faire la liaison avec les sociétés Odoo
        const { data: dbShops } = await supabase.from("shops").select("id, name, odoo_company_id");

        // 2. Produits filtrés par Segment
        const productDomain: any[] = [
            ["active", "=", true],
            ["available_in_pos", "=", true]
        ];
        if (segment && segment !== "Tous") {
            productDomain.push(["x_studio_segment", "ilike", segment]);
        }

        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: productDomain,
            fields: ["id"],
            limit: 5000
        });

        const productIds = (products || []).map((p: any) => p.id);

        if (productIds.length === 0) {
            return { flowSeries: [], shopDistribution: [], heatmapData: [] };
        }

        // 3. FLUX DE STOCK (Entrées vs Sorties sur la période)
        const moves = await odooJsonClient.searchRead<any>("stock.move", {
            domain: [
                ["product_id", "in", productIds],
                ["state", "=", "done"],
                ["date", ">=", start],
                ["date", "<=", end]
            ],
            fields: ["product_uom_qty", "picking_code", "date"]
        });

        const dayMap = new Map<string, { incoming: number; outgoing: number }>();
        moves.forEach((m: any) => {
            const day = m.date ? m.date.slice(0, 10) : "";
            if (!day) return;
            if (!dayMap.has(day)) {
                dayMap.set(day, { incoming: 0, outgoing: 0 });
            }
            const entry = dayMap.get(day)!;
            const qty = m.product_uom_qty || 0;
            if (m.picking_code === "incoming" || m.picking_code === "internal") {
                entry.incoming += qty;
            } else {
                entry.outgoing += qty;
            }
        });

        let runningCumulative = 0;
        const flowSeries = Array.from(dayMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, counts]) => {
                runningCumulative += (counts.incoming - counts.outgoing);
                return {
                    date,
                    label: format(new Date(date), "dd MMM", { locale: fr }),
                    incoming: counts.incoming,
                    outgoing: counts.outgoing,
                    cumulative: Math.max(0, runningCumulative)
                };
            });

        // 4. RÉPARTITION PAR BOUTIQUE (stock.quant groupé par company_id)
        const quants = await odooJsonClient.readGroup<any>("stock.quant", {
            domain: [
                ["product_id", "in", productIds],
                ["location_id.usage", "=", "internal"]
            ],
            fields: ["quantity", "company_id"],
            groupby: ["company_id"],
            lazy: false
        });

        // Palette Luxe (Rose, Émeraude, Indigo, Ambre, Ciel, Violet)
        const LUXURY_PALETTE = ["#ec4899", "#10b981", "#6366f1", "#f59e0b", "#06b6d4", "#8b5cf6"];

        const shopDistribution = quants.map((q: any, idx: number) => {
            const compId = q.company_id?.[0];
            const matchedShop = dbShops?.find(s => s.odoo_company_id === compId);
            const shopName = matchedShop ? matchedShop.name : (q.company_id?.[1] || `Société #${compId}`);

            return {
                name: shopName,
                value: Math.max(0, Math.round(q.quantity || 0)),
                color: LUXURY_PALETTE[idx % LUXURY_PALETTE.length]
            };
        }).filter(item => item.value > 0);

        // 5. HEATMAP DES 4 DERNIÈRES SEMAINES (28 Jours réels)
        const heatmapMoves = await odooJsonClient.searchRead<any>("stock.move", {
            domain: [
                ["product_id", "in", productIds],
                ["state", "=", "done"],
                ["date", ">=", fourWeeksAgo]
            ],
            fields: ["product_uom_qty", "date"]
        });

        const heatmapCounts = new Map<string, number>();
        heatmapMoves.forEach((m: any) => {
            const dateStr = m.date ? m.date.slice(0, 10) : "";
            if (dateStr) {
                heatmapCounts.set(dateStr, (heatmapCounts.get(dateStr) || 0) + (m.product_uom_qty || 0));
            }
        });

        const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
        const WEEKS_LABEL = ["S-3", "S-2", "S-1", "S-0"];

        const today = new Date();
        const startOf4Weeks = startOfWeek(subDays(today, 21), { weekStartsOn: 1 });
        const heatmapData: Array<{ week: string; day: string; value: number; key: string }> = [];

        WEEKS_LABEL.forEach((weekLabel, wIdx) => {
            DAYS_FR.forEach((dayLabel, dIdx) => {
                const currentDay = addDays(startOf4Weeks, wIdx * 7 + dIdx);
                const dateKey = format(currentDay, "yyyy-MM-dd");
                const val = Math.round(heatmapCounts.get(dateKey) || 0);

                heatmapData.push({
                    week: weekLabel,
                    day: dayLabel,
                    value: val,
                    key: `${wIdx}-${dIdx}`
                });
            });
        });

        return { flowSeries, shopDistribution, heatmapData };

    } catch (error) {
        console.error("[ANALYTICS_ERROR] Erreur calcul analytiques stock:", error);
        return { flowSeries: [], shopDistribution: [], heatmapData: [] };
    }
}