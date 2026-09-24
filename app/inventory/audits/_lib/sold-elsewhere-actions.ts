"use server";

import { createClient } from "@/lib/supabase/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import {
    StockAuditItem,
    OdooLocation,
    OdooCompany,
    OdooWarehouse,
    SoldElsewhereAnalysis,
    SoldElsewhereGroup,
    SoldElsewhereLine,
    SoldElsewhereAction,
    getSoldLocations,
} from "./types";

/* ──────────────────────────────────────────────────────────────────── */
/* INTERFACES ODOO LOCALES                                            */
/* ──────────────────────────────────────────────────────────────────── */

interface OdooPosConfig {
    id: number;
    name: string;
    picking_type_id: [number, string] | false | null;
}

interface OdooPickingType {
    id: number;
    name: string;
    default_location_src_id: [number, string] | false | null;
}

/* ════════════════════════════════════════════════════════════════════ */
/* SERVER ACTION — ANALYSE "VENDUS AILLEURS"                          */
/* ════════════════════════════════════════════════════════════════════ */

/**
 * Analyse les items "vendus ailleurs" d'un audit.
 *
 * LOGIQUE MÉTIER :
 *   - Source du transfert     = stock du shop audité
 *   - Destination du transfert = location négative (où le produit manque)
 *   - Même company             → transfert interne (Internal Transfers)
 *   - Company différente       → vente inter-company (Delivery Order → PO auto)
 *
 * Résolution de la source :
 *   1. Via les POS du shop (odoo_pos_ids → pos.config → picking_type → default_location_src_id)
 *   2. Fallback : 1er stock.warehouse de la company auditée
 */
export async function getSoldElsewhereAnalysisAction(
    auditId: string
): Promise<
    | { success: true; analysis: SoldElsewhereAnalysis }
    | { success: false; error: string }
