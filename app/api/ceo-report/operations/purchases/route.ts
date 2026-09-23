// app/api/ceo-report/operations/purchases/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { fetchAllQuantsProducts } from "../../stock/kpis/helpers";
import { PurchaseDispatchKpisData, PurchaseFunnelPoint, StoreDispatchShare } from "@/app/ceo-report/operations/purchases/_lib/types";
import { PurchaseDispatchRow } from "@/app/ceo-report/operations/purchases/_components/purchase-dispatch-matrix-table";

export const dynamic = "force-dynamic";

// Cartographie des emplacements cibles
export const STORE_LOCATIONS = {
    PB_BC: [226, 200, 220, 232], // Magasin Central P.BC (Origine des transferts)
    PB_MTO: [180],               // Boutique MTO
    PB_KTM: [245, 300, 170],     // Boutique KTM
    PB_LMB: [293, 244, 160],     // Boutique LMB
    P24: [89],                   // Boutique 24
} as const;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // ────────────────────────────────────────────────────────────────────────
        // 1. DATES DE LA PÉRIODE (Défaut : Mois en cours)
        // ────────────────────────────────────────────────────────────────────────
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();

        const defaultStart = `${year}-${month}-01 00:00:00`;
        const defaultEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")} 23:59:59`;

        const fromDate = searchParams.get("from") ? `${searchParams.get("from")} 00:00:00` : defaultStart;
        const toDate = searchParams.get("to") ? `${searchParams.get("to")} 23:59:59` : defaultEnd;

        // ────────────────────────────────────────────────────────────────────────
        // 2. RÉSOLUTION DES FOURNISSEURS CIBLES (P.FEM, P.BTY, P.KID)
        // ────────────────────────────────────────────────────────────────────────
        const targetSuppliers = await odooClient.searchRead<{ id: number; name: string }>("res.partner", {
            domain: [
                "|",
                "|",
                ["name", "=like", "P.FEM%"],
                ["name", "=like", "P.BTY%"],
                ["name", "=like", "P.KID%"],
            ],
            fields: ["id", "name"],
            limit: 1000,
        });

        const supplierSegmentMap = new Map<number, "Femme" | "Beauty" | "Enfant">();
        for (const s of targetSuppliers) {
            const upper = (s.name || "").trim().toUpperCase();
            if (upper.startsWith("P.FEM")) supplierSegmentMap.set(s.id, "Femme");
            else if (upper.startsWith("P.BTY")) supplierSegmentMap.set(s.id, "Beauty");
            else if (upper.startsWith("P.KID")) supplierSegmentMap.set(s.id, "Enfant");
        }

        const supplierIds = Array.from(supplierSegmentMap.keys());

        // ────────────────────────────────────────────────────────────────────────
        // 3. COMMANDES PO & RÉCEPTIONS À P.BC
        // ────────────────────────────────────────────────────────────────────────
        const poSummary = {
            Femme: { poAmount: 0, receivedPbc: 0 },
            Beauty: { poAmount: 0, receivedPbc: 0 },
            Enfant: { poAmount: 0, receivedPbc: 0 },
        };

        if (supplierIds.length > 0) {
            const purchaseOrders = await odooClient.searchRead<{
                id: number;
                partner_id: [number, string];
                amount_total: number;
            }>("purchase.order", {
                domain: [
                    ["partner_id", "in", supplierIds],
                    ["date_order", ">=", fromDate],
                    ["date_order", "<=", toDate],
                    ["state", "in", ["purchase", "done"]],
                ],
                fields: ["id", "partner_id", "amount_total"],
                limit: 1500,
            });

            const poIds: number[] = [];
            const poIdToSegment = new Map<number, "Femme" | "Beauty" | "Enfant">();

            for (const po of purchaseOrders) {
                const supId = Array.isArray(po.partner_id) ? po.partner_id[0] : 0;
                const seg = supplierSegmentMap.get(supId);
                if (seg) {
                    poIds.push(po.id);
                    poIdToSegment.set(po.id, seg);
                    poSummary[seg].poAmount += Number(po.amount_total || 0);
                }
            }

            // Calcul du montant reçu via 'qty_received'
            if (poIds.length > 0) {
                const poLines = await odooClient.searchRead<{
                    order_id: [number, string];
                    qty_received: number;
                    price_unit: number;
                }>("purchase.order.line", {
                    domain: [["order_id", "in", poIds]],
                    fields: ["order_id", "qty_received", "price_unit"],
                    limit: 5000,
                });

                for (const line of poLines) {
                    const ordId = Array.isArray(line.order_id) ? line.order_id[0] : 0;
                    const seg = poIdToSegment.get(ordId);
                    if (seg) {
                        const unitPrice = Number(line.price_unit || 0);
                        const qtyReceived = Number(line.qty_received || 0);
                        poSummary[seg].receivedPbc += qtyReceived * unitPrice;
                    }
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 4. TRANSFERTS ENVOYÉS DEPUIS P.BC VERS LES BOUTIQUES (stock.move)
        // ────────────────────────────────────────────────────────────────────────
        const centralLocationIds = STORE_LOCATIONS.PB_BC;
        const storeLocationIds = [
            ...STORE_LOCATIONS.P24,
            ...STORE_LOCATIONS.PB_MTO,
            ...STORE_LOCATIONS.PB_LMB,
            ...STORE_LOCATIONS.PB_KTM,
        ];

        const transferMoves = await odooClient.searchRead<{
            product_id: [number, string];
            product_uom_qty: number;
            location_id: [number, string];
            location_dest_id: [number, string];
        }>("stock.move", {
            domain: [
                ["date", ">=", fromDate],
                ["date", "<=", toDate],
                ["state", "=", "done"],
                ["location_id", "in", centralLocationIds],       // Origine : Magasin Central P.BC
                ["location_dest_id", "in", storeLocationIds],     // Destination : Boutiques
            ],
            fields: ["product_id", "product_uom_qty", "location_id", "location_dest_id"],
            limit: 10000,
        });

        // Résolution des coûts et segments des produits transférés
        const transferProductIds = Array.from(
            new Set(transferMoves.map((m) => (Array.isArray(m.product_id) ? m.product_id[0] : 0)).filter(Boolean))
        );

        const transferProducts = await fetchAllQuantsProducts(transferProductIds);
        const productInfoMap = new Map(
            transferProducts.map((p: any) => [
                p.id,
                {
                    cost: Number(p.standard_price || 0),
                    segment: (p.x_studio_segment || "").toString().trim().toLowerCase(),
                },
            ])
        );

        // Structure de ventilation des transferts par catégorie et par boutique
        const storeTransfers = {
            Femme: { p24: 0, pMto: 0, pLmb: 0, pKtm: 0, pOnl: 0 },
            Beauty: { p24: 0, pMto: 0, pLmb: 0, pKtm: 0, pOnl: 0 },
            Enfant: { p24: 0, pMto: 0, pLmb: 0, pKtm: 0, pOnl: 0 },
        };

        for (const move of transferMoves) {
            const pId = Array.isArray(move.product_id) ? move.product_id[0] : 0;
            const pInfo = productInfoMap.get(pId);
            if (!pInfo) continue;

            const qty = Number(move.product_uom_qty || 0);
            const val = qty * pInfo.cost;
            const destId = Array.isArray(move.location_dest_id) ? move.location_dest_id[0] : 0;

            let segKey: "Femme" | "Beauty" | "Enfant" | null = null;
            if (pInfo.segment === "femme") segKey = "Femme";
            else if (pInfo.segment === "beauty") segKey = "Beauty";
            else if (pInfo.segment === "enfant" || pInfo.segment === "kids") segKey = "Enfant";

            if (!segKey) continue;

            // Attribution selon l'ID d'emplacement boutique
            if (STORE_LOCATIONS.P24.includes(destId as any)) {
                storeTransfers[segKey].p24 += val;
            } else if (STORE_LOCATIONS.PB_MTO.includes(destId as any)) {
                storeTransfers[segKey].pMto += val;
            } else if (STORE_LOCATIONS.PB_LMB.includes(destId as any)) {
                storeTransfers[segKey].pLmb += val;
            } else if (STORE_LOCATIONS.PB_KTM.includes(destId as any)) {
                storeTransfers[segKey].pKtm += val;
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 5. CONSTRUCTION DES LIGNES DU TABLEAU 4
        // ────────────────────────────────────────────────────────────────────────
        const buildRow = (
            segKey: "Femme" | "Beauty" | "Enfant",
            label: string
        ): PurchaseDispatchRow => {
            const poAmount = Math.round(poSummary[segKey].poAmount);
            const receivedPbc = Math.round(poSummary[segKey].receivedPbc);

            const st = storeTransfers[segKey];
            const stores = {
                p24: Math.round(st.p24),
                pMto: Math.round(st.pMto),
                pLmb: Math.round(st.pLmb),
                pKtm: Math.round(st.pKtm),
                pOnl: Math.round(st.pOnl),
            };

            const totalTransferred = stores.p24 + stores.pMto + stores.pLmb + stores.pKtm + stores.pOnl;
            // Reliquat P.BC = Ce qui a été reçu au Magasin Central moins ce qui a été expédié
            const reliquatPbc = Math.max(0, receivedPbc - totalTransferred);

            return {
                category: label,
                poAmount,
                receivedPbc,
                stores,
                totalTransferred,
                reliquatPbc,
            };
        };

        const tableRows: PurchaseDispatchRow[] = [
            buildRow("Femme", "Achats Femme"),
            buildRow("Enfant", "Achats Kids"),
            buildRow("Beauty", "Achats Beauty"),
        ];

        // ────────────────────────────────────────────────────────────────────────
        // 6. CALCUL DES KPIS ET DES GRAPHIQUES
        // ────────────────────────────────────────────────────────────────────────
        const poAmountTotal = tableRows.reduce((acc, r) => acc + r.poAmount, 0);
        const receivedPbcTotal = tableRows.reduce((acc, r) => acc + r.receivedPbc, 0);
        const transferredTotal = tableRows.reduce((acc, r) => acc + r.totalTransferred, 0);
        const reliquatPbcTotal = tableRows.reduce((acc, r) => acc + r.reliquatPbc, 0);

        const receptionRate = poAmountTotal > 0 ? Number(((receivedPbcTotal / poAmountTotal) * 100).toFixed(1)) : 0;
        const transferRate = receivedPbcTotal > 0 ? Number(((transferredTotal / receivedPbcTotal) * 100).toFixed(1)) : 0;

        const kpis: PurchaseDispatchKpisData = {
            poAmountTotal,
            categoriesCount: 3,
            receivedPbcTotal,
            receptionRate,
            transferredTotal,
            transferRate,
            reliquatPbcTotal,
        };

        // Données Entonnoir
        const funnelData: PurchaseFunnelPoint[] = tableRows.map((r) => ({
            name: r.category.replace("Achats ", ""),
            "Commande PO": r.poAmount,
            "Reçu P.BC": r.receivedPbc,
            "Transféré Boutiques": r.totalTransferred,
            "Reliquat Central": r.reliquatPbc,
        }));

        // Données Répartition Boutiques
        const storeTotals = {
            P24: tableRows.reduce((acc, r) => acc + r.stores.p24, 0),
            "P.MTO": tableRows.reduce((acc, r) => acc + r.stores.pMto, 0),
            "P.LMB": tableRows.reduce((acc, r) => acc + r.stores.pLmb, 0),
            "P.KTM": tableRows.reduce((acc, r) => acc + r.stores.pKtm, 0),
            "P.ONL": tableRows.reduce((acc, r) => acc + r.stores.pOnl, 0),
        };

        const storeShares: StoreDispatchShare[] = Object.entries(storeTotals).map(([store, montant]) => ({
            store,
            montant,
            part: transferredTotal > 0 ? `${((montant / transferredTotal) * 100).toFixed(1)}%` : "0%",
        }));

        return NextResponse.json({
            kpis,
            funnelData,
            storeShares,
            tableRows,
        });
    } catch (error) {
        console.error("[PURCHASES_DISPATCH_ROUTE_ERROR]:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur interne" },
            { status: 500 }
        );
    }
}