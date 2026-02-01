import { odooClient } from "@/lib/odoo/xmlrpc";
import { POSOrder, POSOrderLine } from "../types/pos";
import { OdooProductTemplate, ProductProduct } from "../types/product_template";

export interface IDataAnalyseByProductData {
    hs_code: string;
    product_name: string;
    template_id: number;
    list_price: number;
    qty_available: number;
    barcode: string;
    image_url: string;

    // ventes
    sales_current: number;
    sales_prev1: number;
    sales_prev2: number;

    qty_current: number;
    qty_prev1: number;
    qty_prev2: number;

    // infos mois
    month_current: string;
    month_prev1: string;
    month_prev2: string;

    // forecast
    forecast_end_of_month: number;
}

const MONTH_NAMES = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];

export async function getDataAnalyseByProductData(month: string, year: string): Promise<IDataAnalyseByProductData[]> {
    const m = Number(month);
    const y = Number(year);

    // ▸ Mois actuels, -1, -2
    const monthCurrent = getMonthBoundaries(m, y);
    const monthPrev1 = getMonthBoundaries(m - 1 > 0 ? m - 1 : 12, m - 1 > 0 ? y : y - 1);
    const monthPrev2 = getMonthBoundaries(m - 2 > 0 ? m - 2 : 12 + (m - 2), m - 2 > 0 ? y : y - 1);

    // Nom des mois
    const nameCurrent = MONTH_NAMES[m - 1];
    const namePrev1 = MONTH_NAMES[(m - 2 + 12) % 12];
    const namePrev2 = MONTH_NAMES[(m - 3 + 12) % 12];

    // -----------------------------
    // LOAD POS ORDERS FOR 3 MONTHS
    // -----------------------------
    const posOrdersCurrent = await odooClient("pos.order", "search_read", [
        [
            ["date_order", ">=", monthCurrent.start],
            ["date_order", "<", monthCurrent.end],
            ["state", "in", ["paid", "done"]],
        ],
        ["id"]
    ]);

    const posOrdersPrev1 = await odooClient("pos.order", "search_read", [
        [
            ["date_order", ">=", monthPrev1.start],
            ["date_order", "<", monthPrev1.end],
            ["state", "in", ["paid", "done"]],
        ],
        ["id"]
    ]);

    const posOrdersPrev2 = await odooClient("pos.order", "search_read", [
        [
            ["date_order", ">=", monthPrev2.start],
            ["date_order", "<", monthPrev2.end],
            ["state", "in", ["paid", "done"]],
        ],
        ["id"]
    ]);

    const idsCurrent = (posOrdersCurrent as unknown as POSOrder[]).map(o => o.id);
    const idsPrev1 = (posOrdersPrev1 as unknown as POSOrder[]).map(o => o.id);
    const idsPrev2 = (posOrdersPrev2 as unknown as POSOrder[]).map(o => o.id);

    const allOrderIds = [...idsCurrent, ...idsPrev1, ...idsPrev2];
    if (allOrderIds.length === 0) return [];

    // -----------------------------
    // POS ORDER LINES
    // -----------------------------
    const posLines = await odooClient("pos.order.line", "search_read", [
        [["order_id", "in", allOrderIds]],
        ["order_id", "product_id", "price_subtotal", "qty"]
    ]);

    // -----------------------------
    // PRODUCTS & TEMPLATE LOADING
    // -----------------------------
    const productIds = [...new Set((posLines as unknown as POSOrderLine[]).map(l => l.product_id?.[0]))];

    const products = await odooClient("product.product", "search_read", [
        [["id", "in", productIds]],
        ["id", "product_tmpl_id"]
    ]);

    const templateIds = [
        ...new Set((products as unknown as ProductProduct[]).map(p => p.product_tmpl_id?.[0]))
    ];

    const templates = await odooClient("product.template", "search_read", [
        [["id", "in", templateIds], ['x_studio_segment', 'ilike', 'beauty']],
        ["id", "name", "hs_code", "list_price", "barcode", "qty_available"]
    ]);

    const productIndex = Object.fromEntries((products as unknown as ProductProduct[]).map(p => [p.id, p]));
    const templateIndex = Object.fromEntries((templates as unknown as OdooProductTemplate[]).map(t => [t.id, t]));

    // -----------------------------
    // GROUPING BY HS CODE
    // -----------------------------
    const groups: Record<string, any> = {};

    for (const line of (posLines as unknown as POSOrderLine[])) {
        const prod = productIndex[line.product_id?.[0]];
        if (!prod) continue;

        const tmpl = templateIndex[prod.product_tmpl_id?.[0]];
        if (!tmpl) continue;

        const hs = tmpl.hs_code || "NO_HS_CODE";

        if (!groups[hs]) {
            groups[hs] = {
                hs_code: hs,
                product_name: tmpl.name,
                template_id: tmpl.id,
                list_price: tmpl.list_price,
                qty_available: tmpl.qty_available,
                barcode: tmpl.barcode,
                image_url: `https://images.pyiurs.com/images/${hs}_.jpg`,

                sales_current: 0,
                sales_prev1: 0,
                sales_prev2: 0,

                qty_current: 0,
                qty_prev1: 0,
                qty_prev2: 0,

                month_current: nameCurrent,
                month_prev1: namePrev1,
                month_prev2: namePrev2,

                forecast_end_of_month: 0
            };
        }

        const orderId = line.order_id?.[0];

        if (idsCurrent.includes(orderId)) {
            groups[hs].sales_current += line.price_subtotal;
            groups[hs].qty_current += line.qty;
        } else if (idsPrev1.includes(orderId)) {
            groups[hs].sales_prev1 += line.price_subtotal;
            groups[hs].qty_prev1 += line.qty;
        } else if (idsPrev2.includes(orderId)) {
            groups[hs].sales_prev2 += line.price_subtotal;
            groups[hs].qty_prev2 += line.qty;
        }
    }

    // -----------------------------
    // FORECAST
    // -----------------------------
    const today = new Date();
    const daysInMonth = new Date(y, m, 0).getDate();
    const dayOfMonth = today.getMonth() + 1 === m ? today.getDate() : daysInMonth;

    for (const hs in groups) {
        const g = groups[hs];

        const baseline = (g.qty_prev1 + g.qty_prev2) / 2;
        const progressRatio = dayOfMonth / daysInMonth;

        g.forecast_end_of_month =
            baseline * (1 + (g.qty_current / (baseline || 1) - progressRatio));

        if (g.forecast_end_of_month < 0) g.forecast_end_of_month = 0;
    }

    return Object.values(groups);
}

function getMonthBoundaries(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    return { start: start.toISOString(), end: end.toISOString() };
}
