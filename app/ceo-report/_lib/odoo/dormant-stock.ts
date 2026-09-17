import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

interface DormantStockParams {
    companyId?: number;
    thresholdDays?: number;
}

export interface DormantGroup {
    /** hs_code partagé (ou product_id si pas de hs_code) */
    groupKey: string;
    /** Nom lisible du produit */
    productName: string;
    /** Nombre d'articles physiques dans le groupe */
    unitCount: number;
    /** Quantité totale en stock */
    totalQty: number;
    /** Valeur totale du groupe */
    totalValue: number;
    /** Dernière vente du groupe (n'importe quel article) */
    lastSaleDate: string | null;
    /** Jours depuis la dernière vente */
    daysSinceLastSale: number | null;
}

export interface DormantStockResult {
    count: number;
    value: number;
    percentOfStock: number;
    topProducts: DormantGroup[];
    thresholdDays: number;
}

export async function fetchDormantStock({
    companyId,
    thresholdDays = 90,
}: DormantStockParams): Promise<DormantStockResult> {
    const context = companyId ? { allowed_company_ids: [companyId] } : {};

    // ─────────────────────────────────────────────
    // 1. Récupérer tous les produits avec du stock
    // ─────────────────────────────────────────────
    const quantDomain: OdooDomain = [
        ["location_id.usage", "=", "internal"],
        ["quantity", ">", 0],
    ];
    if (companyId) quantDomain.push(["company_id", "=", companyId]);

    const quants = await odooClient.readGroup<{
        product_id: [number, string] | false;
        quantity: number;
    }>("stock.quant", {
        domain: quantDomain,
        fields: ["quantity:sum"],
        groupby: ["product_id"],
        context,
    });

    const qtyByProduct = new Map<number, { name: string; qty: number }>();
    for (const q of quants) {
        if (!q.product_id) continue;
        qtyByProduct.set(q.product_id[0], {
            name: q.product_id[1],
            qty: q.quantity ?? 0,
        });
    }

    if (qtyByProduct.size === 0) {
        return {
            count: 0,
            value: 0,
            percentOfStock: 0,
            topProducts: [],
            thresholdDays,
        };
    }

    const productIds = Array.from(qtyByProduct.keys());
    const CHUNK_SIZE = 500;

    // ─────────────────────────────────────────────
    // 2. Récupérer cost + hs_code pour chaque produit
    // ─────────────────────────────────────────────
    const costByProduct = new Map<number, number>();
    const hsCodeByProduct = new Map<number, string>();

    for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
        const chunk = productIds.slice(i, i + CHUNK_SIZE);
        const products = await odooClient.searchRead<{
            id: number;
            standard_price: number;
            hs_code: string | false;
        }>("product.product", {
            domain: [["id", "in", chunk]],
            fields: ["standard_price", "hs_code"],
            limit: CHUNK_SIZE,
            context,
        });

        for (const p of products) {
            costByProduct.set(p.id, p.standard_price ?? 0);
            if (p.hs_code && typeof p.hs_code === "string") {
                hsCodeByProduct.set(p.id, p.hs_code);
            }
        }
    }

    // ─────────────────────────────────────────────
    // 3. Grouper les produits par hs_code
    //    - Si hs_code présent : clé = hs_code
    //    - Sinon : clé = "product-{id}" (fallback unique)
    // ─────────────────────────────────────────────
    type Group = {
        productName: string;
        unitCount: number;
        totalQty: number;
        totalValue: number;
        productIds: number[];
    };

    const groups = new Map<string, Group>();

    for (const [pid, { name, qty }] of qtyByProduct.entries()) {
        const hsCode = hsCodeByProduct.get(pid);
        const groupKey = hsCode ? `hs:${hsCode}` : `p:${pid}`;
        const cost = costByProduct.get(pid) ?? 0;
        const value = qty * cost;

        const existing = groups.get(groupKey);
        if (existing) {
            existing.unitCount += 1;
            existing.totalQty += qty;
            existing.totalValue += value;
            existing.productIds.push(pid);
        } else {
            groups.set(groupKey, {
                productName: name,
                unitCount: 1,
                totalQty: qty,
                totalValue: value,
                productIds: [pid],
            });
        }
    }

    // ─────────────────────────────────────────────
    // 4. Récupérer la dernière vente PAR PRODUIT (12 derniers mois)
    //    puis agréger par groupe
    // ─────────────────────────────────────────────
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split("T")[0];

    const saleLineDomain: OdooDomain = [
        ["order_id.state", "in", ["paid", "done", "invoiced"]],
        ["order_id.date_order", ">=", `${oneYearAgoStr} 00:00:00`],
        ["product_id", "in", productIds],
    ];
    if (companyId) saleLineDomain.push(["order_id.company_id", "=", companyId]);

    const saleLines = await odooClient.searchRead<{
        product_id: [number, string];
        order_id: [number, string];
    }>("pos.order.line", {
        domain: saleLineDomain,
        fields: ["product_id", "order_id"],
        limit: 50000,
        context,
    });

    // Récupérer les dates de commandes
    const orderIds = Array.from(
        new Set(saleLines.map((l) => l.order_id[0]).filter(Boolean))
    );
    const orderDateById = new Map<number, string>();

    for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
        const chunk = orderIds.slice(i, i + CHUNK_SIZE);
        const orders = await odooClient.searchRead<{
            id: number;
            date_order: string;
        }>("pos.order", {
            domain: [["id", "in", chunk]],
            fields: ["date_order"],
            limit: CHUNK_SIZE,
            context,
        });

        for (const o of orders) {
            orderDateById.set(o.id, o.date_order);
        }
    }

    // Map { productId → dernière date de vente }
    const lastSaleByProduct = new Map<number, string>();
    for (const l of saleLines) {
        if (!l.product_id) continue;
        const pid = l.product_id[0];
        const date = orderDateById.get(l.order_id[0]);
        if (!date) continue;

        const current = lastSaleByProduct.get(pid);
        if (!current || date > current) {
            lastSaleByProduct.set(pid, date);
        }
    }

    // ─────────────────────────────────────────────
    // 5. Calcul du dernier mouvement PAR GROUPE
    //    = max des dates de vente de tous ses product_ids
    // ─────────────────────────────────────────────
    const now = new Date();
    const dormant: DormantGroup[] = [];
    let totalDormantValue = 0;
    let totalStockValue = 0;

    for (const [groupKey, group] of groups.entries()) {
        totalStockValue += group.totalValue;

        // Dernière vente du groupe = max sur tous ses produits
        let lastSale: string | null = null;
        for (const pid of group.productIds) {
            const date = lastSaleByProduct.get(pid);
            if (date && (!lastSale || date > lastSale)) {
                lastSale = date;
            }
        }

        let daysSince: number | null = null;
        if (lastSale) {
            const lastSaleDate = new Date(lastSale);
            daysSince = Math.round(
                (now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)
            );
        }

        const isDormant = daysSince === null || daysSince >= thresholdDays;

        if (isDormant && group.totalValue > 0) {
            dormant.push({
                groupKey,
                productName: group.productName,
                unitCount: group.unitCount,
                totalQty: group.totalQty,
                totalValue: group.totalValue,
                lastSaleDate: lastSale,
                daysSinceLastSale: daysSince,
            });
            totalDormantValue += group.totalValue;
        }
    }

    // ─────────────────────────────────────────────
    // 6. Tri par valeur + Top 20
    // ─────────────────────────────────────────────
    dormant.sort((a, b) => b.totalValue - a.totalValue);

    const percentOfStock =
        totalStockValue > 0 ? (totalDormantValue / totalStockValue) * 100 : 0;

    return {
        count: dormant.length,
        value: totalDormantValue,
        percentOfStock,
        topProducts: dormant.slice(0, 20),
        thresholdDays,
    };
}