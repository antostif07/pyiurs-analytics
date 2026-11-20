import { createClient, getServerAuth } from "@/lib/supabase/server";
import { isControlsRole } from "@/lib/auth/roles";
import type { Profile } from "@/lib/supabase/types";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import { buildDomain } from "@/lib/odoo/domain";
import type {
    RedsupFilter,
    RedsupInvoiceRow,
    RedsupLine,
    RedsupOrderDetails,
    RedsupReportData,
} from "../types";
import { buildRedsupKpis } from "../kpis";

const REDSUP_MATCH = "redsup";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EMPTY_REDSUP_PAYLOAD: RedsupReportData = {
    kpis: {
        totalOrders: 0,
        totalAmount: 0,
        totalQty: 0,
        withPhotoCount: 0,
        validatedCount: 0,
        pendingCount: 0,
    },
    invoices: [],
};

// ─── Auth & Restriction compagnies ────────────────────────────────────────

export async function requireRedsupAccess() {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile) return { ok: false as const, status: 403, error: "Profil manquant" };
    if (!isControlsRole(auth.profile.role)) {
        return { ok: false as const, status: 403, error: "Permissions insuffisantes" };
    }
    return { ok: true as const, user: auth.user, profile: auth.profile };
}

function parseNumericIds(json: unknown): number[] {
    if (!Array.isArray(json)) return [];
    const ids: number[] = [];
    for (const item of json) {
        if (typeof item === "number" && Number.isFinite(item) && item > 0) ids.push(item);
        else if (typeof item === "string" && /^\d+$/.test(item.trim())) ids.push(Number(item.trim()));
        else if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            const raw = obj.odoo_company_id ?? obj.company_id ?? obj.id;
            if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) ids.push(raw);
        }
    }
    return [...new Set(ids)];
}

function parseUuidStrings(json: unknown): string[] {
    if (!Array.isArray(json)) return [];
    return json
        .map((x) =>
            typeof x === "string"
                ? x.trim()
                : x && typeof x === "object" && "id" in x
                    ? String((x as { id: unknown }).id).trim()
                    : null,
        )
        .filter((s): s is string => typeof s === "string" && UUID_RE.test(s));
}

export async function resolveRedsupAllowedCompanies(profile: Profile): Promise<number[] | null> {
    if (
        profile.role === "admin" ||
        profile.role === "controller" ||
        profile.shop_access_type === "all"
    ) {
        return null;
    }

    const directCompanies = parseNumericIds(profile.assigned_companies);
    if (directCompanies.length > 0) return directCompanies;

    const shopUuids = parseUuidStrings(profile.assigned_shops);
    if (shopUuids.length > 0) {
        const supabase = await createClient();
        const { data } = await supabase
            .from("shops")
            .select("odoo_company_id")
            .in("id", shopUuids)
            .not("odoo_company_id", "is", null);

        const resolved = (data ?? [])
            .map((s) => s.odoo_company_id)
            .filter((id): id is number => typeof id === "number" && id > 0);
        return [...new Set(resolved)];
    }

    return [];
}

export async function checkRedsupOrderCompanyAccess(
    odooOrderId: number,
    allowedCompanies: number[] | null,
): Promise<boolean> {
    if (allowedCompanies === null) return true;
    if (allowedCompanies.length === 0) return false;
    const rows = await odooClient.searchRead<{
        id: number;
        company_id: [number, string] | false;
    }>("pos.order", {
        domain: [["id", "=", odooOrderId]],
        fields: ["company_id"],
        limit: 1,
    });
    const compId = Array.isArray(rows[0]?.company_id) ? rows[0].company_id[0] : null;
    return compId !== null && allowedCompanies.includes(compId);
}

// ─── Cache produits RedSup (15 min) ───────────────────────────────────────

let redsupProductsCache: { ids: number[]; at: number } | null = null;
const PRODUCTS_TTL = 15 * 60 * 1000;

async function getRedsupProductIds(): Promise<number[]> {
    if (redsupProductsCache && Date.now() - redsupProductsCache.at < PRODUCTS_TTL) {
        return redsupProductsCache.ids;
    }
    const products = await odooClient.searchRead<{ id: number }>("product.product", {
        domain: [["name", "ilike", `%${REDSUP_MATCH}%`]],
        fields: ["id"],
        limit: 500,
    });
    const ids = products.map((p) => p.id);
    redsupProductsCache = { ids, at: Date.now() };
    return ids;
}

// ─── Helpers DB / Odoo chunkés ────────────────────────────────────────────

