import { getServerAuth } from "@/lib/supabase/server";
import { isRevenueRole } from "@/lib/auth/roles";
import type { Profile } from "@/lib/supabase/types";
import { odooClient, type OdooDomain } from "@/lib/odoo/odoo-json2-client";
import type {
    BeautyBrandRow,
    BeautyBrandsFilter,
    BeautyBrandsReportData,
    BeautyHsGroupRow,
    BeautyProductRow,
    BeautyShopOption,
    DailySaleMetric,
} from "../types";

const EXCLUDED_POS_ID = 19;

interface BeautyProductMeta {
    id: number;
    name: string;
    hsCode: string;
    brand: string;
}

const g = globalThis as unknown as {
    __beautyPosCache?: { list: BeautyShopOption[]; at: number };
    __beautyProductMetaMap?: Map<number, BeautyProductMeta>;
    __beautyReportCache?: Map<string, { data: BeautyBrandsReportData; at: number }>;
    __beautyInFlight?: Map<string, Promise<BeautyBrandsReportData>>;
};

const POS_TTL = 15 * 60 * 1000;
const REPORT_TTL = 30 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withOdooRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let delay = 700;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const is429 = msg.includes("429") || msg.includes("Rate limit");
            if (!is429 || attempt === retries) throw err;
            await sleep(delay);
            delay *= 2;
        }
    }
    throw new Error("Odoo retry exhausted");
}

// ─── Auth & Scope (admin = tout, financier & manager = compagnies assignées)

export async function requireBeautyBrandsAccess() {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile) return { ok: false as const, status: 403, error: "Profil manquant" };
    if (!isRevenueRole(auth.profile.role)) {
        return { ok: false as const, status: 403, error: "Permissions insuffisantes" };
    }
    return { ok: true as const, user: auth.user, profile: auth.profile };
}

function filterAllowedBoutiques(
    allShops: BeautyShopOption[],
    profile: Profile,
): BeautyShopOption[] {
    if (profile.role === "admin") {
        return allShops;
    }

    const companyIds = Array.isArray(profile.assigned_companies)
        ? profile.assigned_companies
            .map((c) => Number(c))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];

    if (companyIds.length > 0) {
        return allShops.filter(
            (s) => s.companyId !== null && companyIds.includes(s.companyId),
        );
    }

    const posIds = Array.isArray(profile.assigned_shops)
        ? profile.assigned_shops
            .map((s) => Number(String(s).trim()))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];

    if (posIds.length > 0) {
        return allShops.filter((s) => posIds.includes(s.id));
    }

    if (profile.shop_access_type === "all") {
        return allShops;
    }

    return [];
}

// ─── Caches Odoo ──────────────────────────────────────────────────────────

async function getAllBoutiques(): Promise<BeautyShopOption[]> {
    if (g.__beautyPosCache && Date.now() - g.__beautyPosCache.at < POS_TTL) {
        return g.__beautyPosCache.list;
    }
    const records = await withOdooRetry(() =>
        odooClient.searchRead<{
            id: number;
            name: string;
            company_id: [number, string] | false;
        }>("pos.config", {
            domain: [["id", "!=", EXCLUDED_POS_ID]],
            fields: ["id", "name", "company_id"],
            order: "name asc",
        }),
    );

    const list: BeautyShopOption[] = records.map((r) => ({
        id: r.id,
        name: r.name,
        companyId: Array.isArray(r.company_id) ? r.company_id[0] : null,
    }));

    g.__beautyPosCache = { list, at: Date.now() };
    return list;
}

async function resolveBeautyProductMeta(
    productIds: number[],
): Promise<Map<number, BeautyProductMeta>> {
    if (!g.__beautyProductMetaMap) g.__beautyProductMetaMap = new Map();
    const map = g.__beautyProductMetaMap;
    const missing = productIds.filter((id) => !map.has(id));

    if (missing.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < missing.length; i += CHUNK) {
            const chunk = missing.slice(i, i + CHUNK);
            const products = await withOdooRetry(() =>
                odooClient.searchRead<{
                    id: number;
                    name: string;
                    hs_code: string | false;
                    x_studio_many2one_field_21bvh: [number, string] | string | false;
                }>("product.product", {
                    domain: [["id", "in", chunk]],
                    fields: ["id", "name", "hs_code", "x_studio_many2one_field_21bvh"],
                    limit: chunk.length,
                }),
            );

            for (const p of products) {
                let brand = "Autres";
                if (p.x_studio_many2one_field_21bvh) {
                    brand = Array.isArray(p.x_studio_many2one_field_21bvh)
                        ? p.x_studio_many2one_field_21bvh[1]
                        : String(p.x_studio_many2one_field_21bvh);
                }
                map.set(p.id, {
                    id: p.id,
                    name: p.name,
                    hsCode: p.hs_code || "SANS_HS_CODE",
                    brand: brand || "Autres",
                });
            }
        }
    }

    return map;
}

