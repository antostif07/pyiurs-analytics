import { createClient, getServerAuth } from "@/lib/supabase/server";
import { canAccessStoreTransfers } from "@/lib/auth/roles";
import type { Profile } from "@/lib/supabase/types";
import { odooClient, type OdooDomain } from "@/lib/odoo/odoo-json2-client";
import type {
    GeneratedPurchaseOrderMeta,
    StoreTransferFilter,
    StoreTransferRow,
    StoreTransfersReportData,
} from "../types";

export const EMPTY_TRANSFERS_PAYLOAD: StoreTransfersReportData = {
    kpis: {
        totalTransfers: 0,
        withPoCount: 0,
        dpOutCount: 0,
        dpInCount: 0,
        validatedCount: 0,
    },
    transfers: [],
};

const g = globalThis as unknown as {
    __transfersCache?: Map<string, { data: StoreTransfersReportData; at: number }>;
    __transfersInFlight?: Map<string, Promise<StoreTransfersReportData>>;
    __hasAutoSaleOrderField?: { value: boolean; at: number };
    __odooCompaniesMap?: { map: Map<number, string>; at: number };
};

const REPORT_TTL = 20 * 1000;
const META_TTL = 60 * 60 * 1000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withOdooRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let delay = 700;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!(msg.includes("429") || msg.includes("Rate limit")) || attempt === retries) {
                throw err;
            }
            await sleep(delay);
            delay *= 2;
        }
    }
    throw new Error("Odoo retry exhausted");
}

export function clearTransfersCache() {
    g.__transfersCache?.clear();
}

export async function requireTransfersAccess() {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile) return { ok: false as const, status: 403, error: "Profil manquant" };
    if (!canAccessStoreTransfers(auth.profile.role)) {
        return { ok: false as const, status: 403, error: "Permissions insuffisantes" };
    }
    return { ok: true as const, user: auth.user, profile: auth.profile };
}

function getAllowedCompanyIdsForManager(profile: Profile): number[] | null {
    if (profile.role !== "manager" || profile.shop_access_type === "all") return null;
    if (!Array.isArray(profile.assigned_companies)) return [];
    return profile.assigned_companies
        .map((c) => Number(c))
        .filter((n) => Number.isFinite(n) && n > 0);
}

async function hasAutoSaleOrderIdField(): Promise<boolean> {
    if (
        g.__hasAutoSaleOrderField &&
        Date.now() - g.__hasAutoSaleOrderField.at < META_TTL
    ) {
        return g.__hasAutoSaleOrderField.value;
    }
    try {
        const res = await withOdooRetry(() =>
            odooClient.searchRead<{ id: number }>("ir.model.fields", {
                domain: [
                    ["model", "=", "purchase.order"],
                    ["name", "=", "auto_sale_order_id"],
                ],
                fields: ["id"],
                limit: 1,
            }),
        );
        const value = res.length > 0;
        g.__hasAutoSaleOrderField = { value, at: Date.now() };
        return value;
    } catch {
        return false;
    }
}

async function getOdooCompanyNamesMap(): Promise<Map<number, string>> {
    if (g.__odooCompaniesMap && Date.now() - g.__odooCompaniesMap.at < META_TTL) {
        return g.__odooCompaniesMap.map;
    }
    const companies = await withOdooRetry(() =>
        odooClient.searchRead<{ id: number; name: string }>("res.company", {
            domain: [],
            fields: ["id", "name"],
            limit: 100,
        }),
    );
    const map = new Map(companies.map((c) => [c.id, c.name]));
    g.__odooCompaniesMap = { map, at: Date.now() };
    return map;
}

interface TransferValidationDbRow {
    odoo_sale_order_id: number;
    dp_out_file_name: string | null;
    dp_out_mime_type: string | null;
    dp_out_uploaded_at: string | null;
    dp_in_file_name: string | null;
    dp_in_mime_type: string | null;
    dp_in_uploaded_at: string | null;
    notes: string | null;
    validated_at: string | null;
    dp_out_user: { full_name: string | null } | { full_name: string | null }[] | null;
    dp_in_user: { full_name: string | null } | { full_name: string | null }[] | null;
    validator: { full_name: string | null } | { full_name: string | null }[] | null;
}

