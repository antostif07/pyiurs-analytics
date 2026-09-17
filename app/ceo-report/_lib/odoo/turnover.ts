import { odooClient, OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { fetchStockValue } from "./stock-value";

interface TurnoverParams {
    from: string;
    to: string;
    companyId?: number;
}

interface TurnoverResult {
    /** Rotation annualisée (nb de fois que le stock tourne dans l'année) */
    ratio: number;
    /** Jours de stock (365 / ratio) */
    daysOfStock: number;
    /** COGS calculé sur la période (qté vendue × coût d'achat) */
    cogs: number;
    /** Valeur du stock actuelle */
    stockValue: number;
    /** Nombre de produits distincts vendus */
    productCount: number;
    /** Nombre de produits sans coût d'achat renseigné */
    productWithoutCost: number;
    /** Nombre de jours de la période analysée */
    periodDays: number;
}

export async function fetchTurnover({
    from,
    to,
    companyId,
}: TurnoverParams): Promise<TurnoverResult> {
    const context = companyId ? { allowed_company_ids: [companyId] } : {};

    // ─────────────────────────────────────────────
    // 1. Domaine sur les lignes POS
    // ─────────────────────────────────────────────
    const lineDomain: OdooDomain = [
        ["order_id.state", "in", ["paid", "done", "invoiced"]],
        ["order_id.date_order", ">=", `${from} 00:00:00`],
        ["order_id.date_order", "<=", `${to} 23:59:59`],
        ["product_id", "!=", false],
    ];
    if (companyId) lineDomain.push(["order_id.company_id", "=", companyId]);

    // ─────────────────────────────────────────────
    // 2. Récupération des lignes POS
    //    ⚠️ Champ quantité = "qty" sur pos.order.line
    // ─────────────────────────────────────────────
    const lines = await odooClient.searchRead<{
        product_id: [number, string];
        qty: number;
    }>("pos.order.line", {
        domain: lineDomain,
        fields: ["product_id", "qty"],
        limit: 20000,
        context,
    });

    // ─────────────────────────────────────────────
    // 3. Agrégation des quantités par produit
    // ─────────────────────────────────────────────
    const qtySoldByProduct = new Map<number, number>();
    for (const l of lines) {
        if (!l.product_id) continue;
        const pid = l.product_id[0];
        qtySoldByProduct.set(pid, (qtySoldByProduct.get(pid) ?? 0) + (l.qty ?? 0));
    }

    if (qtySoldByProduct.size === 0) {
        return {
            ratio: 0,
            daysOfStock: 0,
            cogs: 0,
            stockValue: 0,
            productCount: 0,
            productWithoutCost: 0,
            periodDays: 0,
        };
    }

    // ─────────────────────────────────────────────
    // 4. Récupération des coûts d'achat (standard_price)
    //    Pagination par lots de 500
    // ─────────────────────────────────────────────
    const productIds = Array.from(qtySoldByProduct.keys());
    const costByProduct = new Map<number, number>();
    const CHUNK_SIZE = 500;

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
    // 5. Calcul du COGS
    // ─────────────────────────────────────────────
    let cogs = 0;
    let productWithoutCost = 0;

    for (const [pid, qty] of qtySoldByProduct.entries()) {
        const cost = costByProduct.get(pid);
        if (!cost || cost <= 0) {
            productWithoutCost++;
            continue;
        }
        cogs += qty * cost;
    }

    // ─────────────────────────────────────────────
    // 6. Valeur du stock actuel
    // ─────────────────────────────────────────────
    const { total: stockValue } = await fetchStockValue({ companyId });

    // ─────────────────────────────────────────────
    // 7. Nombre de jours de la période analysée
    // ─────────────────────────────────────────────
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const periodDays = Math.max(
        1,
        Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // ─────────────────────────────────────────────
    // 8. Guards : si pas de stock ou pas de COGS → tout à 0
    // ─────────────────────────────────────────────
    if (stockValue <= 0 || cogs <= 0) {
        return {
            ratio: 0,
            daysOfStock: 0,
            cogs,
            stockValue,
            productCount: qtySoldByProduct.size,
            productWithoutCost,
            periodDays,
        };
    }

    // ─────────────────────────────────────────────
    // 9. Calcul rotation
    //    - Annualisation si période >= 28 jours (couvre février)
    //    - Sinon on retourne le ratio brut de la période
    // ─────────────────────────────────────────────
    const periodTurnover = cogs / stockValue;
    const annualizedRatio =
        periodDays >= 28 ? periodTurnover * (365 / periodDays) : periodTurnover;

    const daysOfStock = annualizedRatio > 0 ? 365 / annualizedRatio : 0;

    return {
        ratio: annualizedRatio,
        daysOfStock,
        cogs,
        stockValue,
        productCount: qtySoldByProduct.size,
        productWithoutCost,
        periodDays,
    };
}