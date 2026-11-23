"use server";

import { odooClient } from "@/lib/odoo/odoo-json2-client";
import type { OdooPurchaseOrderOption } from "./_lib/_components/purchase-order-selector";

export interface OdooOption {
    id: number;
    name: string;
}

export interface LogPurchaseOrderOption extends OdooOption {
    partner_id?: [number, string];
}

const PARTNER_PREFIXES = ["P.FEM", "P.KID", "P.BTY"] as const;

const g = globalThis as unknown as {
    __impPosCache?: { data: OdooPurchaseOrderOption[]; at: number };
    __impLogPosCache?: { data: LogPurchaseOrderOption[]; at: number };
    __impProdCatsCache?: { data: OdooOption[]; at: number };
    __impPosCatsCache?: { data: OdooOption[]; at: number };
};

const PO_TTL = 2 * 60 * 1000;
const CAT_TTL = 30 * 60 * 1000;

export async function getOdooLogPurchaseOrders(
    forceRefresh = false,
): Promise<LogPurchaseOrderOption[]> {
    if (!forceRefresh && g.__impLogPosCache && Date.now() - g.__impLogPosCache.at < PO_TTL) {
        return g.__impLogPosCache.data;
    }
    try {
        const orders = await odooClient.searchRead<LogPurchaseOrderOption>("purchase.order", {
            domain: [["name", "ilike", "LOG"]],
            fields: ["id", "name", "partner_id"],
            order: "name desc",
            limit: 100,
        });
        g.__impLogPosCache = { data: orders, at: Date.now() };
        return orders;
    } catch (error) {
        console.error("Erreur getOdooLogPurchaseOrders :", error);
        return [];
    }
}

export async function getOdooProductCategories(): Promise<OdooOption[]> {
    if (g.__impProdCatsCache && Date.now() - g.__impProdCatsCache.at < CAT_TTL) {
        return g.__impProdCatsCache.data;
    }
    try {
        const categories = await odooClient.searchRead<{
            id: number;
            complete_name: string;
        }>("product.category", {
            fields: ["id", "complete_name"],
            order: "complete_name asc",
            limit: 500,
        });
        const mapped = categories.map((c) => ({ id: c.id, name: c.complete_name }));
        g.__impProdCatsCache = { data: mapped, at: Date.now() };
        return mapped;
    } catch (error) {
        console.error("Erreur getOdooProductCategories :", error);
        return [];
    }
}

export async function getOdooPosCategories(): Promise<OdooOption[]> {
    if (g.__impPosCatsCache && Date.now() - g.__impPosCatsCache.at < CAT_TTL) {
        return g.__impPosCatsCache.data;
    }
    try {
        const categories = await odooClient.searchRead<OdooOption>("pos.category", {
            fields: ["id", "name"],
            order: "name asc",
            limit: 500,
        });
        g.__impPosCatsCache = { data: categories, at: Date.now() };
        return categories;
    } catch (error) {
        console.error("Erreur getOdooPosCategories :", error);
        return [];
    }
}