function getMonthRange(month: number, year: number) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDayNum = new Date(year, month, 0).getDate();
    return {
        firstDay: `${year}-${pad(month)}-01`,
        lastDay: `${year}-${pad(month)}-${pad(lastDayNum)}`,
    };
}

function addMetric(
    map: Record<string, DailySaleMetric>,
    date: string,
    amount: number,
    qty: number,
) {
    if (!map[date]) map[date] = { amount: 0, quantity: 0 };
    map[date].amount += amount;
    map[date].quantity += qty;
}

function emptyBeautyReport(
    filters: BeautyBrandsFilter,
    boutiques: BeautyShopOption[],
): BeautyBrandsReportData {
    return {
        filters,
        boutiques,
        brands: [],
        dateRange: [],
        kpis: {
            totalAmount: 0,
            totalQuantity: 0,
            brandCount: 0,
            productCount: 0,
            averagePerBrand: 0,
        },
    };
}

// ─── Requête principale ───────────────────────────────────────────────────

export async function fetchBeautyBrandsReport(
    filters: BeautyBrandsFilter,
    profile: Profile,
    options?: { forceRefresh?: boolean },
): Promise<BeautyBrandsReportData> {
    const allBoutiques = await getAllBoutiques();
    const visibleBoutiques = filterAllowedBoutiques(allBoutiques, profile);

    if (visibleBoutiques.length === 0) {
        return emptyBeautyReport(filters, []);
    }

    let selectedBoutiqueId: number | null = null;
    if (filters.boutique !== "all") {
        const parsed = Number(filters.boutique);
        if (visibleBoutiques.some((b) => b.id === parsed)) {
            selectedBoutiqueId = parsed;
        }
    } else if (visibleBoutiques.length === 1) {
        selectedBoutiqueId = visibleBoutiques[0].id;
    }

    const effectiveFilters: BeautyBrandsFilter = {
        ...filters,
        boutique: selectedBoutiqueId !== null ? String(selectedBoutiqueId) : "all",
    };

    const scopeKey =
        selectedBoutiqueId !== null
            ? String(selectedBoutiqueId)
            : profile.role === "admin"
                ? "admin-all"
                : visibleBoutiques.map((b) => b.id).join(",");

    const cacheKey = `${filters.year}-${filters.month}:${scopeKey}`;
    if (!g.__beautyReportCache) g.__beautyReportCache = new Map();
    if (!g.__beautyInFlight) g.__beautyInFlight = new Map();

    if (!options?.forceRefresh) {
        const cached = g.__beautyReportCache.get(cacheKey);
        if (cached && Date.now() - cached.at < REPORT_TTL) {
            return cached.data;
        }
    }

    const inFlight = g.__beautyInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const flight = (async (): Promise<BeautyBrandsReportData> => {
        try {
            const { firstDay, lastDay } = getMonthRange(filters.month, filters.year);

            const domain: OdooDomain = [
                ["order_id.date_order", ">=", `${firstDay} 00:00:00`],
                ["order_id.date_order", "<=", `${lastDay} 23:59:59`],
                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                ["product_id.x_studio_segment", "ilike", "beauty"],
            ];

            if (selectedBoutiqueId !== null) {
                domain.push(["order_id.config_id", "=", selectedBoutiqueId]);
            } else if (profile.role === "admin") {
                domain.push(["order_id.config_id", "!=", EXCLUDED_POS_ID]);
            } else {
                domain.push([
                    "order_id.config_id",
                    "in",
                    visibleBoutiques.map((b) => b.id),
                ]);
            }

            // 1. Lignes de vente Beauty réelles sur la période
            const lines = await withOdooRetry(() =>
                odooClient.searchRead<{
                    id: number;
                    create_date: string;
                    product_id: [number, string] | false;
                    qty: number;
                    price_subtotal_incl: number;
                }>("pos.order.line", {
                    domain,
                    fields: ["create_date", "product_id", "qty", "price_subtotal_incl"],
                    order: "create_date asc",
                    limit: 30000,
                }),
            );

            if (lines.length === 0) {
                const empty = emptyBeautyReport(effectiveFilters, visibleBoutiques);
                g.__beautyReportCache!.set(cacheKey, { data: empty, at: Date.now() });
                return empty;
            }

            // 2. Métadonnées des produits réellement vendus (incrémental sur cache)
            const soldProductIds = [
                ...new Set(
                    lines
                        .map((l) => (Array.isArray(l.product_id) ? l.product_id[0] : null))
                        .filter((id): id is number => id !== null),
                ),
            ];
            const productMap = await resolveBeautyProductMeta(soldProductIds);

            const brandsMap = new Map<string, BeautyBrandRow>();
            const hsGroupMap = new Map<string, BeautyHsGroupRow>();
            const prodRowMap = new Map<string, BeautyProductRow>();
            const dateSet = new Set<string>();

            for (const line of lines) {
                if (!Array.isArray(line.product_id)) continue;
                const [pId, fallbackName] = line.product_id;

                // Fallback si produit archivé non retourné par product.product
                const meta = productMap.get(pId) ?? {
                    id: pId,
                    name: fallbackName || `Produit #${pId}`,
                    hsCode: "SANS_HS_CODE",
                    brand: "Autres",
                };

                const date = (line.create_date ?? "").split(" ")[0];
                if (!date) continue;
                dateSet.add(date);

                const qty = Number(line.qty ?? 0);
                const amount = Number(line.price_subtotal_incl ?? 0);

                // 1. Marque
                const brandId = `brand-${meta.brand}`;
                let brandRow = brandsMap.get(brandId);
                if (!brandRow) {
                    brandRow = {
                        id: brandId,
                        name: meta.brand,
                        totalAmount: 0,
                        totalQuantity: 0,
                        dailySales: {},
                        hsGroups: [],
                    };
                    brandsMap.set(brandId, brandRow);
                }
                brandRow.totalAmount += amount;
                brandRow.totalQuantity += qty;
                addMetric(brandRow.dailySales, date, amount, qty);

                // 2. Gamme (HS Code)
                const hsKey = `${brandId}::${meta.hsCode}`;
                let hsRow = hsGroupMap.get(hsKey);
                if (!hsRow) {
                    const cleanName = meta.name.split("(")[0].trim();
                    hsRow = {
                        id: hsKey,
                        name: `${cleanName} (${meta.hsCode})`,
                        hsCode: meta.hsCode,
                        totalAmount: 0,
                        totalQuantity: 0,
                        dailySales: {},
                        products: [],
                    };
                    hsGroupMap.set(hsKey, hsRow);
                    brandRow.hsGroups.push(hsRow);
                }
                hsRow.totalAmount += amount;
                hsRow.totalQuantity += qty;
                addMetric(hsRow.dailySales, date, amount, qty);

                // 3. Produit
                const prodKey = `${hsKey}::${pId}`;
                let prodRow = prodRowMap.get(prodKey);
                if (!prodRow) {
                    prodRow = {
                        id: prodKey,
                        name: meta.name,
                        totalAmount: 0,
                        totalQuantity: 0,
                        dailySales: {},
                    };
                    prodRowMap.set(prodKey, prodRow);
                    hsRow.products.push(prodRow);
                }
                prodRow.totalAmount += amount;
                prodRow.totalQuantity += qty;
                addMetric(prodRow.dailySales, date, amount, qty);
            }

            const brands = Array.from(brandsMap.values())
                .map((b) => ({
                    ...b,
                    hsGroups: b.hsGroups
                        .map((h) => ({
                            ...h,
                            products: h.products.sort((x, y) => y.totalAmount - x.totalAmount),
                        }))
                        .sort((x, y) => y.totalAmount - x.totalAmount),
                }))
                .sort((a, b) => b.totalAmount - a.totalAmount);

            const totalAmount = brands.reduce((s, b) => s + b.totalAmount, 0);
            const totalQuantity = brands.reduce((s, b) => s + b.totalQuantity, 0);

            const result: BeautyBrandsReportData = {
                filters: effectiveFilters,
                boutiques: visibleBoutiques,
                brands,
                dateRange: Array.from(dateSet).sort(),
                kpis: {
                    totalAmount,
                    totalQuantity,
                    brandCount: brands.length,
                    productCount: soldProductIds.length,
                    averagePerBrand: brands.length > 0 ? totalAmount / brands.length : 0,
                },
            };

            g.__beautyReportCache!.set(cacheKey, { data: result, at: Date.now() });
            return result;
        } finally {
            g.__beautyInFlight!.delete(cacheKey);
        }
    })();

    g.__beautyInFlight.set(cacheKey, flight);
    return flight;
}