interface RedsupValidationJoined {
    odoo_order_id: number;
    validation_photo_path: string | null;
    photo_attached_at: string | null;
    validated_at: string | null;
    photo_attacher: { full_name: string | null } | { full_name: string | null }[] | null;
    validator: { full_name: string | null } | { full_name: string | null }[] | null;
}

async function fetchRedsupValidationsChunked(orderIds: number[]) {
    const supabase = await createClient();
    const CHUNK = 300;
    const chunks: number[][] = [];
    for (let i = 0; i < orderIds.length; i += CHUNK) {
        chunks.push(orderIds.slice(i, i + CHUNK));
    }

    const resList = await Promise.all(
        chunks.map((chunk) =>
            supabase
                .from("redsup_validations")
                .select(
                    "odoo_order_id, validation_photo_path, photo_attached_at, validated_at, photo_attacher:profiles!redsup_validations_photo_attached_by_fkey(full_name), validator:profiles!redsup_validations_validated_by_fkey(full_name)",
                )
                .in("odoo_order_id", chunk),
        ),
    );

    const rows: RedsupValidationJoined[] = [];
    for (const r of resList) {
        if (r.error) console.warn("[REDSUP_SERVICE] validations chunk failed:", r.error.message);
        else if (r.data) rows.push(...(r.data as unknown as RedsupValidationJoined[]));
    }
    return rows;
}

interface OdooPosOrder {
    id: number;
    name: string;
    date_order: string;
    partner_id: [number, string] | false;
    session_id: [number, string] | false;
    state: string;
}

async function fetchOrdersChunked(orderIds: number[]): Promise<OdooPosOrder[]> {
    const CHUNK = 500;
    const chunks: number[][] = [];
    for (let i = 0; i < orderIds.length; i += CHUNK) {
        chunks.push(orderIds.slice(i, i + CHUNK));
    }
    const batches = await Promise.all(
        chunks.map((chunk) =>
            odooClient.searchRead<OdooPosOrder>("pos.order", {
                domain: [["id", "in", chunk]],
                fields: ["name", "date_order", "partner_id", "session_id", "state"],
                limit: chunk.length,
            }),
        ),
    );
    return batches.flat();
}

// ─── Requête principale (légère : uniquement les lignes RedSup) ───────────

