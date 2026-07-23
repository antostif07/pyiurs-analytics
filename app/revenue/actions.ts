'use server';

import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, subMonths, format, getWeek, subDays, startOfWeek, getDaysInMonth } from "date-fns";
import { fr } from "date-fns/locale";

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

    const selectedMonthInt = parseInt(month, 10);
    const selectedYearInt = parseInt(year, 10);
    const selectedDate = new Date(selectedYearInt, selectedMonthInt - 1, 1);

    // Plages de dates MTD (Month-To-Date)
    const mtdStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00');
    const mtdEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    // Plages de dates M-1 (Mois précédent)
    const prevStart = format(startOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 00:00:00');
    const prevEnd = format(endOfMonth(subMonths(selectedDate, 1)), 'yyyy-MM-dd 23:59:59');

    // Dates pour la semaine courante, aujourd'hui et hier
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
    const currentWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd 00:00:00');

    // Calcul du nombre réel de jours dans le mois
    const totalDaysInMonth = getDaysInMonth(selectedDate);
    const isCurrentMonth = month === format(now, 'MM') && year === format(now, 'yyyy');
    const daysPassed = isCurrentMonth ? Math.max(now.getDate(), 1) : totalDaysInMonth;

    try {
        // 1. RÉCUPÉRATION SIMULTANÉE DES BOUTIQUES ET DES BUDGETS SUPABASE
        const [{ data: dbShops }, { data: dbBudgets }] = await Promise.all([
            supabase.from('shops').select('*').order('name'),
            supabase.from('revenue_budgets')
                .select('*')
                .eq('month', selectedMonthInt)
                .eq('year', selectedYearInt)
        ]);

        if (!dbShops || dbShops.length === 0) {
            return { shopPerformance: [], segmentPerformance: [] };
        }

        // 2. RÉCUPÉRATION DES COMMANDES POS POUR CONSTRUIRE LA MAP DE CAISSES (config_id)
        const [currentOrders, previousOrders, recentOrders] = await Promise.all([
            odooJsonClient.searchRead<any>("pos.order", {
                domain: [
                    ["state", "in", ["paid", "done", "invoiced"]],
                    ["date_order", ">=", mtdStart],
                    ["date_order", "<=", mtdEnd]
                ],
                fields: ["id", "config_id", "date_order"]
            }),
            odooJsonClient.searchRead<any>("pos.order", {
                domain: [
                    ["state", "in", ["paid", "done", "invoiced"]],
                    ["date_order", ">=", prevStart],
                    ["date_order", "<=", prevEnd]
                ],
                fields: ["id", "config_id", "date_order"]
            }),
            odooJsonClient.searchRead<any>("pos.order", {
                domain: [
                    ["state", "in", ["paid", "done", "invoiced"]],
                    ["date_order", ">=", currentWeekStart]
                ],
                fields: ["id", "config_id", "date_order"]
            })
        ]);

        // ✅ CORRECTION CLÉ : Map d'association orderId -> configId (Terminal POS)
        const orderToConfigMap = new Map<number, number>();
        [...currentOrders, ...previousOrders, ...recentOrders].forEach((order: any) => {
            if (order.config_id && Array.isArray(order.config_id)) {
                orderToConfigMap.set(order.id, order.config_id[0]);
            }
        });

        // 3. RÉCUPÉRATION DES LIGNES DE VENTES POS (Odoo JSON-2 API)
        const [currentLines, previousLines, recentLines, posCategories] = await Promise.all([
            odooJsonClient.searchRead<any>("pos.order.line", {
                domain: [
                    ["order_id.state", "in", ["paid", "done", "invoiced"]],
                    ["order_id.date_order", ">=", mtdStart],
                    ["order_id.date_order", "<=", mtdEnd]
                ],
                fields: ["order_id", "price_unit", "qty", "product_id", "discount", "create_date"]
            }),
            odooJsonClient.searchRead<any>("pos.order.line", {
                domain: [
                    ["order_id.state", "in", ["paid", "done", "invoiced"]],
                    ["order_id.date_order", ">=", prevStart],
                    ["order_id.date_order", "<=", prevEnd]
                ],
                fields: ["order_id", "price_unit", "qty", "product_id", "discount", "create_date"]
            }),
            odooJsonClient.searchRead<any>("pos.order.line", {
                domain: [
                    ["order_id.state", "in", ["paid", "done", "invoiced"]],
                    ["order_id.date_order", ">=", currentWeekStart]
                ],
                fields: ["order_id", "price_unit", "qty", "product_id", "discount", "create_date"]
            }),
            odooJsonClient.searchRead<{ id: number; name: string }>("pos.category", {
                domain: [],
                fields: ["id", "name"]
            })
        ]);

        // 4. RÉCUPÉRATION ET INDEXATION DES PRODUITS (SEGMENTS & CATÉGORIES)
        const allProdIds = [...new Set([...currentLines, ...previousLines].map((l: any) => l.product_id[0]))];

        const productsInfo = allProdIds.length > 0
            ? await odooJsonClient.searchRead<any>("product.product", {
                domain: [["id", "in", allProdIds]],
                fields: ["x_studio_segment", "pos_categ_ids"]
            })
            : [];

        const productsMap = new Map(productsInfo.map((p: any) => [p.id, p]));
        const categoriesMap = new Map(posCategories.map(c => [c.id, c.name]));

        // ==========================================
        // 🟢 5. STRUCTURATION PAR BOUTIQUE (SHOPS)
        // ==========================================
        const shopHierarchy: Record<string, any> = {};

        const initShop = (name: string) => {
            if (!shopHierarchy[name]) {
                shopHierarchy[name] = {
                    mtd: 0, mtdPrev: 0, today: 0, yesterday: 0, weekly: 0,
                    weeks: {}, subRows: {}
                };
            }
            return shopHierarchy[name];
        };

        const processLine = (line: any, type: 'mtd' | 'prev' | 'recent') => {
            const orderId = Array.isArray(line.order_id) ? line.order_id[0] : line.order_id;

            // ✅ Résolution exacte du terminal de caisse via orderToConfigMap
            const configId = orderToConfigMap.get(orderId);
            if (!configId) return;

            const shop = dbShops.find(s => s.odoo_pos_ids?.includes(configId));
            if (!shop) return;

            const prod = productsMap.get(line.product_id[0]);
            const segment = prod?.x_studio_segment || "Autres";
            const categoryId = prod?.pos_categ_ids?.[0];
            const categoryName = categoriesMap.get(categoryId) || "Général";
            const amount = line.discount === 100 ? 0 : line.price_unit * line.qty;

            const shopNode = initShop(shop.name);

            if (!shopNode.subRows[segment]) {
                shopNode.subRows[segment] = { mtd: 0, mtdPrev: 0, weeks: {}, subRows: {} };
            }
            const segNode = shopNode.subRows[segment];

            if (!segNode.subRows[categoryName]) {
                segNode.subRows[categoryName] = { mtd: 0, mtdPrev: 0, weeks: {} };
            }
            const catNode = segNode.subRows[categoryName];

            const lineDateStr = line.create_date;

            if (type === 'mtd') {
                shopNode.mtd += amount;
                segNode.mtd += amount;
                catNode.mtd += amount;

                const wNum = `W${getWeek(new Date(lineDateStr), { weekStartsOn: 1 })}`;
                shopNode.weeks[wNum] = (shopNode.weeks[wNum] || 0) + amount;
                segNode.weeks[wNum] = (segNode.weeks[wNum] || 0) + amount;
                catNode.weeks[wNum] = (catNode.weeks[wNum] || 0) + amount;
            }

            if (type === 'prev') {
                shopNode.mtdPrev += amount;
                segNode.mtdPrev += amount;
                catNode.mtdPrev += amount;
            }

            if (type === 'recent') {
                if (lineDateStr.includes(todayStr)) shopNode.today += amount;
                if (lineDateStr.includes(yesterdayStr)) shopNode.yesterday += amount;
                if (lineDateStr >= currentWeekStart) shopNode.weekly += amount;
            }
        };

        currentLines.forEach((l: any) => processLine(l, 'mtd'));
        previousLines.forEach((l: any) => processLine(l, 'prev'));
        recentLines.forEach((l: any) => processLine(l, 'recent'));

        // Résultat final pour les boutiques
        const shopPerformance = Object.entries(shopHierarchy).map(([name, d]: [string, any]) => {
            const dbShop = dbShops.find(s => s.name === name);

            // ✅ Somme de tous les budgets créés pour cette boutique spécifique
            const shopBudgets = dbBudgets?.filter(b => b.shop_id === dbShop?.id) || [];
            const totalShopBudget = shopBudgets.reduce((sum, b) => sum + Number(b.target_amount || 0), 0);

            return {
                boutique: name,
                today: Math.round(d.today),
                yesterday: Math.round(d.yesterday),
                weekly: Math.round(d.weekly),
                mtd: Math.round(d.mtd),
                mtdPrev: Math.round(d.mtdPrev),
                deltaMoM: d.mtdPrev > 0 ? Math.round(((d.mtd - d.mtdPrev) / d.mtdPrev) * 100) : 0,
                weeks: d.weeks,
                forecast: Math.round((d.mtd / daysPassed) * totalDaysInMonth),
                budgetMensuel: totalShopBudget, // ✅ Somme des segments de la boutique

                subRows: Object.entries(d.subRows).map(([segName, seg]: [string, any]) => {
                    // Budget exact de la boutique X pour le segment Y
                    const segBudgetObj = shopBudgets.find(b => b.segment === segName);
                    const segBudget = segBudgetObj ? Number(segBudgetObj.target_amount) : 0;

                    return {
                        boutique: segName,
                        mtd: Math.round(seg.mtd),
                        mtdPrev: Math.round(seg.mtdPrev),
                        deltaMoM: seg.mtdPrev > 0 ? Math.round(((seg.mtd - seg.mtdPrev) / seg.mtdPrev) * 100) : 0,
                        weeks: seg.weeks,
                        forecast: Math.round((seg.mtd / daysPassed) * totalDaysInMonth),
                        budgetMensuel: segBudget,

                        subRows: Object.entries(seg.subRows).map(([catName, cat]: [string, any]) => ({
                            boutique: catName,
                            mtd: Math.round(cat.mtd),
                            mtdPrev: Math.round(cat.mtdPrev),
                            deltaMoM: cat.mtdPrev > 0 ? Math.round(((cat.mtd - cat.mtdPrev) / cat.mtdPrev) * 100) : 0,
                            weeks: cat.weeks,
                            forecast: Math.round((cat.mtd / daysPassed) * totalDaysInMonth),
                            budgetMensuel: 0,
                        })),
                    };
                }),
            };
        });

        // ==========================================
        // 🔵 6. STRUCTURATION PAR SEGMENT (FEMME, ENFANT, BEAUTÉ)
        // ==========================================
        const segmentHierarchy: Record<string, any> = {};

        const initSegment = (name: string) => {
            if (!segmentHierarchy[name]) {
                segmentHierarchy[name] = { mtd: 0, mtdPrev: 0, weeks: {}, subRows: {} };
            }
            return segmentHierarchy[name];
        };

        const processSeg = (line: any, type: 'mtd' | 'prev') => {
            const prod = productsMap.get(line.product_id[0]);
            const segment = prod?.x_studio_segment || "Autres";
            const categoryId = prod?.pos_categ_ids?.[0];
            const categoryName = categoriesMap.get(categoryId) || "Général";
            const amount = line.discount === 100 ? 0 : line.price_unit * line.qty;

            const segNode = initSegment(segment);

            if (!segNode.subRows[categoryName]) {
                segNode.subRows[categoryName] = { mtd: 0, mtdPrev: 0, weeks: {} };
            }
            const catNode = segNode.subRows[categoryName];

            const lineDateStr = line.create_date;

            if (type === 'mtd') {
                segNode.mtd += amount;
                catNode.mtd += amount;

                const wNum = `W${getWeek(new Date(lineDateStr), { weekStartsOn: 1 })}`;
                segNode.weeks[wNum] = (segNode.weeks[wNum] || 0) + amount;
                catNode.weeks[wNum] = (catNode.weeks[wNum] || 0) + amount;
            }

            if (type === 'prev') {
                segNode.mtdPrev += amount;
                catNode.mtdPrev += amount;
            }
        };

        currentLines.forEach((l: any) => processSeg(l, 'mtd'));
        previousLines.forEach((l: any) => processSeg(l, 'prev'));

        const segmentPerformance = Object.entries(segmentHierarchy).map(([name, d]: [string, any]) => {
            // ✅ Somme des budgets pour ce segment sur TOUTES les boutiques physiques
            const segmentBudgets = dbBudgets?.filter(b => b.segment === name) || [];
            const totalSegmentBudget = segmentBudgets.reduce((sum, b) => sum + Number(b.target_amount || 0), 0);

            return {
                boutique: name,
                mtd: Math.round(d.mtd),
                mtdPrev: Math.round(d.mtdPrev),
                deltaMoM: d.mtdPrev > 0 ? Math.round(((d.mtd - d.mtdPrev) / d.mtdPrev) * 100) : 0,
                forecast: Math.round((d.mtd / daysPassed) * totalDaysInMonth),
                weeks: d.weeks,
                budgetMensuel: totalSegmentBudget, // ✅ Somme du segment sur le réseau

                subRows: Object.entries(d.subRows).map(([catName, cat]: [string, any]) => ({
                    boutique: catName,
                    mtd: Math.round(cat.mtd),
                    mtdPrev: Math.round(cat.mtdPrev),
                    deltaMoM: cat.mtdPrev > 0 ? Math.round(((cat.mtd - cat.mtdPrev) / cat.mtdPrev) * 100) : 0,
                    forecast: Math.round((cat.mtd / daysPassed) * totalDaysInMonth),
                    weeks: cat.weeks,
                    budgetMensuel: 0,
                }))
            };
        });

        return { shopPerformance, segmentPerformance };

    } catch (e) {
        console.error("[ACTIONS_ERROR] Erreur getRevenueDashboardData:", e);
        return { shopPerformance: [], segmentPerformance: [] };
    }
}

