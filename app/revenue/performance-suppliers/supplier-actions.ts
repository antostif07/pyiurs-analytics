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

    // 1. Génération de la plage de 6 mois roulants
    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    try {
        // 2. Récupération des lignes de vente POS sur la période
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

        // 3. Extraction des IDs uniques de produits vendus
        const productIds = [...new Set(salesLines.map((l: any) => l.product_id[0]))];

        // 4. Lecture des produits Odoo et de leurs seller_ids
        const products = await odooJsonClient.searchRead<any>("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["id", "name", "seller_ids"]
        });

        // Extraction de tous les IDs seller_ids (product.supplierinfo)
        const allSellerInfoIds = products.flatMap((p: any) => p.seller_ids || []);

        // 5. Lecture des informations Fournisseurs (product.supplierinfo -> partner_id)
        const supplierInfos = allSellerInfoIds.length > 0
            ? await odooJsonClient.searchRead<any>("product.supplierinfo", {
                domain: [["id", "in", allSellerInfoIds]],
                fields: ["product_tmpl_id", "partner_id"]
            })
            : [];

        // Map: seller_info_id -> { partnerId (string), partnerName }
        const sellerInfoMap = new Map<number, { id: string; name: string }>();
        supplierInfos.forEach((s: any) => {
            if (s.partner_id && Array.isArray(s.partner_id)) {
                sellerInfoMap.set(s.id, {
                    id: String(s.partner_id[0]), // ✅ Unifié en string
                    name: s.partner_id[1]
                });
            }
        });

        // Map: productId -> Fournisseur Principal Externe (unifié en string)
        const productToSupplierMap = new Map<number, { id: string; name: string }>();

        products.forEach((p: any) => {
            let assignedSupplier: { id: string; name: string } = {
                id: "unknown",
                name: "Fournisseur Non Spécifié"
            };

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

        // 6. Récupération du stock actuel en boutique (stock.quant)
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

        // 7. Agrégation des Ventes par Fournisseur Externe et par Mois
        const supplierTracker = new Map<string, SupplierMonthlyPerformance>();

        salesLines.forEach((line: any) => {
            const productId = line.product_id[0];
            const supplier = productToSupplierMap.get(productId) || { id: "unknown", name: "Fournisseur Non Spécifié" };

            // Si c'est une société interne (PB - *), on l'exclut
            if (!isExternalSupplier(supplier.name) && supplier.id !== "unknown") return;

            const key = `${supplier.id}|${supplier.name}`;
            const monthKey = format(new Date(line.create_date), "yyyy-MM");
            const amount = line.price_subtotal_incl || 0;

            if (!supplierTracker.has(key)) {
                supplierTracker.set(key, {
                    supplierId: supplier.id,
                    supplierName: supplier.name,
                    currentStockQty: 0,
                    totalRevenue: 0,
                    monthlySales: {},
                });
            }

            const entry = supplierTracker.get(key)!;
            entry.totalRevenue += amount;
            entry.monthlySales[monthKey] = (entry.monthlySales[monthKey] || 0) + amount;
        });

        // Attacher le stock actuel au fournisseur
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

        // Tri par chiffre d'affaires décroissant
        const suppliersList = Array.from(supplierTracker.values()).sort(
            (a, b) => b.totalRevenue - a.totalRevenue
        );

        // Construction des en-têtes de colonnes
        const columns = monthRange.map((d) => ({
            key: format(d, "yyyy-MM"),
            label: format(d, "MMM yy", { locale: fr }).toUpperCase(),
        }));

        return {
            suppliers: suppliersList,
            columns,
        };

    } catch (error) {
        console.error("[SUPPLIER_ACTIONS_ERROR] Erreur lors du calcul des ventes fournisseurs:", error);
        return { suppliers: [], columns: [] };
    }
}