async function fetchTransferValidationsChunked(soIds: number[]) {
    if (soIds.length === 0) return new Map<number, TransferValidationDbRow>();
    const supabase = await createClient();
    const CHUNK = 300;
    const chunks: number[][] = [];
    for (let i = 0; i < soIds.length; i += CHUNK) chunks.push(soIds.slice(i, i + CHUNK));

    const results = await Promise.all(
        chunks.map((chunk) =>
            (supabase as any)
                .from("inter_store_transfer_validations")
                .select(
                    "odoo_sale_order_id, dp_out_file_name, dp_out_mime_type, dp_out_uploaded_at, dp_in_file_name, dp_in_mime_type, dp_in_uploaded_at, notes, validated_at, dp_out_user:profiles!inter_store_transfer_validations_dp_out_uploaded_by_fkey(full_name), dp_in_user:profiles!inter_store_transfer_validations_dp_in_uploaded_by_fkey(full_name), validator:profiles!inter_store_transfer_validations_validated_by_fkey(full_name)",
                )
                .in("odoo_sale_order_id", chunk),
        ),
    );

    const map = new Map<number, TransferValidationDbRow>();
    for (const r of results) {
        if (r.error) console.warn("[TRANSFERS] db fetch failed:", r.error.message);
        else if (Array.isArray(r.data)) {
            for (const row of r.data as TransferValidationDbRow[]) {
                map.set(row.odoo_sale_order_id, row);
            }
        }
    }
    return map;
}

function pickName(rel: { full_name: string | null } | { full_name: string | null }[] | null): string | null {
    if (!rel) return null;
    const obj = Array.isArray(rel) ? rel[0] : rel;
    return obj?.full_name ?? "—";
}