export async function getBeautySalesByProduct(month: string, year: string) {
    const selectedMonthInt = parseInt(month, 10);
    const selectedYearInt = parseInt(year, 10);
    const selectedDate = new Date(selectedYearInt, selectedMonthInt - 1, 1);

    const startDate = format(startOfMonth(selectedDate), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    try {
        const salesRaw = await odooJsonClient.readGroup<any>("pos.order.line", {
            domain: [
                ["product_id.x_studio_segment", "=", "Beauty"],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", startDate],
                ["create_date", "<=", endDate]
            ],
            fields: ["qty", "price_unit"],
            groupby: ["product_id"]
        });

        if (!salesRaw || salesRaw.length === 0) return [];

        const productIds = salesRaw.map(s => s.product_id[0]);
        const productsInfo = await odooJsonClient.searchRead<any>("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["name", "hs_code"]
        });

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
            entry.totalRevenue += sale.discount === 100 ? 0 : sale.price_unit * sale.qty;
        });

        return Array.from(consolidated.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    } catch (error) {
        console.error("[ACTIONS_ERROR] Erreur getBeautySalesByProduct:", error);
        return [];
    }
}

export async function getBeautySixMonthSales(
    month: string,
    year: string,
    filters: { q?: string; color?: string; category?: string; partner?: string }
) {
    const selectedMonthInt = parseInt(month, 10);
    const selectedYearInt = parseInt(year, 10);
    const selectedDate = new Date(selectedYearInt, selectedMonthInt - 1, 1);

    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    const salesDomain: any[] = [
        ["product_id.x_studio_segment", "=", "Beauty"],
        ["order_id.state", "in", ["paid", "done", "invoiced"]],
        ["create_date", ">=", startDate],
        ["create_date", "<=", endDate]
    ];
    const productsDomain: any[] = [["x_studio_segment", "=", "Beauty"]];
    const stockDomain: any[] = [["product_id.x_studio_segment", "=", "Beauty"], ["location_id.usage", "=", "internal"]];

    if (filters.q) {
        salesDomain.push(["product_id.name", "ilike", filters.q]);
        productsDomain.push(["name", "ilike", filters.q]);
    }

    try {
        let allProducts: any[] = [];
        let offset = 0;
        const productIds: number[] = [];

        while (true) {
            const chunk = await odooJsonClient.searchRead<any>("product.product", {
                domain: productsDomain,
                fields: ["hs_code", "name", "x_studio_many2one_field_Arl5D"],
                limit: 1000,
                offset
            });

            allProducts = [...allProducts, ...chunk];
            const ids = chunk.map(p => p.id);
            productIds.push(...ids);

            if (chunk.length < 1000) break;
            offset += 1000;
        }

        const idToHs = new Map<number, string>();
        allProducts.forEach(p => {
            idToHs.set(p.id, p.hs_code || "SANS-HS");
        });

        const salesRaw = await odooJsonClient.readGroup<any>("pos.order.line", {
            domain: salesDomain,
            fields: ["price_unit", "qty", "product_id"],
            groupby: ["product_id", "create_date:month"],
            lazy: false
        });

        const productChunks = chunkArray(productIds, 500);
        const allStockResults: any[] = [];
        const allStockMoves: any[] = [];

        for (const idsChunk of productChunks) {
            if (idsChunk.length === 0) continue;

            const [stockRaw, stockMoves] = await Promise.all([
                odooJsonClient.readGroup<any>("stock.quant", {
                    domain: [...stockDomain, ["product_id", "in", idsChunk]],
                    fields: ["quantity"],
                    groupby: ["product_id"]
                }),
                odooJsonClient.readGroup<any>("stock.move", {
                    domain: [
                        ["product_id", "in", idsChunk],
                        ["state", "=", "done"],
                        ["picking_code", "in", ["outgoing", "incoming"]]
                    ],
                    fields: ["product_uom_qty"],
                    groupby: ["product_id", "date:month", "picking_code"],
                    lazy: false
                })
            ]);

            allStockResults.push(...stockRaw);
            allStockMoves.push(...stockMoves);
        }

        const tracker = new Map<string, any>();

        salesRaw.forEach(sale => {
            const pInfo = allProducts.find(p => p.id === sale.product_id[0]);
            if (!pInfo) return;

            const hsCode = pInfo.hs_code || "SANS-HS";
            const cleanName = pInfo.name.split('[')[0].trim();
            const odooMonth = sale['create_date:month'];

            const entry = ensureTrackerEntry(tracker, hsCode, cleanName);
            const monthMatch = monthRange.find(m =>
                odooMonth.toLowerCase().includes(format(m, 'MMMM', { locale: fr }).toLowerCase())
            );

            if (monthMatch) {
                const key = format(monthMatch, 'yyyy-MM');
                entry.monthlySales[key] = (entry.monthlySales[key] || 0) + (sale.discount === 100 ? 0 : sale.price_unit * sale.qty);
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

            const key = format(new Date(odooMonth), 'yyyy-MM');
            if (!entry.monthlyStockOpening[key]) entry.monthlyStockOpening[key] = 0;

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
        console.error("[ACTIONS_ERROR] Erreur getBeautySixMonthSales:", error);
        return { clients: [], columns: [] };
    }
}

export async function getFemmeSixMonthSales(month: string, year: string) {
    const selectedMonthInt = parseInt(month, 10);
    const selectedYearInt = parseInt(year, 10);
    const selectedDate = new Date(selectedYearInt, selectedMonthInt - 1, 1);

    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    try {
        const salesRaw = await odooJsonClient.readGroup<any>("pos.order.line", {
            domain: [
                ["product_id.x_studio_segment", "=", "Femme"],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", startDate],
                ["create_date", "<=", endDate]
            ],
            fields: ["price_unit", "qty", "product_id"],
            groupby: ["product_id", "create_date:month"],
            lazy: false
        });

        const productIds = [...new Set(salesRaw.map(s => s.product_id[0]))];

        if (productIds.length === 0) {
            return { products: [], columns: [] };
        }

        const [productsInfo, stockRaw] = await Promise.all([
            odooJsonClient.searchRead<any>("product.product", {
                domain: [["id", "in", productIds]],
                fields: ["name", "hs_code", "x_studio_many2one_field_Arl5D"]
            }),
            odooJsonClient.readGroup<any>("stock.quant", {
                domain: [
                    ["product_id", "in", productIds],
                    ["location_id.usage", "=", "internal"]
                ],
                fields: ["quantity", "product_id"],
                groupby: ["product_id"]
            })
        ]);

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
                entry.monthlySales[key] = (entry.monthlySales[key] || 0) + (sale.discount === 100 ? 0 : sale.qty * sale.price_unit);
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
        console.error("[ACTIONS_ERROR] Erreur getFemmeSixMonthSales:", error);
        return { products: [], columns: [] };
    }
}