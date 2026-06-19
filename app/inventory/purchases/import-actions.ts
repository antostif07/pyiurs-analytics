// app/purchases/import-actions.ts
'use server';

import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { OdooPurchaseOrderOption } from "./_components/purchase-order-selector";

/**
 * Récupère les bons de commande d'Odoo et résout leurs IDs externes (XML IDs)
 */
export async function getOdooPurchaseOrdersForImport(): Promise<OdooPurchaseOrderOption[]> {
    try {
        // 1. Récupération des Bons de commande validés (state: purchase ou done)
        const orders = await odooClient.searchRead<{
            id: number;
            name: string;
            partner_ref: string | boolean;
            partner_id: [number, string] | boolean;
        }>("purchase.order", {
            domain: [["company_id.name", "ilike", "PB - BC"]],
            fields: ["id", "name", "partner_ref", "partner_id"],
            order: "date_order desc",
            limit: 100,
        });

        if (orders.length === 0) return [];

        const orderIds = orders.map(o => o.id);

        // 2. Résolution des IDs externes depuis ir.model.data (Requis pour l'import de relations)
        const externalIds = await odooClient.searchRead<{
            module: string;
            name: string;
            res_id: number;
        }>("ir.model.data", {
            domain: [
                ["model", "=", "purchase.order"],
                ["res_id", "in", orderIds]
            ],
            fields: ["module", "name", "res_id"]
        });

        // Stockage dans une Map pour une association rapide (O(1))
        const extIdMap = new Map<number, string>();
        externalIds.forEach(item => {
            extIdMap.set(item.res_id, `${item.module}.${item.name}`);
        });

        // 3. Assemblage des données au format attendu par le composant de sélection
        return orders.map(order => {
            const supplierId = Array.isArray(order.partner_id) ? order.partner_id[0] : 0;
            const supplierName = Array.isArray(order.partner_id) ? order.partner_id[1] : "Fournisseur inconnu";

            // Récupération de l'ID externe. En cas d'absence, génération d'un ID d'export par défaut
            const extId = extIdMap.get(order.id) || `__export__.purchase_order_${order.id}`;

            return {
                id: order.id,
                name: order.name,
                externalId: extId,
                supplierRef: typeof order.partner_ref === "string" ? order.partner_ref : "",
                supplierId,
                supplierName
            };
        });

    } catch (error) {
        console.error("Erreur lors de la récupération des PO Odoo :", error);
        throw new Error("Impossible de synchroniser les bons de commande d'Odoo.");
    }
}

/**
 * Recherche le dernier produit d'Odoo créé avec un code HS spécifique
 */
export async function getLastProductByHsCode(hsCode: string): Promise<any | null> {
    try {
        const products = await odooClient.searchRead<any>("product.template", {
            domain: [["hs_code", "=", hsCode]],
            fields: [
                "name",
                "categ_id",
                "list_price",
                "standard_price",
                "description_sale",
                "hs_code",
                "x_studio_many2one_field_Arl5D", // Couleur
                "x_studio_many2one_field_21bvh", // Marque
                "x_studio_many2one_field_QyelN", // Taille
                "pos_categ_ids",                  // Many2Many : [ID, ID...]
            ],
            order: "id desc",
            limit: 1,
        });

        if (products.length === 0) return null;

        const prod = products[0];

        // 1. EXTRACTION SÉCURISÉE DES CHAMPS MANY2ONE (Renvoient un tableau [id, name] ou false si vide)
        const categoryName = Array.isArray(prod.categ_id) ? prod.categ_id[1] : "";
        const marque = Array.isArray(prod.x_studio_many2one_field_21bvh) ? prod.x_studio_many2one_field_21bvh[1] : "";
        const couleur = Array.isArray(prod.x_studio_many2one_field_Arl5D) ? prod.x_studio_many2one_field_Arl5D[1] : "";
        const taille = Array.isArray(prod.x_studio_many2one_field_QyelN) ? prod.x_studio_many2one_field_QyelN[1] : "";

        // 2. EXTRACTION DU SEGMENT / FAMILLE (Sécurisation du découpage d'arborescence)
        let famille = "";
        if (categoryName && categoryName.includes("/")) {
            const parts = categoryName.split("/");
            famille = parts[2] ? parts[2].trim() : (parts[1] ? parts[1].trim() : categoryName);
        }

        // 3. RÉSOLUTION DES IDENTIFIANTS DU MANY2MANY (pos_categ_ids)
        let posCategoryName = "";
        if (Array.isArray(prod.pos_categ_ids) && prod.pos_categ_ids.length > 0) {
            // On interroge le modèle pos.category pour obtenir le nom de la première catégorie liée
            const posCategories = await odooClient.searchRead<{ name: string }>("pos.category", {
                domain: [["id", "in", prod.pos_categ_ids]],
                fields: ["name"],
                limit: 1
            });

            if (posCategories.length > 0) {
                posCategoryName = posCategories[0].name;
            }
        }

        // 4. EXTRACTION DE LA DESCRIPTION SANS LES CROCHETS DE CODE ARTICLE
        const cleanedName = prod.name ? `${prod.name.split("[")[0].trim()} [${prod.hs_code || ""}]` : "";
        const description = `${prod.name}`;

        return {
            nom: cleanedName,
            categorie: categoryName,
            prix: prod.list_price || 0,
            pu: prod.standard_price || 0,
            description: description,
            marque: marque,
            famille: famille,
            couleur: couleur,
            taille: taille,
            categorie_article: categoryName,
            categorie_pdv: posCategoryName, // Nom résolu via la table pos.category
            caa: prod.x_studio_caa || 1.0,
            code_fournisseur: prod.x_studio_code_fournisseur || ""
        };
    } catch (error) {
        console.error(`Erreur d'auto-fill sur le Code HS ${hsCode}:`, error);
        return null;
    }
}