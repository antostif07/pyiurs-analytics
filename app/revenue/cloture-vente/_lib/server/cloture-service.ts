import { createClient, getServerAuth } from "@/lib/supabase/server";
import { isRevenueRole } from "@/lib/auth/roles";
import type { Profile } from "@/lib/supabase/types";
import { odooClient, type OdooDomain } from "@/lib/odoo/odoo-json2-client";
import type { ClotureDataView } from "@/lib/cloture-service";
import type {
    ClosingExpenseItem,
    ClosingSaleItem,
    ClotureFilter,
    DailyClosingReport,
    ExistingClosureSummary,
    PaymentBucket,
    ShopOption,
    ShopSegmentRow,
} from "../types";

const EXCLUDED_POS_IDS = [19];
const MATRIX_EXCLUDED_POS_IDS = new Set([9, 11, 21]);
const DEFAULT_EXCHANGE_RATE = 2450.0;

interface AccountMeta {
    id: number;
    name: string;
    code: string;
    category: string | null;
}

type SegmentKey = "femme" | "enfant" | "beauty" | "autres";

// ─── Caches persistants sur globalThis (survivent au HMR) ─────────────────

const g = globalThis as unknown as {
    __cloturePosCache?: { list: ShopOption[]; at: number };
    __cloturePosPromise?: Promise<ShopOption[]>;
    __clotureAccountsMap?: Map<number, AccountMeta>;
    __clotureSegmentMap?: Map<number, SegmentKey>;
    __clotureReportCache?: Map<string, { data: DailyClosingReport; at: number }>;
    __clotureInFlight?: Map<string, Promise<DailyClosingReport>>;
};

const POS_TTL = 15 * 60 * 1000;
const REPORT_TTL = 15 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withOdooRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let delay = 700;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const isRateLimit = msg.includes("429") || msg.includes("Rate limit");
            if (!isRateLimit || attempt === retries) throw err;
            await sleep(delay);
            delay *= 2;
        }
    }
    throw new Error("Odoo retry exhausted");
}

function isGlobalScope(profile: Profile): boolean {
    return (
        profile.role === "admin" ||
        profile.role === "financier" ||
        profile.shop_access_type === "all"
    );
}

// ─── Auth & Restriction Boutiques ─────────────────────────────────────────

export async function requireRevenueClotureAccess() {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile) return { ok: false as const, status: 403, error: "Profil manquant" };
    if (!isRevenueRole(auth.profile.role)) {
        return { ok: false as const, status: 403, error: "Permissions insuffisantes" };
    }
    return { ok: true as const, user: auth.user, profile: auth.profile };
}

function parseAssignedPosIds(profile: Profile): number[] {
    if (!Array.isArray(profile.assigned_shops)) return [];
    const ids = profile.assigned_shops
        .map((s) => Number(String(s).trim()))
        .filter((n) => Number.isFinite(n) && n > 0);
    return [...new Set(ids)];
}

function parseAssignedCompanyIds(profile: Profile): number[] {
    if (!Array.isArray(profile.assigned_companies)) return [];
    const ids = profile.assigned_companies
        .map((c) => Number(c))
        .filter((n) => Number.isFinite(n) && n > 0);
    return [...new Set(ids)];
}

export function filterAllowedShops(allShops: ShopOption[], profile: Profile): ShopOption[] {
    if (isGlobalScope(profile)) {
        return allShops;
    }

    // Priorité stricte aux compagnies du manager
    const companyIds = parseAssignedCompanyIds(profile);
    if (companyIds.length > 0) {
        return allShops.filter(
            (s) => s.companyId !== null && companyIds.includes(s.companyId),
        );
    }

    // Fallback si assigned_companies est vide
    const posIds = parseAssignedPosIds(profile);
    if (posIds.length > 0) {
        return allShops.filter((s) => posIds.includes(s.id));
    }

    return [];
}

// ─── Caches Odoo (pos.config, account.account, product.product) ──────────

async function getAllPosConfigs(): Promise<ShopOption[]> {
    if (g.__cloturePosCache && Date.now() - g.__cloturePosCache.at < POS_TTL) {
        return g.__cloturePosCache.list;
    }
    if (g.__cloturePosPromise) {
        return g.__cloturePosPromise;
    }

    const promise = (async () => {
        try {
            const records = await withOdooRetry(() =>
                odooClient.searchRead<{
                    id: number;
                    name: string;
                    company_id: [number, string] | false;
                }>("pos.config", {
                    domain: [["id", "not in", EXCLUDED_POS_IDS]],
                    fields: ["id", "name", "company_id"],
                    order: "name asc",
                }),
            );

            const list: ShopOption[] = records.map((r) => ({
                id: r.id,
                name: r.name,
                companyId: Array.isArray(r.company_id) ? r.company_id[0] : null,
                companyName: Array.isArray(r.company_id) ? r.company_id[1] : null,
            }));

            g.__cloturePosCache = { list, at: Date.now() };
            return list;
        } finally {
            g.__cloturePosPromise = undefined;
        }
    })();

    g.__cloturePosPromise = promise;
    return promise;
}

