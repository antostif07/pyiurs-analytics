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
        // 1. Récupération des lignes de vente POS
        const salesLines = await odooJsonClient.searchRead<any>("pos.order.line", {
            domain: [
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["create_date", ">=", startDate],
                ["create_date", "<=", endDate]
            ],
            fields: ["product_id", "qty", "price_subtotal_incl", "create_date"]
        });

        if (!salesLines || salesLines.length === 0) {
            return { suppliers: [], columns: [] };
        }

        const productIds = [...new Set(salesLines.map((l: any) => l.product_id[0]))];

        // 2. Lecture des produits Odoo avec leur PRIX DE REVIENT (standard_price)
        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["id", "name", "seller_ids", "standard_price"] // ✅ Ajout de standard_price
        });

        const productCostMap = new Map<number, number>();
        products.forEach((p: any) => {
            productCostMap.set(p.id, p.standard_price || 0);
        });

        // 3. Fournisseurs
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

        // 4. Stock
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

        // 5. Agrégation Ventes + Coûts d'Achat
        const supplierTracker = new Map<string, SupplierMonthlyPerformance>();

        salesLines.forEach((line: any) => {
            const productId = line.product_id[0];
            const supplier = productToSupplierMap.get(productId) || { id: "unknown", name: "Fournisseur Non Spécifié" };

            if (!isExternalSupplier(supplier.name) && supplier.id !== "unknown") return;

            const key = `${supplier.id}|${supplier.name}`;
            const monthKey = format(new Date(line.create_date), "yyyy-MM");

            const salesAmount = line.price_subtotal_incl || 0;
            const unitCost = productCostMap.get(productId) || 0;
            const totalCostAmount = unitCost * (line.qty || 0); // ✅ Calcul du coût total d'achat

            if (!supplierTracker.has(key)) {
                supplierTracker.set(key, {
                    supplierId: supplier.id,
                    supplierName: supplier.name,
                    currentStockQty: 0,
                    totalRevenue: 0,
                    totalPurchaseCost: 0,
                    monthlySales: {},
                    monthlyPurchaseCost: {},
                });
            }

            const entry = supplierTracker.get(key)!;
            entry.totalRevenue += salesAmount;
            entry.totalPurchaseCost += totalCostAmount;

            entry.monthlySales[monthKey] = (entry.monthlySales[monthKey] || 0) + salesAmount;
            entry.monthlyPurchaseCost[monthKey] = (entry.monthlyPurchaseCost[monthKey] || 0) + totalCostAmount;
        });

        // Injection du stock actuel
        productStockMap.forEach((qty, pid) => {
            const supplier = productToSupplierMap.get(pid);
            if (supplier && isExternalSupplier(supplier.name)) {
                const key = `${supplier.id}|${supplier.name}`;
                const entry = supplierTracker.get(key);
                if (entry) {
                    entry.currentStockQty += Math.round(qty);
                }
            }
        });

        const suppliersList = Array.from(supplierTracker.values()).sort(
            (a, b) => b.totalRevenue - a.totalRevenue
        );

        const columns = monthRange.map((d) => ({
            key: format(d, "yyyy-MM"),
            label: format(d, "MMM yy", { locale: fr }).toUpperCase(),
        }));

        return { suppliers: suppliersList, columns };

    } catch (error) {
        console.error("[SUPPLIER_ACTIONS_ERROR] Erreur calcul ventes fournisseurs:", error);
        return { suppliers: [], columns: [] };
    }
}