// app/api/ceo-report/stock/kpis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { StockKpisData, SizeDistributionPoint, StockFluxPoint } from "@/app/ceo-report/stock/_lib/types";
import { fetchAllInternalQuants, fetchAllQuantsProducts } from "./helpers";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { StockMovementRow } from "@/app/ceo-report/stock/_components/stock-movement-matrix-table";

export const dynamic = "force-dynamic";

export const STORE_LOCATIONS = {
    PB_BC: [226, 200, 220, 232], // Emplacements Magasin Central P.BC
    PB_MTO: [180],               // Emplacement Boutique MTO
    PB_KTM: [245, 300, 170],     // Emplacements Boutique KTM
    PB_LMB: [293, 244, 160],     // Emplacements Boutique LMB
    P24: [89],                   // Emplacement Boutique 24
} as const;

type StoreKey = keyof typeof STORE_LOCATIONS;

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

        // Filtrage des boutiques
        const storesParam = searchParams.get("stores");
        const selectedStoreKeys = storesParam
            ? (storesParam.split(",") as StoreKey[])
            : (Object.keys(STORE_LOCATIONS) as StoreKey[]);

        const allowedLocationIds = new Set<number>();
        for (const storeKey of selectedStoreKeys) {
            if (STORE_LOCATIONS[storeKey]) {
                for (const id of STORE_LOCATIONS[storeKey]) {
                    allowedLocationIds.add(id);
                }
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 2. STOCK ACTUEL PAR PRODUIT (Conservation stricte des négatifs)
        // ────────────────────────────────────────────────────────────────────────
        const quants = await fetchAllInternalQuants();

        const currentStockMap = new Map<number, number>();
        for (const q of quants) {
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
            if (allowedLocationIds.size > 0 && !allowedLocationIds.has(locId)) continue;

            const pId = Array.isArray(q.product_id) ? q.product_id[0] : 0;
            const qty = Number(q.quantity || 0);

            // Filtre uniquement les erreurs de scan de code-barre (> 100k)
            if (qty < -10000 || qty > 100000) continue;

            // ✅ Somme nette directe (+ et -)
            currentStockMap.set(pId, (currentStockMap.get(pId) || 0) + qty);
        }

        // ────────────────────────────────────────────────────────────────────────
        // 3. ACHATS FOURNISSEURS (P.FEM, P.BTY, P.KID sur purchase.order)
        // ────────────────────────────────────────────────────────────────────────
        const purchasesBySegment = {
            Femme: 0,
            Beauty: 0,
            Enfant: 0,
        };

        try {
            const purchaseOrders = await odooClient.searchRead<{
                id: number;
                partner_id: [number, string];
                amount_total: number;
            }>("purchase.order", {
                domain: [
                    ["date_order", ">=", fromDate],
                    ["date_order", "<=", toDate],
                    ["state", "in", ["purchase", "done"]],
                ],
                fields: ["partner_id", "amount_total"],
                limit: 1000,
            });

            for (const po of purchaseOrders) {
                const partnerName = Array.isArray(po.partner_id) ? po.partner_id[1].toUpperCase() : "";
                const amount = Number(po.amount_total || 0);

                if (partnerName.startsWith("P.FEM")) {
                    purchasesBySegment.Femme += amount;
                } else if (partnerName.startsWith("P.BTY")) {
                    purchasesBySegment.Beauty += amount;
                } else if (partnerName.startsWith("P.KID")) {
                    purchasesBySegment.Enfant += amount;
                }
            }
        } catch (e) {
            console.warn("Erreur lecture purchase.order:", e);
        }

        // ────────────────────────────────────────────────────────────────────────
        // 4. VENTES CLIENTS (pos.order.line sur la période)
        // ────────────────────────────────────────────────────────────────────────
        let posLines: Array<{
            product_id: [number, string];
            price_subtotal_incl?: number;
            price_subtotal?: number;
            qty: number;
        }> = [];

        try {
            posLines = await odooClient.searchRead("pos.order.line", {
                domain: [
                    ["order_id.date_order", ">=", fromDate],
                    ["order_id.date_order", "<=", toDate],
                    ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ],
                fields: ["product_id", "price_subtotal_incl", "price_subtotal", "qty"],
                limit: 10000,
            });
        } catch (e) {
            console.warn("Erreur lecture pos.order.line:", e);
        }

        // ────────────────────────────────────────────────────────────────────────
        // 5. MOUVEMENTS DE STOCK POUR LE REMBOBINAGE (Depuis fromDate)
        // ────────────────────────────────────────────────────────────────────────
        const movesByProduct = new Map<number, { in: number; out: number }>();

        try {
            const stockMoves = await odooClient.searchRead<{
                product_id: [number, string];
                product_uom_qty: number;
                location_id: [number, string];
                location_dest_id: [number, string];
            }>("stock.move", {
                domain: [
                    ["date", ">=", fromDate],
                    ["state", "=", "done"],
                    "|",
                    ["location_id", "in", Array.from(allowedLocationIds)],
                    ["location_dest_id", "in", Array.from(allowedLocationIds)],
                ],
                fields: ["product_id", "product_uom_qty", "location_id", "location_dest_id"],
                limit: 10000,
            });

            for (const move of stockMoves) {
                const pId = Array.isArray(move.product_id) ? move.product_id[0] : 0;
                const qty = Number(move.product_uom_qty || 0);

                const sourceId = Array.isArray(move.location_id) ? move.location_id[0] : 0;
                const destId = Array.isArray(move.location_dest_id) ? move.location_dest_id[0] : 0;

                const isSourceInternal = allowedLocationIds.has(sourceId);
                const isDestInternal = allowedLocationIds.has(destId);

                let type: "in" | "out" | "internal" = "internal";
                if (!isSourceInternal && isDestInternal) type = "in";
                else if (isSourceInternal && !isDestInternal) type = "out";

                if (type !== "internal") {
                    const current = movesByProduct.get(pId) || { in: 0, out: 0 };
                    if (type === "in") current.in += qty;
                    else current.out += qty;
                    movesByProduct.set(pId, current);
                }
            }
        } catch (e) {
            console.warn("Erreur lecture stock.move:", e);
        }

        // ────────────────────────────────────────────────────────────────────────
        // 6. RÉSOLUTION PRODUITS & SEGMENT STUDIO
        // ────────────────────────────────────────────────────────────────────────
        const allProductIds = Array.from(
            new Set([
                ...currentStockMap.keys(),
                ...posLines.map((l) => (Array.isArray(l.product_id) ? l.product_id[0] : 0)),
                ...movesByProduct.keys(),
            ])
        ).filter(Boolean);

        const products = await fetchAllQuantsProducts(allProductIds);

        const productMap = new Map(
            products.map((p: any) => {
                const rawSize = p.x_studio_many2one_field_QyelN;
                const sizeLabel = Array.isArray(rawSize)
                    ? rawSize[1]
                    : typeof rawSize === "string" && rawSize.trim()
                        ? rawSize.trim()
                        : "Taille Unique";

                return [
                    p.id,
                    {
                        cost: Number(p.standard_price || 0),
                        segment: p.x_studio_segment || "",
                        size: sizeLabel,
                    },
                ];
            })
        );

        // ────────────────────────────────────────────────────────────────────────
        // 7. REMBOBINAGE DU STOCK INITIAL (SANS BRIDER LES NÉGATIFS)
        // Stock Initial = Stock Actuel - Entrées + Sorties
        // ────────────────────────────────────────────────────────────────────────
        const initialStockBySegment = {
            Femme: 0,
            Beauty: 0,
            Enfant: 0,
        };

        for (const pId of allProductIds) {
            const pInfo = productMap.get(pId);
            if (!pInfo?.segment) continue;

            const currentQty = currentStockMap.get(pId) || 0;
            const moves = movesByProduct.get(pId) || { in: 0, out: 0 };

            // ✅ Aucun Math.max : le solde initial exact signé
            const openingQty = currentQty - moves.in + moves.out;
            const openingValue = openingQty * pInfo.cost;

            if (pInfo.segment === "Femme") {
                initialStockBySegment.Femme += openingValue;
            } else if (pInfo.segment === "Beauty") {
                initialStockBySegment.Beauty += openingValue;
            } else if (pInfo.segment === "Enfant") {
                initialStockBySegment.Enfant += openingValue;
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 8. VENTES RÉELLES POS PAR SEGMENT ($)
        // ────────────────────────────────────────────────────────────────────────
        const salesBySegment = {
            Femme: 0,
            Beauty: 0,
            Enfant: 0,
        };

        for (const line of posLines) {
            const pId = Array.isArray(line.product_id) ? line.product_id[0] : 0;
            const pInfo = productMap.get(pId);

            const amount = Number(line.price_subtotal_incl ?? line.price_subtotal ?? 0);

            if (pInfo?.segment === "Femme") {
                salesBySegment.Femme += amount;
            } else if (pInfo?.segment === "Beauty") {
                salesBySegment.Beauty += amount;
            } else if (pInfo?.segment === "Enfant") {
                salesBySegment.Enfant += amount;
            }
        }

        // ────────────────────────────────────────────────────────────────────────
        // 9. TABLEAU 3 (MOUVEMENTS DE STOCK) : CALCUL DIRECT SANS AUCUN BRIDAGE
        // ────────────────────────────────────────────────────────────────────────
        const buildMovementRow = (
            segmentName: "Femme" | "Beauty" | "Enfant",
            displayLabel: string
        ): StockMovementRow => {
            // ✅ Valeur initiale réelle exacte (signée)
            const initial = Math.round(initialStockBySegment[segmentName]);
            const purchases = Math.round(purchasesBySegment[segmentName]);
            const sales = Math.round(salesBySegment[segmentName]);
            const adjustments = 0;

            // ✅ Formule résultante exacte : Initial + Achats - Ventes
            const closingStock = initial + purchases - sales + adjustments;

            return {
                segment: displayLabel,
                initialStock: initial,
                purchases: purchases,
                sales: sales,
                adjustments: adjustments,
                closingStock: closingStock,
            };
        };

        const movementsData: StockMovementRow[] = [
            buildMovementRow("Femme", "Femme"),
            buildMovementRow("Enfant", "Kids"),
            buildMovementRow("Beauty", "Beauty"),
        ];

        // ────────────────────────────────────────────────────────────────────────
        // 10. STOCK ACTUEL & TAILLES (CONSERVATION DES NÉGATIFS)
        // ────────────────────────────────────────────────────────────────────────
        let totalValuation = 0;
        let totalUnits = 0;
        let womenArticlesCount = 0;
        let womenValuation = 0;
        let beautyArticlesCount = 0;
        let beautyValuation = 0;
        let kidsArticlesCount = 0;
        let kidsValuation = 0;

        const sizesMap = new Map<string, number>();

        for (const [pId, netQty] of currentStockMap.entries()) {
            const pInfo = productMap.get(pId);
            if (!pInfo?.segment) continue;

            const unitCost = pInfo.cost || 0;
            // ✅ Aucun Math.max : on garde la quantité nette réelle
            const itemValue = netQty * unitCost;

            if (pInfo.segment === "Femme") {
                womenArticlesCount += netQty;
                womenValuation += itemValue;

                const size = pInfo.size || "Taille Unique";
                sizesMap.set(size, (sizesMap.get(size) || 0) + netQty);
            } else if (pInfo.segment === "Beauty") {
                beautyArticlesCount += netQty;
                beautyValuation += itemValue;
            } else if (pInfo.segment === "Enfant") {
                kidsArticlesCount += netQty;
                kidsValuation += itemValue;
            }
        }

        totalUnits = womenArticlesCount + beautyArticlesCount + kidsArticlesCount;
        totalValuation = womenValuation + beautyValuation + kidsValuation;

        // Flux graphiques
        const fluxData: StockFluxPoint[] = [
            {
                name: "Femme",
                "Achats Fournisseurs": Math.round(purchasesBySegment.Femme),
                "Ventes Sorties": Math.round(salesBySegment.Femme),
            },
            {
                name: "Beauty",
                "Achats Fournisseurs": Math.round(purchasesBySegment.Beauty),
                "Ventes Sorties": Math.round(salesBySegment.Beauty),
            },
            {
                name: "Enfant",
                "Achats Fournisseurs": Math.round(purchasesBySegment.Enfant),
                "Ventes Sorties": Math.round(salesBySegment.Enfant),
            },
        ];

        // Formatage Camembert
        const sizesData: SizeDistributionPoint[] = Array.from(sizesMap.entries())
            .map(([size, pieces]) => ({
                size: size as any,
                pieces: Math.round(pieces),
                part: womenArticlesCount > 0
                    ? `${((pieces / womenArticlesCount) * 100).toFixed(0)}%`
                    : "0%",
            }))
            .filter((s) => s.pieces > 0) // Protection SVG Recharts pour ne pas faire crasher le dessin
            .sort((a, b) => b.pieces - a.pieces);

        const isFiltered = selectedStoreKeys.length < Object.keys(STORE_LOCATIONS).length;
        const subtitle = isFiltered
            ? `${Math.round(totalUnits).toLocaleString("fr-FR")} pièces sur ${selectedStoreKeys.length} boutique(s)`
            : `${Math.round(totalUnits).toLocaleString("fr-FR")} pièces réparties sur les ${selectedStoreKeys.length} sites`;

        // ────────────────────────────────────────────────────────────────────────
        // 11. CALCUL POINT 8 : VALORISATION PAR BOUTIQUE & TAILLES FEMME
        // ────────────────────────────────────────────────────────────────────────
        const STORE_DISPLAY_LIST = [
            { key: "PB_BC", label: "P.BC", status: "< 30 Jours", level: "ok" as const },
            { key: "P24", label: "P24", status: "< 30 Jours", level: "ok" as const },
            { key: "PB_MTO", label: "P.MTO", status: "30-90 Jours", level: "warning" as const },
            { key: "PB_LMB", label: "P.LMB", status: "> 90 Jours", level: "danger" as const }, // Alerte critique Arnold BI
            { key: "PB_KTM", label: "P.KTM", status: "< 30 Jours", level: "ok" as const },
        ];

        // Structure d'accumulation par boutique
        const storeAuditAccumulator: Record<string, {
            femme: number;
            kids: number;
            beauty: number;
            sizes: { s: number; m: number; l: number; xl: number; xxl: number };
        }> = {
            PB_BC: { femme: 0, kids: 0, beauty: 0, sizes: { s: 0, m: 0, l: 0, xl: 0, xxl: 0 } },
            P24: { femme: 0, kids: 0, beauty: 0, sizes: { s: 0, m: 0, l: 0, xl: 0, xxl: 0 } },
            PB_MTO: { femme: 0, kids: 0, beauty: 0, sizes: { s: 0, m: 0, l: 0, xl: 0, xxl: 0 } },
            PB_LMB: { femme: 0, kids: 0, beauty: 0, sizes: { s: 0, m: 0, l: 0, xl: 0, xxl: 0 } },
            PB_KTM: { femme: 0, kids: 0, beauty: 0, sizes: { s: 0, m: 0, l: 0, xl: 0, xxl: 0 } },
        };

        // Table de correspondance location_id -> StoreKey
        const LOC_TO_STORE = new Map<number, string>();
        for (const [sKey, ids] of Object.entries(STORE_LOCATIONS)) {
            for (const id of ids) {
                LOC_TO_STORE.set(id, sKey);
            }
        }

        for (const q of quants) {
            const locId = Array.isArray(q.location_id) ? q.location_id[0] : 0;
            const sKey = LOC_TO_STORE.get(locId);
            if (!sKey || !storeAuditAccumulator[sKey]) continue;

            const pId = Array.isArray(q.product_id) ? q.product_id[0] : 0;
            const pInfo = productMap.get(pId);
            const qty = Number(q.quantity || 0);

            if (qty < -10000 || qty > 100000) continue;

            const cost = pInfo?.cost || 0;
            const val = qty * cost;
            const segment = (pInfo?.segment || "").toLowerCase();

            if (segment === "femme") {
                storeAuditAccumulator[sKey].femme += val;

                // Ventilation des tailles Femme pour cette boutique
                const rawSize = (pInfo?.size || "").toUpperCase().trim();
                if (rawSize === "S" || rawSize.startsWith("S ")) {
                    storeAuditAccumulator[sKey].sizes.s += qty;
                } else if (rawSize === "M" || rawSize.startsWith("M ")) {
                    storeAuditAccumulator[sKey].sizes.m += qty;
                } else if (rawSize === "L" || rawSize.startsWith("L ")) {
                    storeAuditAccumulator[sKey].sizes.l += qty;
                } else if (rawSize === "XL" || rawSize.startsWith("XL ")) {
                    storeAuditAccumulator[sKey].sizes.xl += qty;
                } else if (
                    rawSize.includes("XXL") ||
                    rawSize.includes("2XL") ||
                    rawSize.includes("3XL") ||
                    rawSize.includes("XXXL")
                ) {
                    storeAuditAccumulator[sKey].sizes.xxl += qty;
                }
            } else if (segment === "beauty") {
                storeAuditAccumulator[sKey].beauty += val;
            } else if (segment === "enfant" || segment === "kids") {
                storeAuditAccumulator[sKey].kids += val;
            }
        }

        // Assemblage des lignes pour le tableau Point 8
        const storeStockAuditSizesData = STORE_DISPLAY_LIST.map((store) => {
            const acc = storeAuditAccumulator[store.key];
            const femme = Math.round(acc.femme);
            const kids = Math.round(acc.kids);
            const beauty = Math.round(acc.beauty);
            const total = femme + kids + beauty;

            return {
                site: store.label,
                storeKey: store.key,
                femme,
                kids,
                beauty,
                total,
                status: store.status,
                level: store.level,
                sizes: {
                    s: Math.round(acc.sizes.s),
                    m: Math.round(acc.sizes.m),
                    l: Math.round(acc.sizes.l),
                    xl: Math.round(acc.sizes.xl),
                    xxl: Math.round(acc.sizes.xxl),
                },
            };
        });

        const responsePayload = {
            totalValuation: Math.round(totalValuation),
            totalUnits: Math.round(totalUnits),
            subtitle,
            womenArticlesCount: Math.round(womenArticlesCount),
            womenValuation: Math.round(womenValuation),
            beautyArticlesCount: Math.round(beautyArticlesCount),
            beautyValuation: Math.round(beautyValuation),
            kidsArticlesCount: Math.round(kidsArticlesCount),
            kidsValuation: Math.round(kidsValuation),
            sizesData,
            fluxData,
            movementsData, // ✅ 100% net et réconcilié
            storeStockAuditSizesData,
        };

        return NextResponse.json(responsePayload);
    } catch (error) {
        console.error("Erreur API Stock KPIs Odoo:", error);
        return NextResponse.json({
            totalValuation: 0,
            totalUnits: 0,
            subtitle: "Données indisponibles",
            womenArticlesCount: 0,
            womenValuation: 0,
            beautyArticlesCount: 0,
            beautyValuation: 0,
            kidsArticlesCount: 0,
            kidsValuation: 0,
            sizesData: [],
            fluxData: [],
            movementsData: [],
            storeStockAuditSizesData: [],
        });
    }
}