async function resolveAccountsForExpenses(
    accountIds: number[],
): Promise<Map<number, AccountMeta>> {
    if (!g.__clotureAccountsMap) g.__clotureAccountsMap = new Map();
    const map = g.__clotureAccountsMap;
    const missing = accountIds.filter((id) => !map.has(id));

    if (missing.length > 0) {
        const rows = await withOdooRetry(() =>
            odooClient.searchRead<{
                id: number;
                name: string;
                code: string;
                x_studio_categorie_compte: string | false;
            }>("account.account", {
                domain: [["id", "in", missing]],
                fields: ["id", "name", "code", "x_studio_categorie_compte"],
                limit: missing.length,
            }),
        );
        for (const a of rows) {
            map.set(a.id, {
                id: a.id,
                name: a.name,
                code: a.code,
                category:
                    typeof a.x_studio_categorie_compte === "string"
                        ? a.x_studio_categorie_compte
                        : null,
            });
        }
    }
    return map;
}

async function resolveSegmentsForProducts(
    productIds: number[],
): Promise<Map<number, SegmentKey>> {
    if (!g.__clotureSegmentMap) g.__clotureSegmentMap = new Map();
    const map = g.__clotureSegmentMap;
    const missing = productIds.filter((id) => !map.has(id));

    if (missing.length > 0) {
        const products = await withOdooRetry(() =>
            odooClient.searchRead<{
                id: number;
                x_studio_segment: string | false;
            }>("product.product", {
                domain: [["id", "in", missing]],
                fields: ["id", "x_studio_segment"],
                limit: missing.length,
            }),
        );
        for (const p of products) {
            map.set(p.id, normalizeSegment(p.x_studio_segment));
        }
    }
    return map;
}

// ─── Helpers métier ───────────────────────────────────────────────────────

function classifyPaymentMethod(methodNameRaw: string): {
    bucket: PaymentBucket;
    label: string;
} {
    const m = methodNameRaw.toLowerCase();
    if (m.includes("esp") || m.includes("cash")) return { bucket: "cash", label: "Espèces" };
    if (m.includes("ban") || m.includes("bank")) return { bucket: "bank", label: "Banque" };
    if (["mobile", "money", "pesa", "airtel", "orange"].some((k) => m.includes(k))) {
        return { bucket: "mobile", label: "Mobile Money" };
    }
    if (m.includes("onl")) return { bucket: "onl", label: "Online" };
    return { bucket: "other", label: methodNameRaw || "Autre" };
}

function normalizeSegment(raw: unknown): SegmentKey {
    const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    if (s === "femme") return "femme";
    if (s === "enfant" || s === "enfants") return "enfant";
    if (s === "beauty" || s.includes("bea")) return "beauty";
    return "autres";
}

function emptyReport(date: string, shop: string, shops: ShopOption[]): DailyClosingReport {
    return {
        date,
        shop,
        exchangeRate: DEFAULT_EXCHANGE_RATE,
        shops,
        kpis: {
            dailySalesTotal: 0,
            totalOrders: 0,
            expensesTotal: 0,
            principalExpensesTotal: 0,
            epargneExpensesTotal: 0,
            expectedCash: 0,
        },
        payments: {
            cash: { total: 0, count: 0 },
            bank: { total: 0, count: 0 },
            mobile: { total: 0, count: 0 },
            onl: { total: 0, count: 0 },
        },
        segmentTotals: { femme: 0, enfant: 0, beauty: 0, autres: 0, total: 0 },
        shopMatrix: [],
        sales: [],
        expenses: [],
        existingClosure: null,
    };
}

// ─── Requête principale du jour ───────────────────────────────────────────