export async function fetchRedsupReport(
    filters: RedsupFilter,
    profile: Profile,
): Promise<RedsupReportData> {
    const [allowedCompanyIds, redsupProductIds] = await Promise.all([
        resolveRedsupAllowedCompanies(profile),
        getRedsupProductIds(),
    ]);

    if (allowedCompanyIds !== null && allowedCompanyIds.length === 0) {
        return EMPTY_REDSUP_PAYLOAD;
    }
    if (redsupProductIds.length === 0) {
        return EMPTY_REDSUP_PAYLOAD;
    }

    const redsupLines = await odooClient.searchRead<{
        id: number;
        order_id: [number, string] | false;
        qty: number;
        price_subtotal_incl: number;
    }>("pos.order.line", {
        domain: buildDomain(
            ["product_id", "in", redsupProductIds],
            ["order_id.date_order", ">=", `${filters.from} 00:00:00`],
            ["order_id.date_order", "<=", `${filters.to} 23:59:59`],
            ["order_id.state", "in", ["paid", "done", "invoiced"]],
            allowedCompanyIds !== null
                ? ["order_id.company_id", "in", allowedCompanyIds]
                : null,
        ),
        fields: ["order_id", "qty", "price_subtotal_incl"],
        limit: 5000,
    });

    if (redsupLines.length === 0) {
        return EMPTY_REDSUP_PAYLOAD;
    }

    const redsupAggByOrder = new Map<
        number,
        { totalAmount: number; totalQty: number; lineCount: number }
    >();
    for (const l of redsupLines) {
        const orderId = Array.isArray(l.order_id) ? l.order_id[0] : null;
        if (!orderId) continue;
        const agg = redsupAggByOrder.get(orderId) ?? {
            totalAmount: 0,
            totalQty: 0,
            lineCount: 0,
        };
        agg.totalAmount += Number(l.price_subtotal_incl ?? 0);
        agg.totalQty += Number(l.qty ?? 0);
        agg.lineCount += 1;
        redsupAggByOrder.set(orderId, agg);
    }

    const orderIds = Array.from(redsupAggByOrder.keys());
    if (orderIds.length === 0) return EMPTY_REDSUP_PAYLOAD;

    // Parallélisation Odoo pos.order + Supabase validations
    const [orders, validations] = await Promise.all([
        fetchOrdersChunked(orderIds),
        fetchRedsupValidationsChunked(orderIds),
    ]);

    const validationMap = new Map<
        number,
        {
            hasPhoto: boolean;
            photoAttachedAt: string | null;
            photoAttachedBy: string | null;
            isValidated: boolean;
            validatedAt: string | null;
            validatedBy: string | null;
        }
    >();

    for (const v of validations) {
        const attacherObj = Array.isArray(v.photo_attacher)
            ? v.photo_attacher[0]
            : v.photo_attacher;
        const validatorObj = Array.isArray(v.validator) ? v.validator[0] : v.validator;
        const hasPhoto = Boolean(v.validation_photo_path);
        const isValidated = Boolean(v.validated_at);

        validationMap.set(v.odoo_order_id, {
            hasPhoto,
            photoAttachedAt: v.photo_attached_at ?? null,
            photoAttachedBy: hasPhoto ? (attacherObj?.full_name ?? "—") : null,
            isValidated,
            validatedAt: v.validated_at ?? null,
            validatedBy: isValidated ? (validatorObj?.full_name ?? "—") : null,
        });
    }

    const invoices: RedsupInvoiceRow[] = orders
        .map((order) => {
            const agg = redsupAggByOrder.get(order.id);
            if (!agg) return null;
            const v = validationMap.get(order.id);
            return {
                odooOrderId: order.id,
                orderName: order.name,
                date: (order.date_order ?? "").split(" ")[0] || "",
                partnerName: Array.isArray(order.partner_id) ? order.partner_id[1] : "—",
                posName: Array.isArray(order.session_id) ? order.session_id[1] : "—",
                state: order.state,
                totalRedsupAmount: agg.totalAmount,
                totalRedsupQty: agg.totalQty,
                lineCount: agg.lineCount,
                hasPhoto: v?.hasPhoto ?? false,
                photoAttachedAt: v?.photoAttachedAt ?? null,
                photoAttachedBy: v?.photoAttachedBy ?? null,
                isValidated: v?.isValidated ?? false,
                validatedAt: v?.validatedAt ?? null,
                validatedBy: v?.validatedBy ?? null,
            } satisfies RedsupInvoiceRow;
        })
        .filter((x): x is RedsupInvoiceRow => x !== null)
        .sort((a, b) => b.date.localeCompare(a.date) || b.odooOrderId - a.odooOrderId);

    return {
        kpis: buildRedsupKpis(invoices),
        invoices,
    };
}

// ─── Chargement lazy du détail d'une commande ─────────────────────────────

export async function fetchRedsupOrderDetails(
    odooOrderId: number,
    profile: Profile,
): Promise<RedsupOrderDetails | null> {
    const [allowedCompanies, redsupProductIds] = await Promise.all([
        resolveRedsupAllowedCompanies(profile),
        getRedsupProductIds(),
    ]);

    if (!(await checkRedsupOrderCompanyAccess(odooOrderId, allowedCompanies))) {
        return null;
    }

    const rawLines = await odooClient.searchRead<{
        id: number;
        product_id: [number, string] | false;
        qty: number;
        price_unit: number;
        price_subtotal_incl: number;
    }>("pos.order.line", {
        domain: [["order_id", "=", odooOrderId]],
        fields: ["product_id", "qty", "price_unit", "price_subtotal_incl"],
        limit: 500,
    });

    const redsupSet = new Set(redsupProductIds);
    const allLines: RedsupLine[] = rawLines.map((l) => {
        const productId = Array.isArray(l.product_id) ? l.product_id[0] : 0;
        const productName = Array.isArray(l.product_id) ? l.product_id[1] : "—";
        const isRedsup =
            redsupSet.has(productId) || productName.toLowerCase().includes(REDSUP_MATCH);
        return {
            productId,
            productName,
            qty: Number(l.qty ?? 0),
            unitPrice: Number(l.price_unit ?? 0),
            subtotal: Number(l.price_subtotal_incl ?? 0),
            isRedsup,
        };
    });

    const redsupLines = allLines.filter((l) => l.isRedsup);

    return {
        odooOrderId,
        allLines,
        totalOrderAmount: allLines.reduce((s, l) => s + l.subtotal, 0),
        totalOrderQty: allLines.reduce((s, l) => s + l.qty, 0),
        totalRedsupAmount: redsupLines.reduce((s, l) => s + l.subtotal, 0),
        totalRedsupQty: redsupLines.reduce((s, l) => s + l.qty, 0),
    };
}