export async function getOdooPurchaseOrdersForImport(
    forceRefresh = false,
): Promise<OdooPurchaseOrderOption[]> {
    if (!forceRefresh && g.__impPosCache && Date.now() - g.__impPosCache.at < PO_TTL) {
        return g.__impPosCache.data;
    }
    try {
        const orders = await odooClient.searchRead<{
            id: number;
            name: string;
            partner_ref: string | boolean;
            partner_id: [number, string] | boolean;
        }>("purchase.order", {
            domain: [
                ["company_id.name", "ilike", "PB - BC"],
                ...Array(PARTNER_PREFIXES.length - 1).fill("|"),
                ...PARTNER_PREFIXES.map(
                    (prefix) =>
                        ["partner_id.name", "=like", `${prefix}%`] as [string, string, unknown],
                ),
            ],
            fields: ["id", "name", "partner_ref", "partner_id"],
            order: "date_order desc",
            limit: 100,
        });

        if (orders.length === 0) return [];

        const orderIds = orders.map((o) => o.id);
        const externalIds = await odooClient.searchRead<{
            module: string;
            name: string;
            res_id: number;
        }>("ir.model.data", {
            domain: [
                ["model", "=", "purchase.order"],
                ["res_id", "in", orderIds],
            ],
            fields: ["module", "name", "res_id"],
            limit: orderIds.length * 2,
        });

        const extIdMap = new Map<number, string>();
        for (const item of externalIds) {
            extIdMap.set(item.res_id, `${item.module}.${item.name}`);
        }

        const result = orders.map((order) => {
            const supplierId = Array.isArray(order.partner_id) ? order.partner_id[0] : 0;
            const supplierName = Array.isArray(order.partner_id)
                ? order.partner_id[1]
                : "Fournisseur inconnu";
            const extId = extIdMap.get(order.id) || `__export__.purchase_order_${order.id}`;

            return {
                id: order.id,
                name: order.name,
                externalId: extId,
                supplierRef: typeof order.partner_ref === "string" ? order.partner_ref : "",
                supplierId,
                supplierName,
            };
        });

        g.__impPosCache = { data: result, at: Date.now() };
        return result;
    } catch (error) {
        console.error("Erreur lors de la récupération des PO Odoo :", error);
        throw new Error("Impossible de synchroniser les bons de commande d'Odoo.");
    }
}

export async function getLastProductByHsCode(hsCode: string): Promise<any | null> {
    try {
        const [products, posCats] = await Promise.all([
            odooClient.searchRead<any>("product.template", {
                domain: [["hs_code", "=", hsCode]],
                fields: [
                    "name",
                    "categ_id",
                    "list_price",
                    "standard_price",
                    "description_sale",
                    "hs_code",
                    "x_studio_many2one_field_Arl5D",
                    "x_studio_many2one_field_21bvh",
                    "x_studio_many2one_field_QyelN",
                    "pos_categ_ids",
                    "x_studio_caa",
                ],
                order: "id desc",
                limit: 1,
            }),
            getOdooPosCategories(),
        ]);

        if (products.length === 0) return null;

        const prod = products[0];
        const categoryName = Array.isArray(prod.categ_id) ? prod.categ_id[1] : "";
        const marque = Array.isArray(prod.x_studio_many2one_field_21bvh)
            ? prod.x_studio_many2one_field_21bvh[1]
            : "";
        const couleur = Array.isArray(prod.x_studio_many2one_field_Arl5D)
            ? prod.x_studio_many2one_field_Arl5D[1]
            : "";
        const taille = Array.isArray(prod.x_studio_many2one_field_QyelN)
            ? prod.x_studio_many2one_field_QyelN[1]
            : "";

        let famille = "";
        if (categoryName && categoryName.includes("/")) {
            const parts = categoryName.split("/");
            famille = parts[2] ? parts[2].trim() : parts[1] ? parts[1].trim() : categoryName;
        }

        let posCategoryName = "";
        if (Array.isArray(prod.pos_categ_ids) && prod.pos_categ_ids.length > 0) {
            const firstId = prod.pos_categ_ids[0];
            posCategoryName = posCats.find((c) => c.id === firstId)?.name ?? "";
        }

        const baseBeforeBrackets = prod.name
            ? prod.name.split("[")[0].trim()
            : "";
        const hsVal = prod.hs_code || hsCode;
        const cleanedName = baseBeforeBrackets
            ? `${baseBeforeBrackets} [${hsVal}]`
            : `[${hsVal}]`;

        const colonIdx = baseBeforeBrackets.indexOf(":");
        const splitDescription =
            colonIdx !== -1
                ? baseBeforeBrackets.slice(colonIdx + 1).trim()
                : baseBeforeBrackets;

        return {
            nom: cleanedName,
            categorie: categoryName,
            prix: prod.list_price || 0,
            pu: prod.standard_price || 0,
            description: splitDescription,
            marque,
            famille,
            couleur,
            taille,
            categorie_article: categoryName,
            categorie_pdv: posCategoryName,
            caa: prod.x_studio_caa || 1.0,
            code_fournisseur: prod.x_studio_code_fournisseur || "",
        };
    } catch (error) {
        console.error(`Erreur d'auto-fill sur le Code HS ${hsCode}:`, error);
        return null;
    }
}