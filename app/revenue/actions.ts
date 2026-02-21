'use server'

import { odooClient } from "@/lib/odoo/xmlrpc";
import { createClient } from "@/lib/supabase/server";
import { 
  startOfMonth, endOfMonth, subMonths, format, 
  startOfWeek, subDays, endOfDay, startOfDay 
} from "date-fns";
import { fr } from "date-fns/locale";

const getOdooPattern = (date: Date) => {
    return format(date, 'd MMM', { locale: fr }).toLowerCase().replace('.', '');
};

export async function getRevenueDashboardData(month: string, year: string) {
    const supabase = await createClient();
    const now = new Date();
    
    // Dates de référence
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const mtdStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00');
    const mtdEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');
    
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
    const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd 00:00:00');

    try {
        // 1. Récupérer les boutiques et les budgets (Supabase)
        const [{ data: dbShops }, { data: targets }] = await Promise.all([
            supabase.from('shops').select('*').order('name'),
            supabase.from('sales_targets').select('*').eq('year', parseInt(year)).eq('month', parseInt(month))
        ]);

        if (!dbShops) return [];
        const allPosIds = dbShops.flatMap(s => s.odoo_pos_ids || []);

        // 2. REQUÊTES ODOO (Groupées pour la performance)
        const [mtdSales, prevMtdSales, weeklySales, dailyRaw] = await Promise.all([
            // MTD Actuel
            odooClient.execute("pos.order", "read_group", [
                [["config_id", "in", allPosIds], ["date_order", ">=", mtdStart], ["date_order", "<=", mtdEnd], ["state", "in", ["paid", "done", "invoiced"]]],
                ["amount_total", "config_id"], ["config_id"]
            ]),
            // MTD-1 (Mois précédent)
            odooClient.execute("pos.order", "read_group", [
                [["config_id", "in", allPosIds], ["date_order", ">=", format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 00:00:00')], ["date_order", "<=", format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 23:59:59')], ["state", "in", ["paid", "done", "invoiced"]]],
                ["amount_total", "config_id"], ["config_id"]
            ]),
            // Hebdomadaire (avec lazy: false)
            odooClient.execute("pos.order", "read_group", [
                [["config_id", "in", allPosIds], ["date_order", ">=", mtdStart], ["date_order", "<=", mtdEnd], ["state", "in", ["paid", "done", "invoiced"]]],
                ["amount_total", "date_order"], ["config_id", "date_order:week"]
            ], { lazy: false }),
            // Ventes par jour (Pour Today, Yesterday et Current Week)
            odooClient.execute("pos.order", "read_group", [
                [["config_id", "in", allPosIds], ["date_order", ">=", currentWeekStart], ["state", "in", ["paid", "done", "invoiced"]]],
                ["amount_total", "date_order"], ["config_id", "date_order:day"]
            ], { lazy: false })
        ]) as any[][];

        // 3. TRAITEMENT ET AGREGATION
        const daysPassed = month === format(now, 'MM') ? now.getDate() : endOfMonth(selectedDate).getDate();
        const totalDays = endOfMonth(selectedDate).getDate();

        return dbShops.map(shop => {
            const posIds = shop.odoo_pos_ids || [];

            // Helper pour sommer les montants d'une liste Odoo selon les POS IDs de la boutique
            const sumForShop = (list: any[]) => list.filter(item => posIds.includes(item.config_id[0])).reduce((acc, curr) => acc + curr.amount_total, 0);
            
            const mtd = sumForShop(mtdSales);
            const mtdPrev = sumForShop(prevMtdSales);
            
            // Calcul Today / Yesterday / Weekly
            const today = dailyRaw.filter(d => posIds.includes(d.config_id[0]) && d['date_order:day'].includes(getOdooPattern(now))).reduce((acc, curr) => acc + curr.amount_total, 0);
            const yesterday = dailyRaw.filter(d => posIds.includes(d.config_id[0]) && d['date_order:day'].includes(getOdooPattern(subDays(now, 1)))).reduce((acc, curr) => acc + curr.amount_total, 0);
            const weekly = sumForShop(dailyRaw);

            // Semaines pour le tableau
            const weeks: Record<string, number> = {};
            weeklySales.filter(w => posIds.includes(w.config_id[0])).forEach(w => {
                const weekNum = w['date_order:week'].split(' ')[0];
                weeks[weekNum] = (weeks[weekNum] || 0) + w.amount_total;
            });

            // Budget Supabase
            const shopTarget = targets?.find(t => t.category_tag === shop.name)?.target_amount || 0;

            return {
                boutique: shop.name,
                today: Math.round(today),
                yesterday: Math.round(yesterday),
                weekly: Math.round(weekly),
                mtd: Math.round(mtd),
                mtdPrev: Math.round(mtdPrev),
                deltaMoM: mtdPrev > 0 ? Math.round(((mtd - mtdPrev) / mtdPrev) * 100) : 0,
                forecast: Math.round((mtd / daysPassed) * totalDays),
                budgetMensuel: shopTarget,
                pctBudget: shopTarget > 0 ? Math.round((mtd / shopTarget) * 100) : 0,
                weeks
            };
        });

    } catch (error) {
        console.error("Erreur Dashboard:", error);
        return [];
    }
}