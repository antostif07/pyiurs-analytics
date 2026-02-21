// app/finance/revenue/actions.ts
'use server'

import { odooClient } from "@/lib/odoo/xmlrpc";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format, getWeek } from "date-fns";
import { fr } from "date-fns/locale";

export async function getRevenueDashboardData(month: string, year: string) {
    const supabase = await createClient();
    const now = new Date();
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    const mtdStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00');
    const mtdEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');
    const prevMtdStart = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 00:00:00');
    const prevMtdEnd = format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 23:59:59');

    const isCurrentMonth = month === format(now, 'MM') && year === format(now, 'yyyy');
    const daysPassed = isCurrentMonth ? now.getDate() : endOfMonth(selectedDate).getDate();
    const totalDaysInMonth = endOfMonth(selectedDate).getDate();

    try {
        const [{ data: dbShops }, { data: targets }] = await Promise.all([
            supabase.from('shops').select('*').order('name'),
            supabase.from('sales_targets').select('*').eq('year', parseInt(year)).eq('month', parseInt(month))
        ]);

        if (!dbShops) return { shopPerformance: [], segmentPerformance: [] };
        const allPosIds = dbShops.flatMap(s => s.odoo_pos_ids || []);

        // 1. FETCH DATA ODOO
        const [currentOrders, previousOrders, currentLines, previousLines] = await Promise.all([
            odooClient.searchRead("pos.order", {
                domain: [["config_id", "in", allPosIds], ["date_order", ">=", mtdStart], ["date_order", "<=", mtdEnd], ["state", "in", ["paid", "done", "invoiced"]]],
                fields: ["config_id", "amount_total", "date_order"]
            }),
            odooClient.searchRead("pos.order", {
                domain: [["config_id", "in", allPosIds], ["date_order", ">=", prevMtdStart], ["date_order", "<=", prevMtdEnd], ["state", "in", ["paid", "done", "invoiced"]]],
                fields: ["config_id", "amount_total"]
            }),
            odooClient.searchRead("pos.order.line", {
                domain: [["order_id.config_id", "in", allPosIds], ["order_id.date_order", ">=", mtdStart], ["order_id.date_order", "<=", mtdEnd]],
                fields: ["order_id", "price_subtotal_incl", "product_id"]
            }),
            odooClient.searchRead("pos.order.line", {
                domain: [["order_id.config_id", "in", allPosIds], ["order_id.date_order", ">=", prevMtdStart], ["order_id.date_order", "<=", prevMtdEnd]],
                fields: ["order_id", "price_subtotal_incl", "product_id"]
            })
        ]) as any[][];

        const allProdIds = [...new Set([...currentLines, ...previousLines].map(l => l.product_id[0]))];
        const productsInfo = await odooClient.searchRead("product.product", {
            domain: [["id", "in", allProdIds]],
            fields: ["x_studio_segment", "pos_categ_ids"]
        }) as any[];

        // --- A. LOGIQUE PAR BOUTIQUE (EXISTANTE) ---
        const shopPerformance = dbShops.map(shop => {
            const posIds = shop.odoo_pos_ids || [];
            const sOrders = currentOrders.filter(o => posIds.includes(o.config_id[0]));
            const sOrdersPrev = previousOrders.filter(o => posIds.includes(o.config_id[0]));
            const mtd = sOrders.reduce((a, b) => a + b.amount_total, 0);
            const mtdPrev = sOrdersPrev.reduce((a, b) => a + b.amount_total, 0);
            const weeks: any = {};
            sOrders.forEach(o => {
                const wNum = `W${getWeek(new Date(o.date_order), { weekStartsOn: 1 })}`;
                weeks[wNum] = (weeks[wNum] || 0) + o.amount_total;
            });
            const shopTarget = targets?.find(t => t.category_tag === shop.name)?.target_amount || 10000;

            return {
                boutique: shop.name,
                mtd, mtdPrev,
                deltaMoM: mtdPrev > 0 ? Math.round(((mtd - mtdPrev) / mtdPrev) * 100) : 0,
                forecast: Math.round((mtd / daysPassed) * totalDaysInMonth),
                budgetMensuel: shopTarget,
                pctBudget: Math.round((mtd / shopTarget) * 100),
                weeks,
                today: 0, yesterday: 0, weekly: 0 // Simplifié pour l'exemple
            };
        });

        // --- B. LOGIQUE PAR SEGMENT -> CATEGORIE (NOUVELLE) ---
        const segmentHierarchy: any = {};

        const aggregate = (lines: any[], orders: any[], field: 'mtd' | 'mtdPrev') => {
            lines.forEach(l => {
                const order = orders.find(o => o.id === l.order_id[0]);
                if (!order) return;

                const prod = productsInfo.find(p => p.id === l.product_id[0]);
                const segment = prod?.x_studio_segment || "Autres";
                const category = prod?.pos_categ_id?.[1] || "Général";
                const wNum = `W${getWeek(new Date(order.date_order || now), { weekStartsOn: 1 })}`;

                if (!segmentHierarchy[segment]) segmentHierarchy[segment] = { mtd: 0, mtdPrev: 0, weeks: {}, subRows: {} };
                if (!segmentHierarchy[segment].subRows[category]) segmentHierarchy[segment].subRows[category] = { mtd: 0, mtdPrev: 0, weeks: {} };

                segmentHierarchy[segment][field] += l.price_subtotal_incl;
                segmentHierarchy[segment].subRows[category][field] += l.price_subtotal_incl;

                if (field === 'mtd') {
                    segmentHierarchy[segment].weeks[wNum] = (segmentHierarchy[segment].weeks[wNum] || 0) + l.price_subtotal_incl;
                    segmentHierarchy[segment].subRows[category].weeks[wNum] = (segmentHierarchy[segment].subRows[category].weeks[wNum] || 0) + l.price_subtotal_incl;
                }
            });
        };

        aggregate(currentLines, currentOrders, 'mtd');
        aggregate(previousLines, previousOrders, 'mtdPrev');

        const segmentPerformance = Object.entries(segmentHierarchy).map(([segName, segData]: [string, any]) => ({
            boutique: segName, // On garde la clé 'boutique' pour réutiliser les composants
            mtd: Math.round(segData.mtd),
            mtdPrev: Math.round(segData.mtdPrev),
            deltaMoM: segData.mtdPrev > 0 ? Math.round(((segData.mtd - segData.mtdPrev) / segData.mtdPrev) * 100) : 0,
            forecast: Math.round((segData.mtd / daysPassed) * totalDaysInMonth),
            weeks: segData.weeks,
            subRows: Object.entries(segData.subRows).map(([catName, catData]: [string, any]) => ({
                boutique: catName,
                mtd: Math.round(catData.mtd),
                mtdPrev: Math.round(catData.mtdPrev),
                deltaMoM: catData.mtdPrev > 0 ? Math.round(((catData.mtd - catData.mtdPrev) / catData.mtdPrev) * 100) : 0,
                forecast: Math.round((catData.mtd / daysPassed) * totalDaysInMonth),
                weeks: catData.weeks,
            })).sort((a, b) => b.mtd - a.mtd)
        })).sort((a, b) => b.mtd - a.mtd);

        return { shopPerformance, segmentPerformance };

    } catch (e) {
        console.error(e);
        return { shopPerformance: [], segmentPerformance: [] };
    }
}

