'use server'

import { odooClient } from "@/lib/odoo/xmlrpc";
import { createClient } from "@/lib/supabase/server";
import { 
  startOfMonth, endOfMonth, subMonths, format, 
  getWeek, startOfWeek, 
  subDays
} from "date-fns";

export async function getRevenueDashboardData(month: string, year: string) {
    const supabase = await createClient();
    const now = new Date();
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    // --- PÉRIODES ---
    const mtdStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00');
    const mtdEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');
    const prevMtdStart = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 00:00:00');
    const prevMtdEnd = format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 23:59:59');

    // Aujourd'hui et Hier (Dates réelles)
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
    const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd 00:00:00');

    // --- LOGIQUE TEMPORELLE POUR FORECAST ---
    const isCurrentMonth = month === format(now, 'MM') && year === format(now, 'yyyy');
    const totalDaysInMonth = endOfMonth(selectedDate).getDate();
    // Si c'est le mois en cours, on prend le jour actuel, sinon on prend le total du mois (car fini)
    const daysPassed = isCurrentMonth ? now.getDate() : totalDaysInMonth;

    try {
        const [{ data: dbShops }, { data: targets }] = await Promise.all([
            supabase.from('shops').select('*').order('name'),
            supabase.from('sales_targets').select('*').eq('year', parseInt(year)).eq('month', parseInt(month))
        ]);

        if (!dbShops) return [];
        const allPosIds = dbShops.flatMap(s => s.odoo_pos_ids || []);

        const [currentOrders, previousOrders] = await Promise.all([
            odooClient.searchRead("pos.order", {
                domain: [["config_id", "in", allPosIds], ["date_order", ">=", mtdStart], ["date_order", "<=", mtdEnd], ["state", "in", ["paid", "done", "invoiced"]]],
                fields: ["config_id", "amount_total", "date_order"]
            }),
            odooClient.searchRead("pos.order", {
                domain: [["config_id", "in", allPosIds], ["date_order", ">=", prevMtdStart], ["date_order", "<=", prevMtdEnd], ["state", "in", ["paid", "done", "invoiced"]]],
                fields: ["config_id", "amount_total"]
            })
        ]) as [any[], any[]];

        const currentOrderIds = currentOrders.map(o => o.id);
        const previousOrderIds = previousOrders.map(o => o.id);

        const [currentLines, previousLines] = await Promise.all([
            currentOrderIds.length > 0 ? odooClient.searchRead("pos.order.line", {
                domain: [["order_id", "in", currentOrderIds]],
                fields: ["order_id", "price_subtotal_incl", "product_id"]
            }) : Promise.resolve([]),
            previousOrderIds.length > 0 ? odooClient.searchRead("pos.order.line", {
                domain: [["order_id", "in", previousOrderIds]],
                fields: ["order_id", "price_subtotal_incl", "product_id"]
            }) : Promise.resolve([])
        ]) as [any[], any[]];

        const allProductIds = [...new Set([...currentLines, ...previousLines].map(l => l.product_id[0]))];
        const productsInfo = allProductIds.length > 0 ? await odooClient.searchRead("product.product", {
            domain: [["id", "in", allProductIds]],
            fields: ["x_studio_segment"]
        }) as any[] : [];

        return dbShops.map(shop => {
            const posIds = shop.odoo_pos_ids || [];
            const shopOrders = currentOrders.filter(o => posIds.includes(o.config_id[0]));
            const shopOrdersPrev = previousOrders.filter(o => posIds.includes(o.config_id[0]));
            const mtd = shopOrders.reduce((acc, curr) => acc + curr.amount_total, 0);
            const mtdPrev = shopOrdersPrev.reduce((acc, curr) => acc + curr.amount_total, 0);

            const segmentData: Record<string, { mtd: number, mtdPrev: number, weeks: Record<string, number> }> = {};

            const shopLines = currentLines.filter(l => shopOrders.some(o => o.id === l.order_id[0]));
            shopLines.forEach(l => {
                const order = shopOrders.find(o => o.id === l.order_id[0]);
                const segment = productsInfo.find(p => p.id === l.product_id[0])?.x_studio_segment || "Autres";
                const wNum = `W${getWeek(new Date(order.date_order), { weekStartsOn: 1 })}`;

                if (!segmentData[segment]) segmentData[segment] = { mtd: 0, mtdPrev: 0, weeks: {} };
                
                segmentData[segment].mtd += l.price_subtotal_incl;
                segmentData[segment].weeks[wNum] = (segmentData[segment].weeks[wNum] || 0) + l.price_subtotal_incl;
            });

            const shopLinesPrev = previousLines.filter(l => shopOrdersPrev.some(o => o.id === l.order_id[0]));
            shopLinesPrev.forEach(l => {
                const segment = productsInfo.find(p => p.id === l.product_id[0])?.x_studio_segment || "Autres";
                if (!segmentData[segment]) segmentData[segment] = { mtd: 0, mtdPrev: 0, weeks: {} };
                segmentData[segment].mtdPrev += l.price_subtotal_incl;
            });

            // --- SUBROWS AVEC FORECAST PAR SEGMENT ---
            const subRows = Object.entries(segmentData).map(([name, vals]) => ({
                boutique: name,
                mtd: Math.round(vals.mtd),
                mtdPrev: Math.round(vals.mtdPrev),
                deltaMoM: vals.mtdPrev > 0 ? Math.round(((vals.mtd - vals.mtdPrev) / vals.mtdPrev) * 100) : 0,
                forecast: Math.round((vals.mtd / daysPassed) * totalDaysInMonth),
                weeks: vals.weeks, // 🚀 On passe les semaines au segment
                isSubRow: true
            })).sort((a, b) => b.mtd - a.mtd);

            const today = shopOrders.filter(o => o.date_order.includes(todayStr)).reduce((a, b) => a + b.amount_total, 0);
            const yesterday = shopOrders.filter(o => o.date_order.includes(yesterdayStr)).reduce((a, b) => a + b.amount_total, 0);
            const weekly = shopOrders.filter(o => o.date_order >= currentWeekStart).reduce((a, b) => a + b.amount_total, 0);

            const weeks: Record<string, number> = {};
            shopOrders.forEach(o => {
                const wNum = `W${getWeek(new Date(o.date_order), { weekStartsOn: 1 })}`;
                weeks[wNum] = (weeks[wNum] || 0) + o.amount_total;
            });

            const shopTarget = targets?.find(t => t.category_tag === shop.name)?.target_amount || 0;

            return {
                boutique: shop.name,
                today: Math.round(today),
                yesterday: Math.round(yesterday),
                weekly: Math.round(weekly),
                mtd: Math.round(mtd),
                mtdPrev: Math.round(mtdPrev),
                deltaMoM: mtdPrev > 0 ? Math.round(((mtd - mtdPrev) / mtdPrev) * 100) : 0,
                forecast: Math.round((mtd / daysPassed) * totalDaysInMonth),
                budgetMensuel: shopTarget,
                pctBudget: shopTarget > 0 ? Math.round((mtd / shopTarget) * 100) : 0,
                weeks,
                subRows
            };
        });
    } catch (error) {
        console.error(error);
        return [];
    }
}