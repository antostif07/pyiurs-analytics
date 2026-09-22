// app/api/ceo-report/sales/matrix/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { startOfMonth, endOfMonth, format } from "date-fns";
import type { SalesMatrixData } from "@/app/ceo-report/sales/_components/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
    const supabase = await createClient();
    try {
        const { searchParams } = new URL(request.url);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const selectedDate = new Date(currentYear, currentMonth - 1, 1);

        // 1. PÉRIODE (Identique à votre format)
        const mtdStart = searchParams.get("from")
            ? `${searchParams.get("from")} 00:00:00`
            : format(startOfMonth(selectedDate), "yyyy-MM-dd 00:00:00");

        const mtdEnd = searchParams.get("to")
            ? `${searchParams.get("to")} 23:59:59`
            : format(endOfMonth(selectedDate), "yyyy-MM-dd 23:59:59");

        const targetDate = new Date(mtdStart);
        const selectedYearInt = targetDate.getFullYear();
        const selectedMonthInt = targetDate.getMonth() + 1;

        // ────────────────────────────────────────────────────────────────────────
        // 2. RÉCUPÉRATION DES BOUTIQUES ET BUDGETS (Comme dans votre code)
        // ────────────────────────────────────────────────────────────────────────
        const [{ data: dbShops }, { data: dbBudgets }] = await Promise.all([
            supabase.from("shops").select("*").order("name"),
            supabase
                .from("revenue_budgets")
                .select("*")
                .eq("month", selectedMonthInt)
                .eq("year", selectedYearInt),
        ]);

        if (!dbShops || dbShops.length === 0) {
            return NextResponse.json({ error: "Aucune boutique trouvée" }, { status: 404 });
        }

        // ────────────────────────────────────────────────────────────────────────
        // 3. RÉCUPÉRATION DES COMMANDES POS POUR LA MAP DE CAISSES (Step 3)
        // ────────────────────────────────────────────────────────────────────────
        const currentOrders = await odooJsonClient.searchRead<any>("pos.order", {
            domain: [
                ["state", "in", ["paid", "done", "invoiced"]],
                ["date_order", ">=", mtdStart],
                ["date_order", "<=", mtdEnd],
            ],
            fields: ["id", "config_id", "date_order"],
            limit: 15000,
        });

        const orderToConfigMap = new Map<number, number>();
        currentOrders.forEach((order: any) => {
            if (order.config_id && Array.isArray(order.config_id)) {
                orderToConfigMap.set(order.id, order.config_id[0]);
            }
        });

        // ────────────────────────────────────────────────────────────────────────
        // 4. RÉCUPÉRATION DES LIGNES DE VENTES POS (Step 4)
        // ────────────────────────────────────────────────────────────────────────
        const currentLines = await odooJsonClient.searchRead<any>("pos.order.line", {
            domain: [
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["order_id.date_order", ">=", mtdStart],
                ["order_id.date_order", "<=", mtdEnd],
            ],
            fields: ["order_id", "price_unit", "qty", "product_id", "discount", "create_date"],
            limit: 25000,
        });

        // ────────────────────────────────────────────────────────────────────────
        // 5. RÉSOLUTION DES PRODUITS ET SEGMENTS STUDIO
        // ────────────────────────────────────────────────────────────────────────
        const allProdIds = [...new Set(currentLines.map((l: any) => l.product_id[0]))];

        const productsInfo = allProdIds.length > 0
            ? await odooJsonClient.searchRead<any>("product.product", {
                domain: [["id", "in", allProdIds]],
                fields: ["x_studio_segment", "pos_categ_ids"],
                limit: allProdIds.length,
            })
            : [];

        const productsMap = new Map(productsInfo.map((p: any) => [p.id, p]));

        // ────────────────────────────────────────────────────────────────────────
        // 6. VENTILATION MATRICE CROISÉE : BOUTIQUE × SEGMENT
        // ────────────────────────────────────────────────────────────────────────
        const storesColumns = dbShops.map((s) => ({
            id: s.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            code: `${s.name} ($)`,
            name: s.name,
            shopId: s.id,
        }));

        const categoryValues: Record<string, Record<string, number>> = {
            Femme: {},
            Enfant: {},
            Beauty: {},
        };

        const totalByStore: Record<string, number> = {};
        storesColumns.forEach((c) => {
            categoryValues.Femme[c.id] = 0;
            categoryValues.Enfant[c.id] = 0;
            categoryValues.Beauty[c.id] = 0;
            totalByStore[c.id] = 0;
        });

        for (const line of currentLines) {
            const orderId = Array.isArray(line.order_id) ? line.order_id[0] : line.order_id;
            const configId = orderToConfigMap.get(orderId);
            if (!configId) continue;

            const shop = dbShops.find((s) => s.odoo_pos_ids?.includes(configId));
            if (!shop) continue;

            const storeColId = shop.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const prod = productsMap.get(line.product_id[0]);
            const segment = prod?.x_studio_segment || "Autres";

            // ✅ VOTRE VRAIE FORMULE DE MONTANT EXACTE :
            const amount = line.discount === 100 ? 0 : Number(line.price_unit || 0) * Number(line.qty || 0);

            if (segment === "Femme") {
                categoryValues.Femme[storeColId] = (categoryValues.Femme[storeColId] || 0) + amount;
                totalByStore[storeColId] = (totalByStore[storeColId] || 0) + amount;
            } else if (segment === "Enfant") {
                categoryValues.Enfant[storeColId] = (categoryValues.Enfant[storeColId] || 0) + amount;
                totalByStore[storeColId] = (totalByStore[storeColId] || 0) + amount;
            } else if (segment === "Beauty") {
                categoryValues.Beauty[storeColId] = (categoryValues.Beauty[storeColId] || 0) + amount;
                totalByStore[storeColId] = (totalByStore[storeColId] || 0) + amount;
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 7. CONSOLIDATION AVEC LES BUDGETS DE 'revenue_budgets'
        // ────────────────────────────────────────────────────────────────────────
        const buildCategoryRow = (
            segKey: "Femme" | "Enfant" | "Beauty",
            displayLabel: string
        ) => {
            const storeVals = categoryValues[segKey];
            const totalRealized = Math.round(Object.values(storeVals).reduce((a, b) => a + b, 0));

            // Somme des budgets pour ce segment sur le mois
            const segmentBudgets = dbBudgets?.filter((b) => b.segment === segKey) || [];
            const budgetTarget = Math.round(
                segmentBudgets.reduce((sum, b) => sum + Number(b.target_amount || 0), 0)
            );

            const varianceAmount = totalRealized - budgetTarget;
            const variancePercent =
                budgetTarget > 0 ? Number(((varianceAmount / budgetTarget) * 100).toFixed(1)) : 0;

            return {
                categoryId: segKey.toLowerCase(),
                categoryName: displayLabel,
                storeValues: storeVals,
                totalRealized,
                budgetTarget,
                varianceAmount,
                variancePercent,
            };
        };

        const rows = [
            buildCategoryRow("Femme", "Femme"),
            buildCategoryRow("Enfant", "Kids"),
            buildCategoryRow("Beauty", "Beauty"),
        ];

        const totalRealizedGlobal = rows.reduce((acc, r) => acc + r.totalRealized, 0);
        const totalBudgetGlobal = rows.reduce((acc, r) => acc + r.budgetTarget, 0);
        const totalVarianceGlobal = totalRealizedGlobal - totalBudgetGlobal;
        const totalVariancePercentGlobal =
            totalBudgetGlobal > 0 ? Number(((totalVarianceGlobal / totalBudgetGlobal) * 100).toFixed(1)) : 0;

        // Écarts réels par Boutique (Ligne FOOTER 2)
        const varianceAmountByStore: Record<string, number> = {};
        storesColumns.forEach((c) => {
            const realized = Math.round(totalByStore[c.id] || 0);
            const shopBudgets = dbBudgets?.filter((b) => b.shop_id === c.shopId) || [];
            const budget = Math.round(
                shopBudgets.reduce((sum, b) => sum + Number(b.target_amount || 0), 0)
            );
            varianceAmountByStore[c.id] = realized - budget;
        });

        const responsePayload: SalesMatrixData = {
            periodLabel: `${selectedMonthInt}/${selectedYearInt}`,
            stores: storesColumns,
            rows,
            totals: {
                totalRealizedByStore: totalByStore,
                totalRealizedGlobal,
                varianceAmountByStore,
                totalVarianceGlobal,
                totalVariancePercentGlobal,
            },
        };

        return NextResponse.json(responsePayload);
    } catch (e) {
        console.error("[SALES_MATRIX_ERROR]:", e);
        return NextResponse.json(
            { error: e instanceof Error ? e.message : "Erreur interne" },
            { status: 500 }
        );
    }
}