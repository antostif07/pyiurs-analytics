// app/inventory/rebalancing/_lib/fetch-rebalancing.ts
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
    RebalancingRow,
    RebalancingSource,
} from "./types";

interface ShopWithLocations {
    id: string;
    name: string;
    odoo_company_id: number | null;
    shop_locations: Array<{
        id: string;
        odoo_location_id: number;
        odoo_location_name: string;
        is_active: boolean;
    }> | null;
}

export interface RebalancingData {
    rows: RebalancingRow[];
    shopsWithoutLocations: { id: string; name: string }[];
    odooCompanyId: number;
    shopId: string;
    shopName: string;
}

async function fetchLocationMeta(ids: number[]) {
    const map = new Map<
        number,
        { name: string; complete_name: string | null }
    >();
    if (ids.length === 0) return map;

    const locs = await odooClient.searchRead<{
        id: number;
        name: string;
        complete_name: string | false;
    }>("stock.location", {
        domain: [["id", "in", ids]],
        fields: ["name", "complete_name"],
        limit: ids.length,
    });

    for (const l of locs) {
        map.set(l.id, {
            name: l.name,
            complete_name:
                typeof l.complete_name === "string"
                    ? l.complete_name
                    : null,
        });
    }
    return map;
}

export async function fetchRebalancingData(
    supabase: SupabaseClient,
    shopId: string,
): Promise<RebalancingData> {
    // ─── 1. Selected shop (pour récupérer son odoo_company_id) ──
    const { data: selectedShops, error: shopErr } = await supabase
        .from("shops")
        .select("id, name, odoo_company_id")
        .eq("id", shopId)
        .limit(1);

    if (shopErr) throw new Error(shopErr.message);

    const selectedShop = (selectedShops ?? [])[0];
    if (!selectedShop) {
        throw new Error(`Shop introuvable: ${shopId}`);
    }
    if (selectedShop.odoo_company_id == null) {
        throw new Error(
            `Shop ${selectedShop.name} n'a pas de odoo_company_id configuré`,
        );
    }

    const odooCompanyId = selectedShop.odoo_company_id;

    // ─── 2. Toutes les boutiques + locations de la MÊME compagnie
    //        (utile pour identifier les sources et lister les shops
    //         sans emplacement, mais les négatifs seront scopés) ──
    const { data: shops, error: shopsErr } = await supabase
        .from("shops")
        .select(`
            id, name, odoo_company_id,
            shop_locations ( id, odoo_location_id, odoo_location_name, is_active )
        `)
        .eq("odoo_company_id", odooCompanyId);

    if (shopsErr) throw new Error(shopsErr.message);

    const shopsWithLocations = ((shops ?? []) as ShopWithLocations[]).map((s) => ({
        id: s.id,
        name: s.name,
        locations: (s.shop_locations ?? []).filter((l) => l.is_active),
    }));

    const shopsWithoutLocations = shopsWithLocations
        .filter((s) => s.locations.length === 0)
        .map((s) => ({ id: s.id, name: s.name }));

    // Locations du shop sélectionné → pour les NÉGATIFS uniquement
    const selectedShopEntry = shopsWithLocations.find((s) => s.id === shopId);
    const selectedLocationIds: number[] =
        selectedShopEntry?.locations.map((l) => l.odoo_location_id) ?? [];

    // Map location → shop pour TOUTES les boutiques de la compagnie
    // (utile pour tagger correctement les sources internes)
    const locationToShop = new Map<
        number,
        { shopId: string; shopName: string }
    >();
    for (const shop of shopsWithLocations) {
        for (const loc of shop.locations) {
            locationToShop.set(loc.odoo_location_id, {
                shopId: shop.id,
                shopName: shop.name,
            });
        }
    }

    if (selectedLocationIds.length === 0) {
        return {
            rows: [],
            shopsWithoutLocations,
            odooCompanyId,
            shopId: selectedShop.id,
            shopName: selectedShop.name,
        };
    }

    // ─── 3. Négatifs = SEULEMENT les locations du shop sélectionné ──
    const quants = await odooClient.searchRead<{
        id: number;
        product_id: [number, string] | false;
        location_id: [number, string] | false;
        quantity: number;
    }>("stock.quant", {
        domain: [
            ["location_id", "in", selectedLocationIds],
            ["quantity", "<", 0],
            ["product_id.active", "=", true],
        ],
        fields: ["product_id", "location_id", "quantity"],
        limit: 5000,
        order: "product_id asc, quantity asc",
    });

    if (quants.length === 0) {
        return {
            rows: [],
            shopsWithoutLocations,
            odooCompanyId,
            shopId: selectedShop.id,
            shopName: selectedShop.name,
        };
    }

    // ─── 4. Produits + locations (batch, inchangé) ─────────────
    const productIds = [
        ...new Set(
            quants
                .map((q) =>
                    Array.isArray(q.product_id) ? q.product_id[0] : null,
                )
                .filter((v): v is number => v !== null),
        ),
    ];

    const [products, destLocMeta] = await Promise.all([
        odooClient.searchRead<{
            id: number;
            barcode: string | false;
            default_code: string | false;
            standard_price: number;
            list_price: number;
        }>("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["barcode", "default_code", "standard_price", "list_price"],
            limit: productIds.length,
        }),
        fetchLocationMeta(
            [
                ...new Set(
                    quants
                        .map((q) =>
                            Array.isArray(q.location_id)
                                ? q.location_id[0]
                                : null,
                        )
                        .filter((v): v is number => v !== null),
                ),
            ],
        ),
    ]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    // ─── 5. Sources positives (inchangé — toutes compagnies) ────
    const positiveQuants = await odooClient.searchRead<{
        id: number;
        product_id: [number, string] | false;
        location_id: [number, string] | false;
        quantity: number;
        company_id: [number, string] | false;
    }>("stock.quant", {
        domain: [
            ["product_id", "in", productIds],
            ["location_id.usage", "=", "internal"],
            ["quantity", ">", 0],
        ],
        fields: ["product_id", "location_id", "quantity", "company_id"],
        limit: 10000,
        order: "quantity desc",
    });

    const positiveLocationIds = [
        ...new Set(
            positiveQuants
                .map((q) =>
                    Array.isArray(q.location_id) ? q.location_id[0] : null,
                )
                .filter((v): v is number => v !== null),
        ),
    ];
    const sourceLocMeta = await fetchLocationMeta(positiveLocationIds);

    const sourcesByProduct = new Map<number, RebalancingSource[]>();

    for (const q of positiveQuants) {
        if (
            !Array.isArray(q.product_id) ||
            !Array.isArray(q.location_id) ||
            !Array.isArray(q.company_id)
        ) {
            continue;
        }

        const productId = q.product_id[0];
        const locationId = q.location_id[0];
        const locationOdooName = q.location_id[1];
        const companyIdSrc = q.company_id[0];
        const companyName = q.company_id[1];
        const quantity = Number(q.quantity ?? 0);

        if (quantity <= 0) continue;

        const shopInfo = locationToShop.get(locationId);
        const locMeta = sourceLocMeta.get(locationId);

        const list = sourcesByProduct.get(productId) ?? [];
        list.push({
            quantId: q.id,
            locationId,
            locationName: locMeta?.name ?? locationOdooName,
            locationCompleteName: locMeta?.complete_name ?? null,
            companyId: companyIdSrc,
            companyName,
            shopId: shopInfo?.shopId ?? null,
            shopName: shopInfo?.shopName ?? null,
            quantity,
            isConfigured: shopInfo !== undefined,
        });
        sourcesByProduct.set(productId, list);
    }

    for (const [, list] of sourcesByProduct) {
        list.sort((a, b) => {
            if (a.isConfigured !== b.isConfigured) {
                return a.isConfigured ? -1 : 1;
            }
            return b.quantity - a.quantity;
        });
    }

    // ─── 6. Mapping final (inchangé) ────────────────────────────
    const rows: RebalancingRow[] = [];

    for (const q of quants) {
        if (!Array.isArray(q.product_id) || !Array.isArray(q.location_id)) {
            continue;
        }

        const productId = q.product_id[0];
        const productName = q.product_id[1];
        const locationId = q.location_id[0];
        const locationName = q.location_id[1];
        const quantity = Number(q.quantity ?? 0);

        if (quantity >= 0) continue;

        const shopInfo = locationToShop.get(locationId);
        const prodInfo = productMap.get(productId);
        const destLoc = destLocMeta.get(locationId);

        const rawBarcode = prodInfo?.barcode || prodInfo?.default_code || null;
        const barcode =
            typeof rawBarcode === "string" && rawBarcode.trim()
                ? rawBarcode.trim()
                : null;

        let unitCost = Number(prodInfo?.standard_price ?? 0);
        if (!unitCost || unitCost <= 0) {
            unitCost = Number(prodInfo?.list_price ?? 0) * 0.4;
        }

        const sources = (sourcesByProduct.get(productId) ?? []).filter(
            (s) => s.locationId !== locationId,
        );

        rows.push({
            quantId: q.id,
            odooProductId: productId,
            productName,
            barcode,
            locationId,
            locationName: destLoc?.name ?? locationName,
            locationCompleteName: destLoc?.complete_name ?? null,
            shopId: shopInfo?.shopId ?? null,
            shopName: shopInfo?.shopName ?? null,
            quantity,
            unitCost,
            listPrice: Number(prodInfo?.list_price ?? 0),
            value: quantity * unitCost,
            sources,
        });
    }

    return {
        rows,
        shopsWithoutLocations,
        odooCompanyId,
        shopId: selectedShop.id,
        shopName: selectedShop.name,
    };
}