export async function fetchStoreTransfersReport(
    filters: StoreTransferFilter,
    profile: Profile,
    options?: { forceRefresh?: boolean },
): Promise<StoreTransfersReportData> {
    const allowedCompanies = getAllowedCompanyIdsForManager(profile);
    if (allowedCompanies !== null && allowedCompanies.length === 0) {
        return EMPTY_TRANSFERS_PAYLOAD;
    }

    const scopeKey =
        allowedCompanies === null ? "all" : `mgr:${allowedCompanies.join(",")}`;
    const cacheKey = `${filters.from}:${filters.to}:${scopeKey}`;

    if (!g.__transfersCache) g.__transfersCache = new Map();
    if (!g.__transfersInFlight) g.__transfersInFlight = new Map();

    if (!options?.forceRefresh) {
        const cached = g.__transfersCache.get(cacheKey);
        if (cached && Date.now() - cached.at < REPORT_TTL) return cached.data;
    }

    const inFlight = g.__transfersInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const flight = (async (): Promise<StoreTransfersReportData> => {
        try {
            const [hasAutoField, companyNamesMap] = await Promise.all([
                hasAutoSaleOrderIdField(),
                allowedCompanies !== null ? getOdooCompanyNamesMap() : Promise.resolve(new Map<number, string>()),
            ]);

            // 1. Tous les sale.order dont la société fournisseuse est PB - BC
            const soDomain: OdooDomain = [
                ["create_date", ">=", `${filters.from} 00:00:00`],
                ["create_date", "<=", `${filters.to} 23:59:59`],
                ["company_id.name", "ilike", "PB - BC"],
            ];

            const saleOrders = await withOdooRetry(() =>
                odooClient.searchRead<{
                    id: number;
                    name: string;
                    create_date: string;
                    create_uid: [number, string] | false;
                    company_id: [number, string] | false;
                    partner_id: [number, string] | false;
                    client_order_ref: string | false;
                    state: string;
                    amount_total: number;
                    currency_id: [number, string] | false;
                }>("sale.order", {
                    domain: soDomain,
                    fields: [
                        "name",
                        "create_date",
                        "create_uid",
                        "company_id",
                        "partner_id",
                        "client_order_ref",
                        "state",
                        "amount_total",
                        "currency_id",
                    ],
                    order: "create_date desc, id desc",
                    limit: 1000,
                }),
            );

            if (saleOrders.length === 0) {
                g.__transfersCache!.set(cacheKey, { data: EMPTY_TRANSFERS_PAYLOAD, at: Date.now() });
                return EMPTY_TRANSFERS_PAYLOAD;
            }

            const soIds = saleOrders.map((s) => s.id);
            const soNames = saleOrders.map((s) => s.name).filter(Boolean);
            const clientRefs = saleOrders
                .map((s) => (typeof s.client_order_ref === "string" ? s.client_order_ref.trim() : ""))
                .filter(Boolean);

            const poFields = ["name", "origin", "partner_ref", "company_id", "state", "amount_total"];
            if (hasAutoField) poFields.push("auto_sale_order_id");

            // Construire le domaine pour retrouver le purchase.order généré
            const poDomain: OdooDomain = [];
            if (hasAutoField) {
                poDomain.push("|", ["auto_sale_order_id", "in", soIds]);
            }
            if (clientRefs.length > 0) {
                poDomain.push("|", ["name", "in", clientRefs]);
            }
            poDomain.push("|", ["origin", "in", soNames], ["partner_ref", "in", soNames]);

            const [pos, validationMap] = await Promise.all([
                withOdooRetry(() =>
                    odooClient.searchRead<Record<string, unknown>>("purchase.order", {
                        domain: poDomain,
                        fields: poFields,
                        limit: 2000,
                    }),
                ),
                fetchTransferValidationsChunked(soIds),
            ]);

            const poBySoId = new Map<number, GeneratedPurchaseOrderMeta>();
            const poByRef = new Map<string, GeneratedPurchaseOrderMeta>();

            for (const po of pos) {
                const comp = Array.isArray(po.company_id) ? po.company_id : null;
                const meta: GeneratedPurchaseOrderMeta = {
                    id: Number(po.id),
                    name: String(po.name ?? ""),
                    companyId: comp ? Number(comp[0]) : null,
                    companyName: comp ? String(comp[1]) : "—",
                    state: String(po.state ?? ""),
                    amountTotal: Number(po.amount_total ?? 0),
                };

                const autoSo = po.auto_sale_order_id;
                if (Array.isArray(autoSo) && autoSo[0]) {
                    poBySoId.set(Number(autoSo[0]), meta);
                }
                if (typeof po.origin === "string" && po.origin.trim()) {
                    poByRef.set(po.origin.trim(), meta);
                }
                if (typeof po.partner_ref === "string" && po.partner_ref.trim()) {
                    poByRef.set(po.partner_ref.trim(), meta);
                }
                if (meta.name) {
                    poByRef.set(meta.name, meta);
                }
            }

            const allowedCompanyNames =
                allowedCompanies !== null
                    ? allowedCompanies
                        .map((id) => companyNamesMap.get(id)?.toLowerCase())
                        .filter((n): n is string => Boolean(n))
                    : null;

            const allRows: StoreTransferRow[] = [];

            for (const so of saleOrders) {
                const clientRef =
                    typeof so.client_order_ref === "string" ? so.client_order_ref.trim() : "";
                const generatedPo =
                    poBySoId.get(so.id) ??
                    poByRef.get(so.name) ??
                    (clientRef ? poByRef.get(clientRef) ?? null : null);

                const destName = Array.isArray(so.partner_id) ? so.partner_id[1] : "—";

                // Restriction Manager : uniquement les transferts destinés à ses compagnies
                if (allowedCompanies !== null) {
                    const poMatch =
                        generatedPo?.companyId != null &&
                        allowedCompanies.includes(generatedPo.companyId);
                    const partnerMatch =
                        allowedCompanyNames?.some((cn) =>
                            destName.toLowerCase().includes(cn),
                        ) ?? false;
                    if (!poMatch && !partnerMatch) continue;
                }

                const v = validationMap.get(so.id);
                const hasDpOut = Boolean(v?.dp_out_file_name);
                const hasDpIn = Boolean(v?.dp_in_file_name);
                const isValidated = Boolean(v?.validated_at);

                allRows.push({
                    saleOrderId: so.id,
                    saleOrderName: so.name,
                    createdAt: (so.create_date ?? "").split(" ")[0] || "",
                    createdBy: Array.isArray(so.create_uid) ? so.create_uid[1] : "—",
                    supplierCompanyName: Array.isArray(so.company_id) ? so.company_id[1] : "PB - BC",
                    destinationPartnerName: destName,
                    state: so.state,
                    amountTotal: Number(so.amount_total ?? 0),
                    currency: Array.isArray(so.currency_id) ? so.currency_id[1] : "USD",
                    generatedPo,
                    dpOut: hasDpOut
                        ? {
                            fileName: v!.dp_out_file_name!,
                            mimeType: v!.dp_out_mime_type || "application/octet-stream",
                            uploadedAt: v!.dp_out_uploaded_at,
                            uploadedBy: pickName(v!.dp_out_user),
                        }
                        : null,
                    dpIn: hasDpIn
                        ? {
                            fileName: v!.dp_in_file_name!,
                            mimeType: v!.dp_in_mime_type || "application/octet-stream",
                            uploadedAt: v!.dp_in_uploaded_at,
                            uploadedBy: pickName(v!.dp_in_user),
                        }
                        : null,
                    isValidated,
                    validatedAt: v?.validated_at ?? null,
                    validatedBy: isValidated ? pickName(v?.validator ?? null) : null,
                    notes: v?.notes ?? null,
                });
            }

            const result: StoreTransfersReportData = {
                kpis: {
                    totalTransfers: allRows.length,
                    withPoCount: allRows.filter((r) => r.generatedPo !== null).length,
                    dpOutCount: allRows.filter((r) => r.dpOut !== null).length,
                    dpInCount: allRows.filter((r) => r.dpIn !== null).length,
                    validatedCount: allRows.filter((r) => r.isValidated).length,
                },
                transfers: allRows,
            };

            g.__transfersCache!.set(cacheKey, { data: result, at: Date.now() });
            return result;
        } finally {
            g.__transfersInFlight!.delete(cacheKey);
        }
    })();

    g.__transfersInFlight.set(cacheKey, flight);
    return flight;
}