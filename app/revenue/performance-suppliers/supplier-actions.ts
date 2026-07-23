'use server';

import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { isExternalSupplier, SupplierMonthlyPerformance } from "./supplier-helpers";

export interface SupplierPerformanceResult {
    suppliers: SupplierMonthlyPerformance[];
    columns: { key: string; label: string }[];
}

export async function getSupplierPerformanceData(
    month: string,
    year: string
): Promise<SupplierPerformanceResult> {
    const selectedMonthInt = parseInt(month, 10);
    const selectedYearInt = parseInt(year, 10);
    const selectedDate = new Date(selectedYearInt, selectedMonthInt - 1, 1);

    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    try {
        // 1. RÉCUPÉRATION SIMULTANÉE : VENTES POS + ACHATS FOURNISSEURS (Odoo JSON-2)
        const [salesLines, purchaseLines] = await Promise.all([
            odooJsonClient.searchRead<any>("pos.order.line", {
                domain: [
                    ["order_id.state", "in", ["paid", "done", "invoiced"]],
                    ["create_date", ">=", startDate],
                    ["create_date", "<=", endDate]
                ],
                fields: ["product_id", "qty", "price_subtotal_incl", "create_date"]
            }),
            odooJsonClient.searchRead<any>("purchase.order.line", {
                domain: [
                    ["order_id.state", "in", ["purchase", "done"]],
                    ["date_approve", ">=", startDate],
                    ["date_approve", "<=", endDate]
                ],
                fields: ["product_id", "partner_id", "price_subtotal", "date_approve", "create_date"]
            })
        ]);

        const productIds = [...new Set([
            ...salesLines.map((l: any) => l.product_id[0]),
            ...purchaseLines.map((p: any) => p.product_id ? p.product_id[0] : null).filter(Boolean)
        ])];

        if (productIds.length === 0) {
            return { suppliers: [], columns: [] };
        }

        // 2. LECTURE DES PRODUITS ET DE LEURS FOURNISSEURS (seller_ids)
        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["id", "name", "seller_ids", "standard_price"]
        });

        const productCostMap = new Map<number, number>();
        products.forEach((p: any) => productCostMap.set(p.id, p.standard_price || 0));

        const allSellerInfoIds = products.flatMap((p: any) => p.seller_ids || []);
        const supplierInfos = allSellerInfoIds.length > 0
            ? await odooJsonClient.searchRead<any>("product.supplierinfo", {
                domain: [["id", "in", allSellerInfoIds]],
                fields: ["product_tmpl_id", "partner_id"]
            })
            : [];

        const sellerInfoMap = new Map<number, { id: string; name: string }>();
        supplierInfos.forEach((s: any) => {
            if (s.partner_id && Array.isArray(s.partner_id)) {
                sellerInfoMap.set(s.id, {
                    id: String(s.partner_id[0]),
                    name: s.partner_id[1]
                });
            }
        });

        const productToSupplierMap = new Map<number, { id: string; name: string }>();
        products.forEach((p: any) => {
            let assignedSupplier = { id: "unknown", name: "Fournisseur Non Spécifié" };
            if (p.seller_ids && p.seller_ids.length > 0) {
                for (const sellerInfoId of p.seller_ids) {
                    const supplier = sellerInfoMap.get(sellerInfoId);
                    if (supplier && isExternalSupplier(supplier.name)) {
                        assignedSupplier = supplier;
                        break;
                    }
                }
            }
            productToSupplierMap.set(p.id, assignedSupplier);
        });

        // 3. STOCK ACTUEL EN BOUTIQUE
        const stockQuants = await odooJsonClient.searchRead<any>("stock.quant", {
            domain: [
                ["product_id", "in", productIds],
                ["location_id.usage", "=", "internal"]
            ],
            fields: ["product_id", "quantity"]
        });

        const productStockMap = new Map<number, number>();
        stockQuants.forEach((q: any) => {
            const pid = q.product_id[0];
            productStockMap.set(pid, (productStockMap.get(pid) || 0) + q.quantity);
        });

        // 4. AGREGATION DES DONNÉES PAR FOURNISSEUR
        const supplierTracker = new Map<string, SupplierMonthlyPerformance>();

        const getOrCreateTracker = (id: string, name: string) => {
            const key = `${id}|${name}`;
            if (!supplierTracker.has(key)) {
                supplierTracker.set(key, {
                    supplierId: id,
                    supplierName: name,
                    currentStockQty: 0,
                    totalPurchases: 0,
                    totalSales: 0,
                    totalCost: 0,
                    totalMarginPercent: 0,
                    purchases3M: 0,
                    sales3M: 0,
                    cost3M: 0,
                    marginPercent3M: 0,
                    monthlyPurchases: {},
                    monthlySales: {},
                    monthlyCost: {},
                });
            }
            return supplierTracker.get(key)!;
        };

        // A. Traitement des ACHATS (purchase.order.line)
        purchaseLines.forEach((pLine: any) => {
            const partner = pLine.partner_id;
            if (!partner || !Array.isArray(partner)) return;

            const supplierName = partner[1];
            if (!isExternalSupplier(supplierName)) return; // Filtre les sociétés internes PB - *

            const supplierId = String(partner[0]);
            const entry = getOrCreateTracker(supplierId, supplierName);

            const dateStr = pLine.date_approve || pLine.create_date;
            const monthKey = format(new Date(dateStr), "yyyy-MM");
            const purchaseAmount = pLine.price_subtotal || 0;

            entry.totalPurchases += purchaseAmount;
            entry.monthlyPurchases[monthKey] = (entry.monthlyPurchases[monthKey] || 0) + purchaseAmount;
        });

        // B. Traitement des VENTES POS (pos.order.line)
        salesLines.forEach((sLine: any) => {
            const productId = sLine.product_id[0];
            const supplier = productToSupplierMap.get(productId) || { id: "unknown", name: "Fournisseur Non Spécifié" };

            if (!isExternalSupplier(supplier.name) && supplier.id !== "unknown") return;

            const entry = getOrCreateTracker(supplier.id, supplier.name);
            const monthKey = format(new Date(sLine.create_date), "yyyy-MM");

            const salesAmount = sLine.price_subtotal_incl || 0;
            const unitCost = productCostMap.get(productId) || 0;
            const costAmount = unitCost * (sLine.qty || 0);

            entry.totalSales += salesAmount;
            entry.totalCost += costAmount;

            entry.monthlySales[monthKey] = (entry.monthlySales[monthKey] || 0) + salesAmount;
            entry.monthlyCost[monthKey] = (entry.monthlyCost[monthKey] || 0) + costAmount;
        });

        // C. Injection du stock physique actuel
        productStockMap.forEach((qty, pid) => {
            const supplier = productToSupplierMap.get(pid);
            if (supplier && isExternalSupplier(supplier.name)) {
                const entry = getOrCreateTracker(supplier.id, supplier.name);
                entry.currentStockQty += Math.round(qty);
            }
        });

        // D. Calcul des Totaux 3M et Marges %
        const last3Keys = monthRange.slice(-3).map(d => format(d, "yyyy-MM"));

        const suppliersList = Array.from(supplierTracker.values()).map((entry) => {
            // Calcul 3M
            entry.purchases3M = last3Keys.reduce((sum, k) => sum + (entry.monthlyPurchases[k] || 0), 0);
            entry.sales3M = last3Keys.reduce((sum, k) => sum + (entry.monthlySales[k] || 0), 0);
            entry.cost3M = last3Keys.reduce((sum, k) => sum + (entry.monthlyCost[k] || 0), 0);

            // Marges %
            entry.totalMarginPercent = entry.totalSales > 0
                ? Math.round(((entry.totalSales - entry.totalCost) / entry.totalSales) * 100)
                : 0;

            entry.marginPercent3M = entry.sales3M > 0
                ? Math.round(((entry.sales3M - entry.cost3M) / entry.sales3M) * 100)
                : 0;

            return entry;
        }).sort((a, b) => b.totalSales - a.totalSales);

        const columns = monthRange.map((d) => ({
            key: format(d, "yyyy-MM"),
            label: format(d, "MMM yy", { locale: fr }).toUpperCase(),
        }));

        return { suppliers: suppliersList, columns };

    } catch (error) {
        console.error("[SUPPLIER_ACTIONS_ERROR] Erreur lors de l'extraction fournisseurs:", error);
        return { suppliers: [], columns: [] };
    }
}