export async function getBeautySalesByProduct(month: string, year: string) {
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    try {
        // 1. Récupérer les ventes PoS filtrées sur le segment Beauty
        // On utilise read_group pour que Odoo fasse le calcul de somme
        const salesRaw = await odooClient.execute("pos.order.line", "read_group", [
            [
                ["product_id.x_studio_segment", "=", "Beauty"],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", startDate],
                ["create_date", "<=", endDate]
            ],
            ["qty", "price_subtotal_incl"], // Champs à sommer
            ["product_id"]                  // On groupe par produit
        ]) as any[];

        if (!salesRaw) return [];

        // 2. Récupérer les HS Codes et Noms propres pour ces produits
        const productIds = salesRaw.map(s => s.product_id[0]);
        const productsInfo = await odooClient.searchRead("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["name", "hs_code"]
        }) as any[];

        // 3. Aggrégation finale par HS_CODE (pour fusionner les variantes)
        const consolidated = new Map<string, any>();

        salesRaw.forEach(sale => {
            const pInfo = productsInfo.find(p => p.id === sale.product_id[0]);
            if (!pInfo) return;

            const hsCode = pInfo.hs_code || "SANS-HS";
            const cleanName = pInfo.name.split('[')[0].trim();

            if (!consolidated.has(hsCode)) {
                consolidated.set(hsCode, {
                    hs_code: hsCode,
                    name: cleanName,
                    totalQty: 0,
                    totalRevenue: 0
                });
            }

            const entry = consolidated.get(hsCode);
            entry.totalQty += sale.qty;
            entry.totalRevenue += sale.price_subtotal_incl;
        });

        // Convertir en tableau et trier par plus grosses ventes
        return Array.from(consolidated.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    } catch (error) {
        console.error("Erreur récup ventes beauty:", error);
        return [];
    }
}

