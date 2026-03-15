// app/finance/revenue/actions.ts
'use server'

import { odooClient, OdooDomainCondition } from "@/lib/odoo/xmlrpc";
import {odooClient as odooJsonClient} from "@/lib/odoo/odoo-json2-client"
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format, getWeek, subDays, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { POSOrder, POSOrderLine } from "../types/pos";

function getMonthKey(odooMonthStr: string): string {
  const months: Record<string, string> = {
    'janv': '01', 'févr': '02', 'mars': '03', 'avr': '04', 'mai': '05', 'juin': '06',
    'juil': '07', 'août': '08', 'sept': '09', 'oct': '10', 'nov': '11', 'déc': '12'
  };
  const parts = odooMonthStr.toLowerCase().split(' '); // ["févr.", "2026"]
  const monthPart = parts[0].replace('.', '');
  const year = parts[1];
  return `${year}-${months[monthPart] || '01'}`;
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

function ensureTrackerEntry(tracker: Map<string, any>, hsCode: string, name = "Produit inconnu") {
    if (!tracker.has(hsCode)) {
        tracker.set(hsCode, {
            hs_code: hsCode,
            name,
            monthlySales: {},
            monthlyStockOpening: {},
            currentStock: 0
        });
    } else {
        const entry = tracker.get(hsCode);

        if (!entry.monthlySales) entry.monthlySales = {};
        if (!entry.monthlyStockOpening) entry.monthlyStockOpening = {};
        if (!entry.currentStock) entry.currentStock = 0;
    }

    return tracker.get(hsCode);
}

export async function getRevenueDashboardData(month: string, year: string) {
    const supabase = await createClient();
    const now = new Date();
    
    // --- DÉFINITION DES PÉRIODES ---
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    const mtdStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00');
    const mtdEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');
    const prevMtdStart = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 00:00:00');
    const prevMtdEnd = format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 23:59:59');

    // Dates pour KPIs temps réel (Indépendantes du mois sélectionné pour les cartes du haut)
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
    const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd 00:00:00');

    // Logique temporelle pour Forecast
    const isCurrentMonth = month === format(now, 'MM') && year === format(now, 'yyyy');
    const totalDaysInMonth = endOfMonth(selectedDate).getDate();
    const daysPassed = isCurrentMonth ? now.getDate() : totalDaysInMonth;

    try {
        const [{ data: dbShops }, { data: targets }] = await Promise.all([
            supabase.from('shops').select('*').order('name'),
            supabase.from('sales_targets').select('*').eq('year', parseInt(year)).eq('month', parseInt(month))
        ]);

        if (!dbShops) return { shopPerformance: [], segmentPerformance: [] };

        // 1. FETCH DATA ODOO (Ajout d'une requête pour le temps réel global)
        // Commandes du mois sélectionné
        const currentOrders = await odooJsonClient.searchRead<POSOrder>("pos.order", {
            domain: [["date_order", ">=", mtdStart], ["date_order", "<=", mtdEnd], ["state", "in", ["paid", "done"]]],
            fields: ["config_id", "amount_total", "date_order"]
        })

        // Commandes M-1
        const previousOrders = await odooJsonClient.searchRead<POSOrder>("pos.order", {
            domain: [["date_order", ">=", prevMtdStart], ["date_order", "<=", prevMtdEnd], ["state", "in", ["paid", "done"]]],
            fields: ["config_id", "amount_total"]
        })

        // Commandes pour Today, Yesterday et Week (fenêtre glissante)
        const recentOrders = await odooJsonClient.searchRead<POSOrder>("pos.order", {
            domain: [["date_order", ">=", currentWeekStart < yesterdayStr ? currentWeekStart : yesterdayStr], ["state", "in", ["paid", "done"]]],
            fields: ["config_id", "amount_total", "date_order"]
        })

        // 2. RÉCUPÉRER LES LIGNES POUR LES SEGMENTS
        const currentLines = await odooJsonClient.searchRead<POSOrderLine>("pos.order.line", {
            domain: [["order_id", "in", currentOrders.map(o => o.id)]],
            fields: ["order_id", "price_subtotal_incl", "product_id"]
        })
        const previousLines = await odooJsonClient.searchRead<POSOrderLine>("pos.order.line", {
            domain: [["order_id", "in", previousOrders.map(o => o.id)]],
            fields: ["order_id", "price_subtotal_incl", "product_id"]
        });

        // Map orderId -> order
        const currentOrderMap = new Map(currentOrders.map(o => [o.id, o]));
        const previousOrderMap = new Map(previousOrders.map(o => [o.id, o]));
        const recentOrderMap = new Map(recentOrders.map(o => [o.id, o]));
        
        const allProdIds = [...new Set([...currentLines, ...previousLines].map(l => l.product_id[0]))];
        const productsInfo = await odooClient.searchRead("product.product", {
            domain: [["id", "in", allProdIds]],
            fields: ["x_studio_segment", "pos_categ_ids"]
        }) as any[];
        
        
        // --- A. LOGIQUE PAR BOUTIQUE ---
        const shopPerformance = dbShops.map(shop => {
            const posIds = shop.odoo_pos_ids || [];

            let mtd = 0;
            let mtdPrev = 0;
            let today = 0;
            let yesterday = 0;
            let weekly = 0;
            const weeks: Record<string, number> = {};

            // --- MTD + Weeks ---
            currentLines.forEach(line => {
                const order = currentOrderMap.get(line.order_id[0]);
                if (!order) return;
                if (!posIds.includes(order.config_id?.[0])) return;

                mtd += line.price_subtotal_incl;

                const wNum = `W${getWeek(new Date(order.date_order), { weekStartsOn: 1 })}`;
                weeks[wNum] = (weeks[wNum] || 0) + line.price_subtotal_incl;
            });

            // --- MTD PREV ---
            previousLines.forEach(line => {
                const order = previousOrderMap.get(line.order_id[0]);
                if (!order) return;
                if (!posIds.includes(order.config_id?.[0])) return;

                mtdPrev += line.price_subtotal_incl;
            });

            // --- TODAY / YESTERDAY / WEEKLY ---
            currentLines.forEach(line => {
                const order = recentOrderMap.get(line.order_id[0]);
                if (!order) return;
                if (!posIds.includes(order.config_id?.[0])) return;

                if (order.date_order.includes(todayStr)) {
                    today += line.price_subtotal_incl;
                }

                if (order.date_order.includes(yesterdayStr)) {
                    yesterday += line.price_subtotal_incl;
                }

                if (order.date_order >= currentWeekStart) {
                    weekly += line.price_subtotal_incl;
                }
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
            };
        });

        // --- B. LOGIQUE PAR SEGMENT -> CATEGORIE ---
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
            boutique: segName,
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
        console.error("Erreur Dashboard Revenue:", e);
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

export async function getBeautySixMonthSales(month: string, year: string, filters: { q?: string, color?: string, category?: string, partner?: string }) {
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    // 1. Générer les 6 derniers mois pour les filtres et les colonnes
    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    let salesDomain = [
        ["product_id.x_studio_segment", "=", "Beauty"],
        ["order_id.state", "in", ["paid", "done", "invoiced"]],
        ["create_date", ">=", startDate],
        ["create_date", "<=", endDate]
    ]
    let productsDomain: OdooDomainCondition[] = [["x_studio_segment", "=", "Beauty"]];
    let stockDomain: OdooDomainCondition[] = [["product_id.x_studio_segment", "=", "Beauty"], ["location_id.usage", "=", "internal"]];

    if (filters.q) {
        salesDomain.push(["product_id.name", "ilike", filters.q]);
        productsDomain.push(["name", "ilike", filters.q]);
    }

    try {
        let allProducts: any[] = [];
        let offset = 0;
        let productIds: number[] = [];
        while (true) {
            const chunk = await odooClient.searchRead("product.product", {
                domain: productsDomain,
                fields: ["hs_code", "name", "x_studio_many2one_field_Arl5D"],
                limit: 20000, offset
            }) as any[];
            allProducts = [...allProducts, ...chunk];
            const ids = chunk.map(p => p.id);
            productIds.push(...ids);
            if (chunk.length < 20000) break;
            offset += 20000;
        }

        const productMap = new Map();
        const idToHs = new Map<number, string>();

        allProducts.forEach(p => {
            const hs = p.hs_code || "SANS-HS";
            idToHs.set(p.id, hs);
            if (!productMap.has(hs)) {
                const color = (Array.isArray(p.x_studio_many2one_field_Arl5D) ? p.x_studio_many2one_field_Arl5D[1] : (p.x_studio_many2one_field_Arl5D || "")).replace(/\s+/g, '_');
                productMap.set(hs, {
                    hs_code: hs, name: p.name.split('[')[0].trim(), color,
                    currentStock: 0, monthlyData: {}
                });

                // Initialiser les 6 mois à zéro
                monthRange.forEach(m => {
                    productMap.get(hs).monthlyData[format(m, 'yyyy-MM')] = { sales: 0, openingStock: 0 };
                })
            }
        });
        
        // 2. Récupérer les ventes groupées par Produit ET par Mois
        const salesRaw = await odooClient.execute("pos.order.line", "read_group", [
            salesDomain,
            ["price_subtotal_incl", "product_id"],
            ["product_id", "create_date:month"], // Double groupement
        ], { lazy: false }) as any[];

        let allStockResults: any[] = [];
        const productChunks = chunkArray(productIds, 1000);

        for (const idsChunk of productChunks) {
            const stockRaw = await odooClient.execute("stock.quant", "read_group", [
                [
                    ...stockDomain,
                    ["product_id", "in", idsChunk]
                ],
                ["quantity"],
                ["product_id"]
            ]) as any[];

            allStockResults.push(...stockRaw);
        }

        let allStockMoves: any[] = [];
        for (const idsChunk of productChunks) {
            const stockMoves = await odooClient.execute("stock.move", "read_group", [
                [
                    ["product_id", "in", idsChunk],
                    ["state", "=", "done"],
                    ["picking_code", "in", ["outgoing", "incoming"]],
                ],
                ["product_uom_qty"],
                ["product_id", "date:month", "picking_code",]
            ], { lazy: false }) as any[];

            allStockMoves.push(...stockMoves);
        }

        // 4. Consolidation par HS_CODE
        const tracker = new Map<string, any>();

        salesRaw.forEach(sale => {
            const pInfo = allProducts.find(p => p.id === sale.product_id[0]);
            if (!pInfo) return;

            const hsCode = pInfo.hs_code || "SANS-HS";
            const cleanName = pInfo.name.split('[')[0].trim();
            
            // Transformer "Février 2026" d'Odoo en "2026-02" pour matcher nos monthKeys
            // Note: Odoo renvoie le libellé localisé, on extrait souvent via une logique simple
            // Pour plus de sécurité, on peut aussi parser ou utiliser un autre champ
            const odooMonth = sale['create_date:month']; // ex: "février 2026"

            const entry = ensureTrackerEntry(tracker, hsCode, cleanName);
            // On cherche quel mois correspond dans notre range
            const monthMatch = monthRange.find(m => 
                odooMonth.toLowerCase().includes(format(m, 'MMMM', { locale: fr }).toLowerCase())
            );

            if (monthMatch) {
                const key = format(monthMatch, 'yyyy-MM');
                entry.monthlySales[key] = (entry.monthlySales[key] || 0) + sale.price_subtotal_incl;
            }
        });

        allStockResults.forEach(stock => {
            const hsCode = idToHs.get(stock.product_id[0]) || "SANS-HS";
            const entry = ensureTrackerEntry(tracker, hsCode);
            entry.currentStock = Math.round(stock.quantity);
        });

        allStockMoves.forEach(move => {
            const productId = move.product_id?.[0];
            if (!productId) return;

            const hsCode = idToHs.get(productId) || "SANS-HS";

            const entry = ensureTrackerEntry(tracker, hsCode);

            const odooMonth = move['date:month'];
            
            if (!odooMonth) return;

            const key = format(odooMonth, 'yyyy-MM');

            if (!entry.monthlyStockOpening) {
                entry.monthlyStockOpening = {};
            }

            if (!entry.monthlyStockOpening[key]) {
                entry.monthlyStockOpening[key] = 0;
            }

            if (move.picking_code === 'outgoing') {
                entry.monthlyStockOpening[key] += move.product_uom_qty;
            } else if (move.picking_code === 'incoming') {
                entry.monthlyStockOpening[key] -= move.product_uom_qty;
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

export async function getFemmeSixMonthSales(month: string, year: string) {
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    try {
        // 1. Récupérer les ventes PoS
        const salesRaw = await odooClient.execute("pos.order.line", "read_group", [
            [
                ["product_id.x_studio_segment", "=", "Femme"],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", startDate],
                ["create_date", "<=", endDate]
            ],
            ["price_subtotal_incl", "product_id"],
            ["product_id", "create_date:month"],
        ], { lazy: false }) as any[];

        // 2. Récupérer les détails techniques des produits
        const productIds = [...new Set(salesRaw.map(s => s.product_id[0]))];
        const productsInfo = await odooClient.searchRead("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["name", "hs_code", "x_studio_many2one_field_Arl5D"] 
        }) as any[];

        // 3. NOUVEAU : Récupérer le stock actuel (stock.quant)
        // On récupère le stock de tous les produits trouvés dans les ventes
        const stockRaw = await odooClient.execute("stock.quant", "read_group", [
            [
                ["product_id", "in", productIds],
                ["location_id.usage", "=", "internal"]
            ],
            ["quantity", "product_id"],
            ["product_id"]
        ]) as any[];

        const tracker = new Map<string, any>();

        salesRaw.forEach(sale => {
            const pInfo = productsInfo.find(p => p.id === sale.product_id[0]);
            if (!pInfo) return;

            const hsCode = pInfo.hs_code || "SANS-HS";
            const cleanName = pInfo.name.split('[')[0].trim();
            const rawColor = pInfo.x_studio_many2one_field_Arl5D;
            const colorName = Array.isArray(rawColor) ? rawColor[1] : (rawColor || "");

            const odooMonth = sale['create_date:month'];

            if (!tracker.has(hsCode)) {
                // On récupère le stock pour tous les produits ayant ce HS Code
                // On filtre productsInfo pour avoir tous les IDs Odoo liés à ce HS Code
                const idsForThisHS = productsInfo.filter(p => p.hs_code === hsCode).map(p => p.id);
                const currentStock = stockRaw
                    .filter(s => idsForThisHS.includes(s.product_id[0]))
                    .reduce((acc, curr) => acc + curr.quantity, 0);

                tracker.set(hsCode, {
                    hs_code: hsCode,
                    name: cleanName,
                    color: colorName.replace(/\s+/g, '_'),
                    currentStock: Math.round(currentStock),
                    monthlySales: {}
                });
            }

            const entry = tracker.get(hsCode);
            const monthMatch = monthRange.find(m => 
                odooMonth.toLowerCase().includes(format(m, 'MMMM', { locale: fr }).toLowerCase())
            );

            if (monthMatch) {
                const key = format(monthMatch, 'yyyy-MM');
                entry.monthlySales[key] = (entry.monthlySales[key] || 0) + sale.price_subtotal_incl;
            }
        });

        return {
            products: Array.from(tracker.values()),
            columns: monthRange.map(d => ({
                key: format(d, 'yyyy-MM'),
                label: format(d, 'MMM yy', { locale: fr }).toUpperCase()
            }))
        };

    } catch (error) {
        console.error(error);
        return { products: [], columns: [] };
    }
}

// export async function getFemmeSixMonthSales(month: string, year: string) {
//     const selectedDate = new Date(parseInt(year), parseInt(month) - 1, 1);
//     const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
//     const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
//     const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

//     try {
//         // 1. CHARGER LE MAPPING (70k produits) - Uniquement ce qui est nécessaire
//         let allProducts: any[] = [];
//         let offset = 0;
        // while (true) {
        //     const chunk = await odooClient.searchRead("product.product", {
        //         domain: [["x_studio_segment", "=", "Femme"]],
        //         fields: ["hs_code", "name", "x_studio_many2one_field_Arl5D"],
        //         limit: 20000, offset
        //     }) as any[];
        //     allProducts = [...allProducts, ...chunk];
        //     if (chunk.length < 20000) break;
        //     offset += 20000;
        // }

//         const productMap = new Map();
//         const idToHs = new Map<number, string>();
        
        // allProducts.forEach(p => {
        //     const hs = p.hs_code || "SANS-HS";
        //     idToHs.set(p.id, hs);
        //     if (!productMap.has(hs)) {
        //         const color = (Array.isArray(p.x_studio_many2one_field_Arl5D) ? p.x_studio_many2one_field_Arl5D[1] : (p.x_studio_many2one_field_Arl5D || "")).replace(/\s+/g, '_').toLowerCase();
        //         productMap.set(hs, {
        //             hs_code: hs, name: p.name.split('[')[0].trim(), color,
        //             currentStock: 0, monthlyData: {}
        //         });
        //         // Initialiser les 6 mois à zéro
        //         monthRange.forEach(m => {
        //             productMap.get(hs).monthlyData[format(m, 'yyyy-MM')] = { sales: 0, openingStock: 0 };
        //         });
        //     }
        // });

//         // 2. RÉCUPÉRATION DATA EN PARALLÈLE
//         const [salesRaw, stockRaw, movesRaw] = await Promise.all([
//             odooClient.execute("pos.order.line", "read_group", [
//                 [["product_id.x_studio_segment", "=", "Femme"], ["order_id.state", "in", ["paid", "done"]], ["create_date", ">=", startDate], ["create_date", "<=", endDate]],
//                 ["price_subtotal_incl"], ["product_id", "create_date:month"]
//             ], { lazy: false }),
//             odooClient.execute("stock.quant", "read_group", [
//                 [["product_id.x_studio_segment", "=", "Femme"], ["location_id.usage", "=", "internal"]],
//                 ["quantity"], ["product_id"]
//             ]),
            // odooClient.execute("stock.move", "read_group", [
            //     [["product_id.x_studio_segment", "=", "Femme"], ["state", "=", "done"], ["date", ">=", startDate], ["date", "<=", endDate]],
            //     ["product_uom_qty"], ["product_id", "date:month", "location_dest_id", "location_id"]
            // ], { lazy: false })
//         ]) as any[][];

//         // 3. REMPLISSAGE DES VENTES
//         salesRaw.forEach(s => {
//             const hs = idToHs.get(s.product_id[0]);
//             if (hs && s['create_date:month']) {
//                 const key = getMonthKey(s['create_date:month']);
//                 if (productMap.get(hs).monthlyData[key]) {
//                     productMap.get(hs).monthlyData[key].sales += s.price_subtotal_incl;
//                 }
//             }
//         });

//         // 4. RÉCUPÉRATION STOCK ACTUEL (POINT DE DÉPART)
//         const currentRealStock = new Map<string, number>();
//         stockRaw.forEach(s => {
//             const hs = idToHs.get(s.product_id[0]);
//             if (hs) {
//                 currentRealStock.set(hs, (currentRealStock.get(hs) || 0) + s.quantity);
//                 productMap.get(hs).currentStock += Math.round(s.quantity);
//             }
//         });

//         // 5. CALCUL DU STOCK RÉTROACTIF
//         const hsVariations = new Map<string, Record<string, number>>();
//         movesRaw.forEach(m => {
//             const hs = idToHs.get(m.product_id[0]);
//             if (!hs || !m['date:month']) return;
//             const key = getMonthKey(m['date:month']);
            
//             const isIncoming = m.location_dest_id[1].toLowerCase().includes('internal');
//             const isOutgoing = m.location_id[1].toLowerCase().includes('internal');
//             const diff = (isIncoming ? m.product_uom_qty : 0) - (isOutgoing ? m.product_uom_qty : 0);

//             if (!hsVariations.has(hs)) hsVariations.set(hs, {});
//             hsVariations.get(hs)![key] = (hsVariations.get(hs)![key] || 0) + diff;
//         });

//         // On remonte le temps mois par mois
//         productMap.forEach((entry, hs) => {
//             let stockAtEndOfMonth = currentRealStock.get(hs) || 0;
            
//             // On parcourt les mois du plus récent au plus ancien
//             [...monthRange].reverse().forEach(m => {
//                 const key = format(m, 'yyyy-MM');
//                 const variationDuMois = hsVariations.get(hs)?.[key] || 0;
                
//                 // Formule : Stock Début = Stock Fin - Variation
//                 const opening = stockAtEndOfMonth - variationDuMois;
//                 entry.monthlyData[key].openingStock = Math.max(0, Math.round(opening));
                
//                 // Pour le mois précédent, le stock de fin sera l'opening de ce mois
//                 stockAtEndOfMonth = opening;
//             });
//         });

//         return {
//             products: Array.from(productMap.values()).sort((a, b) => b.currentStock - a.currentStock),
//             columns: monthRange.map(d => ({ key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy', { locale: fr }).toUpperCase() }))
//         };

//     } catch (error) {
//         console.error("Crash Error:", error);
//         return { products: [], columns: [] };
//     }
// }