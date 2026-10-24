// app/inventory/stock-femme/_lib/locations.ts
import { createClient } from "@/lib/supabase/server";

export interface ShopLocation {
    /** Nom tel que configuré dans `shops.name` (ex: "P.KTM", "P24") */
    name: string;
    odooLocationId: number;
    sortOrder: number;
}

export interface ShopLocationsConfig {
    /** Liste ordonnée (sort_order, puis name) */
    locations: ShopLocation[];
    /** Map `odoo_location_id` → `shops.name` (source de vérité pour matcher) */
    byOdooId: Map<number, string>;
    /** Liste unique des noms de boutiques (pour générer les colonnes) */
    names: string[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: ShopLocationsConfig | null = null;
let cacheTimestamp = 0;

const EMPTY_CONFIG: ShopLocationsConfig = {
    locations: [],
    byOdooId: new Map(),
    names: [],
};

export async function getShopLocations(): Promise<ShopLocationsConfig> {
    const now = Date.now();
    if (cached && now - cacheTimestamp < CACHE_TTL_MS) {
        return cached;
    }

    try {
        const supabase = await createClient();

        const [shopsRes, locationsRes] = await Promise.all([
            supabase.from("shops").select("id, name").order("odoo_company_id"),
            supabase
                .from("shop_locations")
                .select("odoo_location_id, shop_id, sort_order, is_active")
                .eq("is_active", true),
        ]);

        if (shopsRes.error) throw shopsRes.error;
        if (locationsRes.error) throw locationsRes.error;

        const shopsById = new Map<string, string>();
        (shopsRes.data ?? []).forEach((s) => shopsById.set(s.id, s.name));

        const locations: ShopLocation[] = [];
        const byOdooId = new Map<number, string>();

        (locationsRes.data ?? []).forEach((loc) => {
            const shopName = shopsById.get(loc.shop_id);
            if (!shopName) return;

            locations.push({
                name: shopName,
                odooLocationId: loc.odoo_location_id,
                sortOrder: loc.sort_order ?? 0,
            });
            byOdooId.set(loc.odoo_location_id, shopName);
        });

        locations.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.name.localeCompare(b.name);
        });

        const names = Array.from(
            new Set(locations.map((l) => l.name)),
        );

        const config: ShopLocationsConfig = { locations, byOdooId, names };
        cached = config;
        cacheTimestamp = now;
        return config;
    } catch (e) {
        console.error("[stock-femme] getShopLocations failed:", e);
        return EMPTY_CONFIG;
    }
}