export async function getBeautySixMonthSales(month: string, year: string) {
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    // 1. Générer les 6 derniers mois pour les filtres et les colonnes
    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    // Clés pour le mapping (ex: "2026-02")
    const monthKeys = monthRange.map(d => format(d, 'yyyy-MM'));

    try {
        // 2. Récupérer les ventes groupées par Produit ET par Mois
        const salesRaw = await odooClient.execute("pos.order.line", "read_group", [
            [
                ["product_id.x_studio_segment", "=", "Beauty"],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", startDate],
                ["create_date", "<=", endDate]
            ],
            ["price_subtotal_incl", "product_id"],
            ["product_id", "create_date:month"], // Double groupement
        ], { lazy: false }) as any[];

        // 3. Récupérer les HS Codes des produits vendus
        const productIds = [...new Set(salesRaw.map(s => s.product_id[0]))];
        const productsInfo = await odooClient.searchRead("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["name", "hs_code"]
        }) as any[];

        // 4. Consolidation par HS_CODE
        const tracker = new Map<string, any>();

        salesRaw.forEach(sale => {
            const pInfo = productsInfo.find(p => p.id === sale.product_id[0]);
            if (!pInfo) return;

            const hsCode = pInfo.hs_code || "SANS-HS";
            const cleanName = pInfo.name.split('[')[0].trim();
            
            // Transformer "Février 2026" d'Odoo en "2026-02" pour matcher nos monthKeys
            // Note: Odoo renvoie le libellé localisé, on extrait souvent via une logique simple
            // Pour plus de sécurité, on peut aussi parser ou utiliser un autre champ
            const odooMonth = sale['create_date:month']; // ex: "février 2026"

            if (!tracker.has(hsCode)) {
                tracker.set(hsCode, {
                    hs_code: hsCode,
                    name: cleanName,
                    monthlySales: {} // contiendra { "2026-02": 1500, "2026-01": 1200 ... }
                });
            }

            const entry = tracker.get(hsCode);
            // On cherche quel mois correspond dans notre range
            const monthMatch = monthRange.find(m => 
                odooMonth.toLowerCase().includes(format(m, 'MMMM', { locale: fr }).toLowerCase())
            );

            if (monthMatch) {
                const key = format(monthMatch, 'yyyy-MM');
                entry.monthlySales[key] = (entry.monthlySales[key] || 0) + sale.price_subtotal_incl;
            }
        });

        return {
            clients: Array.from(tracker.values()),
            columns: monthRange.map(d => ({
                key: format(d, 'yyyy-MM'),
                label: format(d, 'MMM yy', { locale: fr }).toUpperCase()
            }))
        };

    } catch (error) {
        console.error(error);
        return { clients: [], columns: [] };
    }
}