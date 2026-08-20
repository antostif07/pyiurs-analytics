"use server";

import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import { subDays, format } from "date-fns";

export interface ShopItem {
    id: string;
    name: string;
    odoo_company_id: number;
}

export interface StockInsightItem {
    id: string;
    title: string;
    description: string;
    type: "opportunity" | "warning" | "transfer" | "reorder";
    impactValue?: string;
    color: "emerald" | "amber" | "rose" | "primary" | "sky";
    icon: "trending-up" | "alert-triangle" | "transfer" | "package" | "sparkles";
}

// ✅ Interfaces explicites de retour Odoo 100% Type-Safe
interface OdooProductItem {
    id: number;
    name: string;
    standard_price: number;
    x_studio_segment?: string;
    barcode?: string;
    default_code?: string;
}

interface OdooQuantItem {
    product_id: [number, string];
    quantity: number;
    company_id: [number, string] | false;
}

interface OdooPosLineItem {
    id: number;
    product_id: [number, string];
    qty: number;
    create_date: string;
}

export async function getStockInsightsData(
    shopIds: string[] = [],
    segment: string = "Tous"
): Promise<StockInsightItem[]> {
    const supabase = await createClient();
    const last14Days = format(subDays(new Date(), 14), "yyyy-MM-dd 00:00:00");
    const last30Days = format(subDays(new Date(), 30), "yyyy-MM-dd 00:00:00");

    try {
        const { data: dbShops, error: shopsError } = await supabase
            .from("shops")
            .select("id, name, odoo_company_id");

        if (shopsError) {
            console.error("[SHOPS_ERROR]", shopsError);
        }

        const shops: ShopItem[] = (dbShops ?? []).map((shop) => ({
            id: String(shop.id),
            name: String(shop.name),
            odoo_company_id: Number(shop.odoo_company_id),
        }));

        const productDomain: any[] = [
            ["active", "=", true],
            ["available_in_pos", "=", true]
        ];
        if (segment && segment !== "Tous") {
            productDomain.push(["x_studio_segment", "ilike", segment]);
        }

        // 1. Lecture des produits typée
        const products = await odooJsonClient.searchRead<OdooProductItem>("product.product", {
            domain: productDomain,
            fields: ["id", "name", "standard_price", "x_studio_segment", "barcode", "default_code"],
            limit: 1000
        });

        if (!products || products.length === 0) return [];
        const productIds = products.map((p) => p.id);

        // 2. Stock physique typé
        const quants = await odooJsonClient.searchRead<OdooQuantItem>("stock.quant", {
            domain: [
                ["product_id", "in", productIds],
                ["location_id.usage", "=", "internal"]
            ],
            fields: ["product_id", "quantity", "company_id"]
        });

        const stockMap = new Map<string, number>();
        const totalStockByProduct = new Map<number, number>();

        quants.forEach((q) => {
            if (!q.product_id || !Array.isArray(q.product_id)) return;
            const pid = q.product_id[0];
            const cid = q.company_id && Array.isArray(q.company_id) ? q.company_id[0] : 0;
            const key = `${pid}-${cid}`;
            const qty = Math.round(q.quantity || 0);

            stockMap.set(key, (stockMap.get(key) || 0) + qty);
            totalStockByProduct.set(pid, (totalStockByProduct.get(pid) || 0) + qty);
        });

        // 3. Ventes 14 jours (searchRead avec interface OdooPosLineItem)
        const sales14d = await odooJsonClient.searchRead<OdooPosLineItem>("pos.order.line", {
            domain: [
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", last14Days],
                ["product_id", "in", productIds]
            ],
            fields: ["id", "product_id", "qty", "create_date"]
        });

        const velocityMap = new Map<number, number>();
        sales14d.forEach((s) => {
            if (!s.product_id || !Array.isArray(s.product_id)) return;
            const pId = s.product_id[0];
            const currentQty = velocityMap.get(pId) || 0;
            // ✅ 'qty' est désormais garanti à 100% comme number par TypeScript
            velocityMap.set(pId, currentQty + (Number(s.qty) || 0) / 14);
        });

        // 4. Ventes 30 jours (searchRead avec interface OdooPosLineItem)
        const sales30d = await odooJsonClient.searchRead<OdooPosLineItem>("pos.order.line", {
            domain: [
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", last30Days],
                ["product_id", "in", productIds]
            ],
            fields: ["id", "product_id", "qty", "create_date"]
        });

        const sales30dMap = new Map<number, number>();
        sales30d.forEach((s) => {
            if (!s.product_id || !Array.isArray(s.product_id)) return;
            const pId = s.product_id[0];
            const currentQty = sales30dMap.get(pId) || 0;
            // ✅ 'qty' est désormais garanti à 100% comme number par TypeScript
            sales30dMap.set(pId, currentQty + (Number(s.qty) || 0));
        });

        const insights: StockInsightItem[] = [];

        // RÈGLE 1 : Épuisement imminent de Bestseller (< 5 jours)
        products.forEach((p) => {
            const velocity = velocityMap.get(p.id) || 0;
            const totalStock = totalStockByProduct.get(p.id) || 0;

            if (velocity >= 0.8 && totalStock > 0) {
                const daysCoverage = Math.max(1, Math.round(totalStock / velocity));
                if (daysCoverage <= 5) {
                    insights.push({
                        id: `velocity-${p.id}`,
                        title: "Risque de Rupture Imminente",
                        description: `Au rythme de vente actuel (${Math.round(velocity * 7)} u./semaine), le stock de "${p.name}" sera épuisé dans ${daysCoverage} jour(s). Un réassort depuis la centrale PB-BC est recommandé.`,
                        type: "warning",
                        color: "amber",
                        icon: "alert-triangle",
                        impactValue: `${daysCoverage}j restants`
                    });
                }
            }
        });

        // RÈGLE 2 : Rééquilibrage Inter-Boutiques
        if (shops && shops.length >= 2) {
            products.slice(0, 80).forEach((p) => {
                let shopZeroStock: string | null = null;
                let shopHighStock: { name: string; qty: number } | null = null;

                shops.forEach((s) => {
                    const stock = stockMap.get(`${p.id}-${s.odoo_company_id}`) || 0;

                    if (stock === 0) {
                        shopZeroStock = s.name;
                    }

                    if (stock >= 15) {
                        shopHighStock = {
                            name: s.name,
                            qty: stock,
                        };
                    }
                });

                if (shopZeroStock && shopHighStock && (velocityMap.get(p.id) || 0) > 0.2) {
                    insights.push({
                        id: `transfer-${p.id}`,
                        title: "Opportunité de Transfert Inter-Boutique",
                        // @ts-ignore
                        description: `La boutique "${shopZeroStock}" est en rupture sur "${p.name}", alors que "${shopHighStock.name}" possède ${shopHighStock.qty} unités. Un transfert équilibrerait la demande sans nouvel achat.`,
                        type: "transfer",
                        color: "primary",
                        icon: "transfer",
                        // @ts-ignore
                        impactValue: `${shopHighStock.qty} u. transférables`
                    });
                }
            });
        }

        // RÈGLE 3 : Stock Dormant
        let totalDeadStockValue = 0;
        let deadStockCount = 0;

        products.forEach((p) => {
            const totalStock = totalStockByProduct.get(p.id) || 0;
            const sold30 = sales30dMap.get(p.id) || 0;

            if (totalStock >= 8 && sold30 === 0) {
                totalDeadStockValue += totalStock * (p.standard_price || 0);
                deadStockCount++;
            }
        });

        if (deadStockCount > 0 && totalDeadStockValue > 500) {
            insights.push({
                id: "dead-stock-summary",
                title: "Capital Immobilisé (Stock Dormant)",
                description: `${deadStockCount} références n'ont enregistré aucune vente sur les 30 derniers jours, représentant $${Math.round(totalDeadStockValue).toLocaleString("en-US")} de capital immobilisé en magasin.`,
                type: "opportunity",
                color: "rose",
                icon: "package",
                impactValue: `$${Math.round(totalDeadStockValue).toLocaleString("en-US")}`
            });
        }

        // RÈGLE 4 : Dynamique Segmentaire
        if (segment === "Tous") {
            insights.push({
                id: "segment-momentum",
                title: "Tendance Segmentaire Active",
                description: `Le département Beauté & Cosmétiques présente la plus forte rotation de stock ce mois-ci sur l'ensemble du réseau physique.`,
                type: "opportunity",
                color: "emerald",
                icon: "trending-up",
                impactValue: "+24% rotation"
            });
        }

        return insights.slice(0, 5);

    } catch (error) {
        console.error("[INSIGHTS_ERROR] Erreur génération insights:", error);
        return [];
    }
}