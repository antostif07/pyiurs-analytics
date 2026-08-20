"use server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { CategoryItem, InventoryItem, WarehouseItem } from "../types";

export async function getInventoryMetadata(): Promise<InventoryItem> {
    try {
        const warehouses = await odooClient.searchRead<WarehouseItem>(
            "stock.warehouse",
            {
                fields: ["id", "name", "code"],
                domain: [["id", "in", [1, 34, 18, 19, 20, 21, 22, 25, 26]]],
            }
        );

        const categories = await odooClient.searchRead<CategoryItem>(
            "product.category",
            {
                fields: ["id", "name"],
                domain: [["parent_id", "!=", false]], // Filtre pour éviter la catégorie racine "All"
            }
        );

        return {
            warehouses: warehouses || [],
            categories: categories || []
        };
    } catch (error) {
        console.error("[METADATA_ERROR] Erreur récupération métadonnées Odoo:", error);
        return { warehouses: [], categories: [] };
    }
}