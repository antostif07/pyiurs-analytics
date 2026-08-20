"use server";

import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";

export interface StockAlertItem {
    id: string;
    type: "out_of_stock" | "low" | "overstock" | "inactive";
    severity: "critical" | "warning" | "info";
    shopName: string;
    productName: string;
    barcode: string;
    currentStock: number;
    unitCost: number;
    message: string;
    recommendedAction: "restock" | "transfer" | "view";
}

/**
 * Analyse le stock réel Odoo et détecte les ruptures, stocks faibles et surstocks
 */
export async function getStockAlertsData(
    shopIds: string[] = [],
    segment: string = "Tous"
): Promise<StockAlertItem[]> {
    const supabase = await createClient();
    const last30Days = format(subDays(new Date(), 30), "yyyy-MM-dd 00:00:00");

    try {
        // 1. Boutiques Supabase
        const { data: dbShops } = await supabase.from("shops").select("id, name, odoo_company_id");

        // 2. Produits Odoo filtrés par Segment
        const productDomain: any[] = [
            ["active", "=", true],
            ["available_in_pos", "=", true]
        ];
        if (segment && segment !== "Tous") {
            productDomain.push(["x_studio_segment", "ilike", segment]);
        }

        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: productDomain,
            fields: ["id", "name", "barcode", "default_code", "standard_price", "x_studio_segment"],
            limit: 1000
        });

        if (!products || products.length === 0) return [];
        const productIds = products.map((p: any) => p.id);

        // 3. Stock réel en rayon (stock.quant)
        const quants = await odooJsonClient.searchRead<any>("stock.quant", {
            domain: [
                ["product_id", "in", productIds],
                ["location_id.usage", "=", "internal"]
            ],
            fields: ["product_id", "quantity", "company_id"]
        });

        // Map: (productId + companyId) -> stock
        const stockMap = new Map<string, number>();
        quants.forEach((q: any) => {
            const pid = q.product_id[0];
            const cid = q.company_id ? q.company_id[0] : 0;
            const key = `${pid}-${cid}`;
            stockMap.set(key, (stockMap.get(key) || 0) + (q.quantity || 0));
        });

        // 4. Ventes des 30 derniers jours (pos.order.line)
        const sales = await odooJsonClient.readGroup<any>("pos.order.line", {
            domain: [
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", last30Days],
                ["product_id", "in", productIds]
            ],
            fields: ["qty", "product_id"],
            groupby: ["product_id"],
            lazy: false
        });

        const salesMap = new Map<number, number>();
        sales.forEach((s: any) => {
            salesMap.set(s.product_id[0], s.qty || 0);
        });

        // 5. Analyse des anomalies de stock
        const alerts: StockAlertItem[] = [];

        products.forEach((p: any) => {
            const barcode = p.barcode || p.default_code || "—";
            const sales30d = salesMap.get(p.id) || 0;
            const unitCost = p.standard_price || 0;

            // Parcourir chaque boutique pour isoler ses alertes
            (dbShops || []).forEach((shop) => {
                const cid = shop.odoo_company_id || 0;
                const stock = Math.round(stockMap.get(`${p.id}-${cid}`) || 0);

                // A. Rupture de stock critique sur produit à forte demande
                if (stock === 0 && sales30d > 0) {
                    alerts.push({
                        id: `oos-${p.id}-${shop.id}`,
                        type: "out_of_stock",
                        severity: "critical",
                        shopName: shop.name,
                        productName: p.name,
                        barcode,
                        currentStock: 0,
                        unitCost,
                        message: `Rupture totale en boutique (${sales30d} ventes sur 30j).`,
                        recommendedAction: "restock",
                    });
                }
                // B. Stock faible / Critique (1 à 3 unités restantes)
                else if (stock > 0 && stock <= 3 && sales30d >= 3) {
                    alerts.push({
                        id: `low-${p.id}-${shop.id}`,
                        type: "low",
                        severity: "warning",
                        shopName: shop.name,
                        productName: p.name,
                        barcode,
                        currentStock: stock,
                        unitCost,
                        message: `Stock critique : ${stock} unité(s) restante(s) pour un rythme de ${sales30d} ventes/mois.`,
                        recommendedAction: "restock",
                    });
                }
                // C. Surstock immobilisé
                else if (stock > 40 && sales30d < 5) {
                    alerts.push({
                        id: `over-${p.id}-${shop.id}`,
                        type: "overstock",
                        severity: "info",
                        shopName: shop.name,
                        productName: p.name,
                        barcode,
                        currentStock: stock,
                        unitCost,
                        message: `Surstock : ${stock} unités en rayon sans rotation suffisante (${sales30d} ventes/mois).`,
                        recommendedAction: "transfer",
                    });
                }
            });
        });

        // Tri par gravité : critical -> warning -> info
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]).slice(0, 15);

    } catch (error) {
        console.error("[ALERTS_ERROR] Erreur calcul alertes stock:", error);
        return [];
    }
}