export async function fetchDailyClosingReport(
    filters: ClotureFilter,
    profile: Profile,
    options?: { forceRefresh?: boolean },
): Promise<DailyClosingReport> {
    const allShops = await getAllPosConfigs();
    const availableShops = filterAllowedShops(allShops, profile);

    if (availableShops.length === 0) {
        return emptyReport(filters.date, filters.shop, []);
    }

    let effectiveShopId: number | null = null;
    if (filters.shop !== "all") {
        const parsed = Number(filters.shop);
        if (availableShops.some((s) => s.id === parsed)) {
            effectiveShopId = parsed;
        }
    } else if (availableShops.length === 1) {
        effectiveShopId = availableShops[0].id;
    }

    const allowedPosIds =
        effectiveShopId !== null ? [effectiveShopId] : availableShops.map((s) => s.id);

    const cacheKey = `${filters.date}:${allowedPosIds.join(",")}`;
    if (!g.__clotureReportCache) g.__clotureReportCache = new Map();
    if (!g.__clotureInFlight) g.__clotureInFlight = new Map();

    if (!options?.forceRefresh) {
        const cached = g.__clotureReportCache.get(cacheKey);
        if (cached && Date.now() - cached.at < REPORT_TTL) {
            return cached.data;
        }
    }

    const existingFlight = g.__clotureInFlight.get(cacheKey);
    if (existingFlight) {
        return existingFlight;
    }

    const flight = (async (): Promise<DailyClosingReport> => {
        try {
            const allowedCompanyIds = [
                ...new Set(
                    availableShops
                        .filter((s) => allowedPosIds.includes(s.id) && s.companyId !== null)
                        .map((s) => s.companyId as number),
                ),
            ];

            const startOfDay = `${filters.date} 00:00:00`;
            const endOfDay = `${filters.date} 23:59:59`;

            const orderDomain: OdooDomain = [
                ["date_order", ">=", startOfDay],
                ["date_order", "<=", endOfDay],
                ["state", "in", ["paid", "done", "invoiced"]],
                ["config_id", "in", allowedPosIds],
            ];

            const paymentDomain: OdooDomain = [
                ["payment_date", ">=", startOfDay],
                ["payment_date", "<=", endOfDay],
                ["pos_order_id.state", "in", ["paid", "done", "invoiced"]],
                ["session_id.config_id", "in", allowedPosIds],
            ];

            const expenseDomain: OdooDomain = [
                ["date", "=", filters.date],
                ["state", "in", ["approved", "done", "reported"]],
            ];
            if (allowedCompanyIds.length > 0) {
                expenseDomain.push(["company_id", "in", allowedCompanyIds]);
            }

            const supabase = await createClient();

            // Vague 1 : max 2 appels Odoo + Supabase
            const [orders, rawPayments, closureRes] = await Promise.all([
                withOdooRetry(() =>
                    odooClient.searchRead<{
                        id: number;
                        name: string;
                        amount_total: number;
                        partner_id: [number, string] | false;
                        date_order: string;
                        config_id: [number, string] | false;
                    }>("pos.order", {
                        domain: orderDomain,
                        fields: ["id", "name", "amount_total", "partner_id", "date_order", "config_id"],
                        order: "date_order desc",
                        limit: 3000,
                    }),
                ),
                withOdooRetry(() =>
                    odooClient.searchRead<{
                        id: number;
                        amount: number;
                        payment_method_id: [number, string] | false;
                        pos_order_id: [number, string] | false;
                    }>("pos.payment", {
                        domain: paymentDomain,
                        fields: ["amount", "payment_method_id", "pos_order_id"],
                        limit: 5000,
                    }),
                ),
                effectiveShopId !== null
                    ? supabase
                        .from("cash_closures")
                        .select("id, opening_date, closing_date, closure_status, shop_id, shop_name")
                        .eq("shop_id", effectiveShopId)
                        .lte("opening_date", filters.date)
                        .gte("closing_date", filters.date)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle()
                    : Promise.resolve({ data: null }),
            ]);

            const orderIds = orders.map((o) => o.id);

            // Vague 2 : max 2 appels Odoo (lignes sur orderIds directs + dépenses)
            const [rawLines, rawExpenses] = await Promise.all([
                orderIds.length > 0
                    ? withOdooRetry(() =>
                        odooClient.searchRead<{
                            id: number;
                            order_id: [number, string] | false;
                            product_id: [number, string] | false;
                            qty: number;
                            price_unit: number;
                            discount: number;
                            price_subtotal_incl: number;
                        }>("pos.order.line", {
                            domain: [["order_id", "in", orderIds]],
                            fields: [
                                "order_id",
                                "product_id",
                                "qty",
                                "price_unit",
                                "discount",
                                "price_subtotal_incl",
                            ],
                            limit: 10000,
                        }),
                    )
                    : Promise.resolve([]),
                withOdooRetry(() =>
                    odooClient.searchRead<{
                        id: number;
                        name: string;
                        total_amount: number;
                        date: string;
                        company_id: [number, string] | false;
                        account_id: [number, string] | false;
                        product_id: [number, string] | false;
                        payment_mode: string | false;
                    }>("hr.expense", {
                        domain: expenseDomain,
                        fields: [
                            "id",
                            "name",
                            "total_amount",
                            "date",
                            "company_id",
                            "account_id",
                            "product_id",
                            "payment_mode",
                        ],
                        limit: 1000,
                    }),
                ),
            ]);

            // Vague 3 : uniquement pour les IDs non encore en cache
            const uniqueProductIds = [
                ...new Set(
                    rawLines
                        .map((l) => (Array.isArray(l.product_id) ? l.product_id[0] : null))
                        .filter((id): id is number => id !== null),
                ),
            ];
            const uniqueAccountIds = [
                ...new Set(
                    rawExpenses
                        .map((e) => (Array.isArray(e.account_id) ? e.account_id[0] : null))
                        .filter((id): id is number => id !== null),
                ),
            ];

            const [segmentByProductId, accountsMap] = await Promise.all([
                resolveSegmentsForProducts(uniqueProductIds),
                resolveAccountsForExpenses(uniqueAccountIds),
            ]);

            // 1. Paiements par méthode & par commande
            const payments = {
                cash: { total: 0, count: 0 },
                bank: { total: 0, count: 0 },
                mobile: { total: 0, count: 0 },
                onl: { total: 0, count: 0 },
            };

            const paymentByOrderId = new Map<number, { bucket: PaymentBucket; label: string }>();
            let dailySalesFromPayments = 0;

            for (const p of rawPayments) {
                const methodName = Array.isArray(p.payment_method_id) ? p.payment_method_id[1] : "";
                const classified = classifyPaymentMethod(methodName);
                const amount = Number(p.amount ?? 0);
                dailySalesFromPayments += amount;

                if (classified.bucket !== "other") {
                    payments[classified.bucket].total += amount;
                    payments[classified.bucket].count += 1;
                }

                const orderId = Array.isArray(p.pos_order_id) ? p.pos_order_id[0] : null;
                if (orderId && !paymentByOrderId.has(orderId)) {
                    paymentByOrderId.set(orderId, classified);
                }
            }

            // 2. Matrice Shop × Segment
            const orderShopById = new Map<number, number>();
            for (const o of orders) {
                if (Array.isArray(o.config_id)) orderShopById.set(o.id, o.config_id[0]);
            }

            const matrixMap = new Map<number, ShopSegmentRow>();
            for (const s of availableShops) {
                if (!allowedPosIds.includes(s.id)) continue;
                if (effectiveShopId === null && MATRIX_EXCLUDED_POS_IDS.has(s.id)) continue;
                matrixMap.set(s.id, {
                    shopId: s.id,
                    shopName: s.name,
                    femme: 0,
                    enfant: 0,
                    beauty: 0,
                    autres: 0,
                    total: 0,
                });
            }

            const segmentTotals = { femme: 0, enfant: 0, beauty: 0, autres: 0, total: 0 };

            for (const line of rawLines) {


                const orderId = Array.isArray(line.order_id) ? line.order_id[0] : null;
                const productId = Array.isArray(line.product_id) ? line.product_id[0] : null;
                if (!orderId || !productId) continue;


                const lineAmount =
                    Number(line.discount ?? 0) === 100 ? 0 : line.price_unit * line.qty
                    ;

                const seg = segmentByProductId.get(productId) ?? "autres";
                segmentTotals[seg] += lineAmount;
                segmentTotals.total += lineAmount;


                const shopId = orderShopById.get(orderId);
                if (shopId && matrixMap.has(shopId)) {
                    const row = matrixMap.get(shopId)!;
                    row[seg] += lineAmount;
                    row.total += lineAmount;
                }
            }

            // 3. Liste des ventes (1 ligne par commande pos.order)
            const sales: ClosingSaleItem[] = orders.map((o) => {
                const payInfo = paymentByOrderId.get(o.id) ?? {
                    bucket: "cash" as PaymentBucket,
                    label: "Espèces",
                };
                return {
                    id: o.id,
                    name: o.name,
                    dateOrder: o.date_order,
                    amountTotal: Number(o.amount_total ?? 0),
                    partnerName: Array.isArray(o.partner_id)
                        ? o.partner_id[1]
                        : "Client de passage",
                    shopId: Array.isArray(o.config_id) ? o.config_id[0] : 0,
                    shopName: Array.isArray(o.config_id) ? o.config_id[1] : "—",
                    paymentBucket: payInfo.bucket,
                    paymentMethodLabel: payInfo.label,
                };
            });

            // 4. Dépenses du jour
            let principalExpensesTotal = 0;
            let epargneExpensesTotal = 0;

            const expenses: ClosingExpenseItem[] = rawExpenses.map((e) => {
                const accountId = Array.isArray(e.account_id) ? e.account_id[0] : null;
                const accountMeta = accountId ? accountsMap.get(accountId) : undefined;
                const categoryName = accountMeta?.category || "Dépenses non classées";
                const catLower = categoryName.toLowerCase();
                const isEpargne =
                    catLower.includes("epargne") ||
                    catLower.includes("épargne") ||
                    e.payment_mode === "company_account";

                const amount = Number(e.total_amount ?? 0);
                if (isEpargne) epargneExpensesTotal += amount;
                else principalExpensesTotal += amount;

                return {
                    id: e.id,
                    name: e.name || "Dépense sans libellé",
                    date: e.date,
                    amount,
                    companyId: Array.isArray(e.company_id) ? e.company_id[0] : null,
                    productName: Array.isArray(e.product_id) ? e.product_id[1] : "—",
                    categoryName,
                    isEpargne,
                };
            });

            const expensesTotal = principalExpensesTotal + epargneExpensesTotal;
            const dailySalesTotal =
                dailySalesFromPayments !== 0
                    ? dailySalesFromPayments
                    : sales.reduce((s, o) => s + o.amountTotal, 0);

            const existingClosure: ExistingClosureSummary | null = closureRes?.data
                ? {
                    id: closureRes.data.id,
                    openingDate: closureRes.data.opening_date ?? filters.date,
                    closingDate: closureRes.data.closing_date ?? filters.date,
                    closureStatus: closureRes.data.closure_status ?? "draft",
                    shopId: closureRes.data.shop_id,
                    shopName: closureRes.data.shop_name,
                }
                : null;

            const result: DailyClosingReport = {
                date: filters.date,
                shop: effectiveShopId !== null ? String(effectiveShopId) : "all",
                exchangeRate: DEFAULT_EXCHANGE_RATE,
                shops: availableShops,
                kpis: {
                    dailySalesTotal,
                    totalOrders: sales.length,
                    expensesTotal,
                    principalExpensesTotal,
                    epargneExpensesTotal,
                    expectedCash: payments.cash.total - principalExpensesTotal,
                },
                payments,
                segmentTotals,
                shopMatrix: Array.from(matrixMap.values()),
                sales,
                expenses,
                existingClosure,
            };

            g.__clotureReportCache!.set(cacheKey, { data: result, at: Date.now() });
            return result;
        } finally {
            g.__clotureInFlight!.delete(cacheKey);
        }
    })();

    g.__clotureInFlight.set(cacheKey, flight);
    return flight;
}

