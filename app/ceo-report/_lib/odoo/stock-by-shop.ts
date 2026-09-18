import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

interface StockByShopParams {
    /** Si fourni → mode "une boutique". Sinon → mode "consolidé toutes boutiques". */
    companyId?: number;
    /** Optionnel : liste explicite de companies à inclure (mode consolidé) */
    companyIds?: number[];
}

export interface ShopStock {
    companyId: number;
    shopName: string;
    value: number;
    productCount: number;
    totalQty: number;
    percentOfTotal: number;
}

export interface StockByShopResult {
    shops: ShopStock[];
    total: number;
    topShop: ShopStock | null;
}

export async function fetchStockByShop({
    companyId,
    companyIds,
}: StockByShopParams): Promise<StockByShopResult> {
    // ─────────────────────────────────────────────
    // 1. Déterminer la liste des companies à interroger
    // ─────────────────────────────────────────────
    let targetCompanyIds: number[];

    if (companyId) {
        // Mode "une boutique"
        targetCompanyIds = [companyId];
    } else if (companyIds && companyIds.length > 0) {
        // Mode "liste explicite"
        targetCompanyIds = companyIds;
    } else {
        // Mode "consolidé" : récupérer toutes les companies actives
        const companies = await odooClient.searchRead<{ id: number }>(
            "res.company",
            {
                domain: [],
                fields: ["id"],
                limit: 100,
            }
        );
        targetCompanyIds = companies.map((c) => c.id);
    }

    if (targetCompanyIds.length === 0) {
        return { shops: [], total: 0, topShop: null };
    }

    // ─────────────────────────────────────────────
    // 2. Contexte : autoriser toutes les companies cibles
    //    (sinon Odoo filtre par la company de l'utilisateur)
    // ─────────────────────────────────────────────
    const context = { allowed_company_ids: targetCompanyIds };

    // ─────────────────────────────────────────────
    // 3. Récupérer les quants internes (toutes companies cibles)
    // ─────────────────────────────────────────────
    const quantDomain: OdooDomain = [
        ["location_id.usage", "=", "internal"],
        ["quantity", "!=", 0],
        ["company_id", "in", targetCompanyIds],
    ];

    const quants = await odooClient.searchRead<{
        product_id: [number, string];
        company_id: [number, string];
        quantity: number;
    }>("stock.quant", {
        domain: quantDomain,
        fields: ["product_id", "company_id", "quantity"],
        limit: 30000,
        context,
    });

    if (quants.length === 0) {
        return { shops: [], total: 0, topShop: null };
    }

    // ─────────────────────────────────────────────
    // 4. Récupérer les noms des companies (boutiques)
    // ─────────────────────────────────────────────
    const companyNameById = new Map<number, string>();
    const CHUNK_SIZE = 500;

    for (let i = 0; i < targetCompanyIds.length; i += CHUNK_SIZE) {
        const chunk = targetCompanyIds.slice(i, i + CHUNK_SIZE);
        const companies = await odooClient.searchRead<{
            id: number;
            name: string;
        }>("res.company", {
            domain: [["id", "in", chunk]],
            fields: ["name"],
            limit: CHUNK_SIZE,
        });

        for (const c of companies) {
            companyNameById.set(c.id, c.name);
        }
    }

    // ─────────────────────────────────────────────
    // 5. Récupérer les coûts d'achat des produits
    // ─────────────────────────────────────────────
    const productIds = Array.from(
        new Set(quants.map((q) => q.product_id[0]).filter(Boolean))
    );

    const costByProduct = new Map<number, number>();

    for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
        const chunk = productIds.slice(i, i + CHUNK_SIZE);
        const products = await odooClient.searchRead<{
            id: number;
            standard_price: number;
        }>("product.product", {
            domain: [["id", "in", chunk]],
            fields: ["standard_price"],
            limit: CHUNK_SIZE,
            context,
        });

        for (const p of products) {
            costByProduct.set(p.id, p.standard_price ?? 0);
        }
    }

    // ─────────────────────────────────────────────
    // 6. Agréger par company (boutique)
    // ─────────────────────────────────────────────
    type ShopAgg = {
        value: number;
        qty: number;
        products: Set<number>;
    };

    const byShop = new Map<number, ShopAgg>();

    for (const q of quants) {
        const cid = q.company_id?.[0];
        if (!cid) continue;

        const pid = q.product_id[0];
        const cost = costByProduct.get(pid) ?? 0;
        const value = (q.quantity ?? 0) * cost;

        let agg = byShop.get(cid);
        if (!agg) {
            agg = { value: 0, qty: 0, products: new Set() };
            byShop.set(cid, agg);
        }

        agg.value += value;
        agg.qty += q.quantity ?? 0;
        agg.products.add(pid);
    }

    // ─────────────────────────────────────────────
    // 7. Construire le résultat final
    // ─────────────────────────────────────────────
    const shops: ShopStock[] = [];
    let total = 0;

    for (const [cid, agg] of byShop.entries()) {
        shops.push({
            companyId: cid,
            shopName: companyNameById.get(cid) ?? `Boutique #${cid}`,
            value: agg.value,
            productCount: agg.products.size,
            totalQty: agg.qty,
            percentOfTotal: 0,
        });
        total += agg.value;
    }

    for (const shop of shops) {
        shop.percentOfTotal = total > 0 ? (shop.value / total) * 100 : 0;
    }

    shops.sort((a, b) => b.value - a.value);

    return {
        shops,
        total,
        topShop: shops[0] ?? null,
    };
}