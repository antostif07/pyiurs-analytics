import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";

interface StockValueParams {
    companyId?: number;
}

interface StockValueResult {
    total: number;
    currency: "USD" | "CDF";
    productCount: number;
}

export async function fetchStockValue({
    companyId,
}: StockValueParams): Promise<StockValueResult> {
    // 1. Récupérer les quantités en stock interne, groupées par produit
    const quantDomain: OdooDomain = [
        ["location_id.usage", "=", "internal"],
        ["quantity", "!=", 0],
    ];
    if (companyId) quantDomain.push(["company_id", "=", companyId]);

    const context = companyId ? { allowed_company_ids: [companyId] } : {};

    const quants = await odooClient.readGroup<{
        product_id: [number, string] | false;
        quantity: number;
    }>("stock.quant", {
        domain: quantDomain,
        fields: ["quantity:sum"],
        groupby: ["product_id"],
        context,
    });

    // 2. Construire la map { productId → quantité totale }
    const qtyByProduct = new Map<number, number>();
    for (const q of quants) {
        if (!q.product_id) continue;
        const pid = q.product_id[0];
        qtyByProduct.set(pid, q.quantity ?? 0);
    }

    if (qtyByProduct.size === 0) {
        return { total: 0, currency: "USD", productCount: 0 };
    }

    // 3. Récupérer les coûts unitaires (par lots de 500 pour éviter les limites)
    const productIds = Array.from(qtyByProduct.keys());
    const CHUNK_SIZE = 500;
    const priceByProduct = new Map<number, number>();

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
            priceByProduct.set(p.id, p.standard_price ?? 0);
        }
    }

    // 4. Calcul de la valeur totale
    let total = 0;
    for (const [pid, qty] of qtyByProduct.entries()) {
        const price = priceByProduct.get(pid) ?? 0;
        total += qty * price;
    }

    return {
        total,
        currency: "USD",
        productCount: qtyByProduct.size,
    };
}