// ─── Historique & Détail sécurisés côté serveur ───────────────────────────

export async function fetchCloturesHistory(profile: Profile): Promise<ClotureDataView[]> {
    const supabase = await createClient();
    const unrestricted = isGlobalScope(profile);

    let allowedShopIds: number[] | null = null;
    if (!unrestricted) {
        const allShops = await getAllPosConfigs();
        const allowedShops = filterAllowedShops(allShops, profile);
        if (allowedShops.length === 0) return [];
        allowedShopIds = allowedShops.map((s) => s.id);
    }

    let query = supabase
        .from("cash_closures")
        .select(
            `*, cash_closure_main_cash (*), cash_closure_secondary_cash (*), cash_denominations (*)`,
        )
        .order("closing_date", { ascending: false })
        .limit(100);

    if (allowedShopIds !== null) {
        query = query.in("shop_id", allowedShopIds);
    }

    const { data, error } = await query;
    if (error) {
        console.error("[CLOTURE_HISTORY] error:", error.message);
        return [];
    }
    return (data ?? []) as unknown as ClotureDataView[];
}

export async function fetchClotureDetail(id: string, profile: Profile) {
    const supabase = await createClient();
    const unrestricted = isGlobalScope(profile);

    const { data, error } = await supabase
        .from("cash_closures")
        .select(
            `*, cash_closure_main_cash (*), cash_closure_secondary_cash (*), cash_denominations (*)`,
        )
        .eq("id", id)
        .maybeSingle();

    if (error || !data) return null;

    if (!unrestricted) {
        const allShops = await getAllPosConfigs();
        const allowedShops = filterAllowedShops(allShops, profile);
        if (!allowedShops.some((s) => s.id === data.shop_id)) {
            return null;
        }
    }

    return data;
}