> {
    try {
        const supabase = await createClient();

        /* ─── 1. Charger l'audit + sa boutique ─── */
        const { data: audit, error: auditErr } = await supabase
            .from("stock_audits")
            .select("id, reference, shop_id, shop_name")
            .eq("id", auditId)
            .single();

        if (auditErr || !audit) {
            return { success: false, error: "Audit introuvable." };
        }

        const { data: shop, error: shopErr } = await supabase
            .from("shops")
            .select("id, name, odoo_company_id, odoo_pos_ids")
            .eq("id", audit.shop_id)
            .single();

        if (shopErr || !shop || !shop.odoo_company_id) {
            return {
                success: false,
                error: "Boutique introuvable ou sans `odoo_company_id`.",
            };
        }

        const auditedCompanyId = shop.odoo_company_id;

        /* ─── 2. Charger les items de l'audit ─── */
        const { data: rawItems, error: itemsErr } = await supabase
            .from("stock_audit_items")
            .select("*")
            .eq("audit_id", auditId);

        if (itemsErr || !rawItems) {
            return { success: false, error: "Impossible de lire les items." };
        }

        const soldElsewhereItems = (rawItems as StockAuditItem[]).filter(
            (i) => getSoldLocations(i).length > 0
        );

        /* Cas vide : aucune analyse à produire */
        if (soldElsewhereItems.length === 0) {
            return {
                success: true,
                analysis: {
                    auditId,
                    auditReference: audit.reference,
                    auditedCompanyId,
                    auditedCompanyName: shop.name,
                    destinationLocationId: 0,
                    destinationLocationName: "",
                    groups: [],
                    totalLines: 0,
                    totalQty: 0,
                    totalValue: 0,
                    unprocessedItems: 0,
                },
            };
        }

        /* ─── 3. Collecter les IDs uniques de locations négatives (destinations) ─── */
        const targetLocationIds = new Set<number>();
        soldElsewhereItems.forEach((item) => {
            getSoldLocations(item).forEach((loc) => {
                const id = typeof loc.id === "number" ? loc.id : Number(loc.id);
                if (Number.isInteger(id) && id > 0) targetLocationIds.add(id);
            });
        });

        /* ─── 4. Récupérer les locations destinations depuis Odoo ─── */
        const targetLocations = await odooClient.searchRead<OdooLocation>(
            "stock.location",
            {
                domain: [["id", "in", Array.from(targetLocationIds)]],
                fields: ["id", "name", "complete_name", "company_id", "usage"],
                limit: targetLocationIds.size,
            }
        );

        const locationMap = new Map<number, OdooLocation>();
        (targetLocations || []).forEach((l) => locationMap.set(l.id, l));

        /* ─── 5. Récupérer toutes les companies concernées ─── */
        const companyIds = new Set<number>([auditedCompanyId]);
        (targetLocations || []).forEach((l) => {
            if (Array.isArray(l.company_id)) companyIds.add(l.company_id[0]);
        });

        const companies = await odooClient.searchRead<OdooCompany>(
            "res.company",
            {
                domain: [["id", "in", Array.from(companyIds)]],
                fields: ["id", "name"],
                limit: companyIds.size,
            }
        );

        const companyMap = new Map<number, string>();
        (companies || []).forEach((c) => companyMap.set(c.id, c.name));

        const auditedCompanyName = companyMap.get(auditedCompanyId) ?? shop.name;

        /* ─── 6. Résoudre la location source = stock du shop audité ─── */
        /* Chaîne : shop.odoo_pos_ids → pos.config → picking_type_id
                    → stock.picking.type.default_location_src_id
           Fallback : 1er stock.warehouse de la company auditée */

        const posIds = Array.isArray(shop.odoo_pos_ids)
            ? (shop.odoo_pos_ids as unknown[]).filter(
                (id): id is number => Number.isInteger(id)
            )
            : [];

        let auditedStockLocationId: number | null = null;
        let auditedStockLocationName = "";

        /* Tentative 1 : via le 1er POS du shop */
        if (posIds.length > 0) {
            const posConfigs = await odooClient.searchRead<OdooPosConfig>(
                "pos.config",
                {
                    domain: [["id", "in", posIds]],
                    fields: ["id", "name", "picking_type_id"],
                    limit: posIds.length,
                }
            );

            const firstPosWithPicking = (posConfigs || []).find((p) =>
                Array.isArray(p.picking_type_id)
            );

            if (
                firstPosWithPicking &&
                Array.isArray(firstPosWithPicking.picking_type_id)
            ) {
                const pickingTypes = await odooClient.searchRead<OdooPickingType>(
                    "stock.picking.type",
                    {
                        domain: [
                            ["id", "=", firstPosWithPicking.picking_type_id[0]],
                        ],
                        fields: ["id", "name", "default_location_src_id"],
                        limit: 1,
                    }
                );

                const pt = (pickingTypes || [])[0];
                if (pt && Array.isArray(pt.default_location_src_id)) {
                    auditedStockLocationId = pt.default_location_src_id[0];
                    auditedStockLocationName = pt.default_location_src_id[1];
                }
            }
        }

        /* Tentative 2 : fallback warehouse de la company */
        if (!auditedStockLocationId) {
            const warehouses = await odooClient.searchRead<OdooWarehouse>(
                "stock.warehouse",
                {
                    domain: [["company_id", "=", auditedCompanyId]],
                    fields: ["id", "name", "code", "company_id", "lot_stock_id"],
                    limit: 1,
                }
            );

            const wh = (warehouses || [])[0];
            if (wh && Array.isArray(wh.lot_stock_id)) {
                auditedStockLocationId = wh.lot_stock_id[0];
                auditedStockLocationName = wh.lot_stock_id[1];
            }
        }

        if (!auditedStockLocationId) {
            return {
                success: false,
                error:
                    "Impossible de déterminer la location de stock du shop audité (ni via POS, ni via warehouse).",
            };
        }

        /* ─── 7. Construire les lignes d'analyse ─── */
        /* SOURCE = notre stock audité / DESTINATION = location négative */
        const lines: SoldElsewhereLine[] = [];
        let unprocessedItems = 0;

        for (const item of soldElsewhereItems) {
            const soldLocs = getSoldLocations(item);
            const cost = Number(item.unit_cost) || 0;
            let itemProcessed = false;

            for (const loc of soldLocs) {
                const locId = typeof loc.id === "number" ? loc.id : Number(loc.id);
                const odooLoc = locationMap.get(locId);

                if (!odooLoc || !Array.isArray(odooLoc.company_id)) continue;

                const targetCompanyId = odooLoc.company_id[0];
                const targetCompanyName =
                    companyMap.get(targetCompanyId) ?? odooLoc.company_id[1];

                const action: SoldElsewhereAction =
                    targetCompanyId === auditedCompanyId
                        ? "internal_transfer"
                        : "inter_company";

                /* Qty = 1 (un scan = un article) */
                const quantity = 1;

                lines.push({
                    itemId: item.id,
                    barcode: item.internal_barcode,
                    productName: item.product_name || "",
                    odooProductId: item.odoo_product_id,
                    unitCost: cost,
                    quantity,

                    /* SOURCE : stock du shop audité */
                    sourceLocationId: auditedStockLocationId,
                    sourceLocationName: auditedStockLocationName,
                    sourceCompanyId: auditedCompanyId,
                    sourceCompanyName: auditedCompanyName,

                    /* DESTINATION : location négative */
                    destinationLocationId: locId,
                    destinationLocationName:
                        odooLoc.complete_name || odooLoc.name,
                    destinationCompanyId: targetCompanyId,
                    destinationCompanyName: targetCompanyName,

                    action,
                });

                itemProcessed = true;
            }

            if (!itemProcessed) unprocessedItems++;
        }

        /* ─── 8. Grouper par (action, company source) ─── */
        const groupMap = new Map<string, SoldElsewhereGroup>();

        for (const line of lines) {
            const key = `${line.action}::${line.sourceCompanyId}`;
            let group = groupMap.get(key);

            if (!group) {
                group = {
                    action: line.action,
                    sourceCompanyId: line.sourceCompanyId,
                    sourceCompanyName: line.sourceCompanyName,
                    destinationCompanyId: line.destinationCompanyId,
                    destinationCompanyName: line.destinationCompanyName,
                    lines: [],
                    totalQty: 0,
                    totalValue: 0,
                };
                groupMap.set(key, group);
            }

            group.lines.push(line);
            group.totalQty += line.quantity;
            group.totalValue += line.quantity * line.unitCost;
        }

        const groups = Array.from(groupMap.values()).sort((a, b) => {
            /* Interne d'abord, puis inter-company par nom de company */
            if (a.action !== b.action) {
                return a.action === "internal_transfer" ? -1 : 1;
            }
            return a.sourceCompanyName.localeCompare(b.sourceCompanyName);
        });

        const analysis: SoldElsewhereAnalysis = {
            auditId,
            auditReference: audit.reference,
            auditedCompanyId,
            auditedCompanyName,
            destinationLocationId: auditedStockLocationId,
            destinationLocationName: auditedStockLocationName,
            groups,
            totalLines: lines.length,
            totalQty: lines.reduce((s, l) => s + l.quantity, 0),
            totalValue: lines.reduce(
                (s, l) => s + l.quantity * l.unitCost,
                0
            ),
            unprocessedItems,
        };

        return { success: true, analysis };
    } catch (err) {
        console.error("[SOLD_ELSEWHERE_ANALYSIS_ERROR]", err);
        return {
            success: false,
            error:
                err instanceof Error
                    ? err.message
                    : "Erreur lors de l'analyse des ventes ailleurs.",
        };
    }
}