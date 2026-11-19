import { createClient, getServerAuth } from "@/lib/supabase/server";
import { isControlsRole } from "@/lib/auth/roles";
import type { Profile } from "@/lib/supabase/types";
import { odooClient, type OdooDomain } from "@/lib/odoo/odoo-json2-client";
import type {
    SansCodeFilter,
    SansCodeKpis,
    SansCodeOrderRow,
    SansCodePosRisk,
    SansCodeReportData,
} from "../types";

const SANS_CODE_BARCODES = ["SCBTY", "SCVF142"] as const;

export const EMPTY_SANS_CODE_PAYLOAD: SansCodeReportData = {
    kpis: {
        totalAmount: 0,
        refundedAmount: 0,
        netAmount: 0,
        refundRate: 0,
        totalOrders: 0,
        totalQty: 0,
        topRiskPos: [],
    },
    rows: [],
    posConfigs: [],
};

// ─── Auth & Accès ─────────────────────────────────────────────────────────

export async function requireSansCodeAccess() {
    const auth = await getServerAuth();
    if (!auth.user) {
        return { ok: false as const, status: 401, error: "Non authentifié" };
    }
    if (!auth.profile) {
        return { ok: false as const, status: 403, error: "Profil manquant" };
    }
    if (!isControlsRole(auth.profile.role)) {
        return { ok: false as const, status: 403, error: "Permissions insuffisantes" };
    }

    return { ok: true as const, user: auth.user, profile: auth.profile };
}

function parseNumericIds(json: unknown): number[] {
    if (!Array.isArray(json)) return [];
    const ids: number[] = [];
    for (const item of json) {
        if (typeof item === "number" && Number.isFinite(item) && item > 0) {
            ids.push(item);
        } else if (typeof item === "string" && /^\d+$/.test(item.trim())) {
            ids.push(Number(item.trim()));
        } else if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            const raw = obj.odoo_company_id ?? obj.company_id ?? obj.id;
            if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
                ids.push(raw);
            }
        }
    }
    return [...new Set(ids)];
}

function parseUuidStrings(json: unknown): string[] {
    if (!Array.isArray(json)) return [];
    return json
        .map((x) => {
            if (typeof x === "string") return x;
            if (x && typeof x === "object" && "id" in x) {
                return String((x as { id: unknown }).id);
            }
            return null;
        })
        .filter((s): s is string => typeof s === "string" && s.length > 0);
}

/**
 * - admin, controller, ou shop_access_type === 'all' => null (aucune restriction)
 * - manager => uniquement ses companies (assigned_companies, fallback assigned_shops -> odoo_company_id)
 */
async function resolveAllowedCompanyIds(profile: Profile): Promise<number[] | null> {
    if (
        profile.role === "admin" ||
        profile.role === "controller" ||
        profile.shop_access_type === "all"
    ) {
        return null;
    }

    const directCompanies = parseNumericIds(profile.assigned_companies);
    if (directCompanies.length > 0) {
        return directCompanies;
    }

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

// ─── Cache IDs produits SCBTY / SCVF142 (15 min) ──────────────────────────

let productIdsCache: { ids: number[]; at: number } | null = null;
const PRODUCT_TTL = 15 * 60 * 1000;

async function getSansCodeProductIds(): Promise<number[] | null> {
    if (productIdsCache && Date.now() - productIdsCache.at < PRODUCT_TTL) {
        return productIdsCache.ids;
    }
    try {
        const products = await odooClient.searchRead<{ id: number }>("product.product", {
            domain: [["barcode", "in", [...SANS_CODE_BARCODES]]],
            fields: ["id"],
            limit: 50,
        });
        const ids = products.map((p) => p.id);
        if (ids.length > 0) {
            productIdsCache = { ids, at: Date.now() };
            return ids;
        }
        return null;
    } catch {
        return productIdsCache?.ids ?? null;
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractNoteText(rawNote: unknown): string {
    if (!rawNote || typeof rawNote !== "string") return "";
    const trimmed = rawNote.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed
                    .map((item) => (item && typeof item.text === "string" ? item.text : ""))
                    .filter(Boolean)
                    .join(" ");
            }
            if (parsed && typeof parsed.text === "string") {
                return parsed.text;
            }
        } catch {
            // Fallback texte brut si JSON invalide
        }
    }
    return trimmed;
}

function buildKpis(rows: SansCodeOrderRow[]): SansCodeKpis {
    let totalAmount = 0;
    let refundedAmount = 0;
    let totalQty = 0;

    const posStats = new Map<string, { total: number; refunded: number }>();

    for (const row of rows) {
        totalAmount += row.amountSansCode;
        totalQty += row.qtySansCode;
        if (row.isRefunded) {
            refundedAmount += row.amountSansCode;
        }

        const stat = posStats.get(row.posConfig) ?? { total: 0, refunded: 0 };
        stat.total += row.amountSansCode;
        if (row.isRefunded) stat.refunded += row.amountSansCode;
        posStats.set(row.posConfig, stat);
    }

    const topRiskPos: SansCodePosRisk[] = Array.from(posStats.entries())
        .map(([pos, stat]) => ({
            pos,
            total: stat.total,
            refunded: stat.refunded,
            rate: stat.total > 0 ? (stat.refunded / stat.total) * 100 : 0,
        }))
        .filter((p) => p.refunded > 0)
        .sort((a, b) => b.rate - a.rate || b.refunded - a.refunded)
        .slice(0, 3);

    return {
        totalAmount,
        refundedAmount,
        netAmount: totalAmount - refundedAmount,
        refundRate: totalAmount > 0 ? (refundedAmount / totalAmount) * 100 : 0,
        totalOrders: rows.length,
        totalQty,
        topRiskPos,
    };
}

interface OdooOrderRow {
    id: number;
    config_id: [number, string] | false;
    date_order: string;
    pos_reference: string | false;
    partner_id: [number, string] | false;
    refund_orders_count: number;
}

async function fetchOrdersByIdsChunked(orderIds: number[]): Promise<OdooOrderRow[]> {
    const CHUNK_SIZE = 500;
    const chunks: number[][] = [];
    for (let i = 0; i < orderIds.length; i += CHUNK_SIZE) {
        chunks.push(orderIds.slice(i, i + CHUNK_SIZE));
    }

    const batches = await Promise.all(
        chunks.map((chunk) =>
            odooClient.searchRead<OdooOrderRow>("pos.order", {
                domain: [["id", "in", chunk]],
                fields: [
                    "config_id",
                    "date_order",
                    "pos_reference",
                    "partner_id",
                    "refund_orders_count",
                ],
                limit: chunk.length,
                order: "date_order desc, id desc",
            }),
        ),
    );

    return batches.flat();
}

// ─── Requête principale ───────────────────────────────────────────────────

export async function fetchSansCodeReport(
    filters: SansCodeFilter,
    profile: Profile,
): Promise<SansCodeReportData> {
    const [allowedCompanyIds, productIds] = await Promise.all([
        resolveAllowedCompanyIds(profile),
        getSansCodeProductIds(),
    ]);

    if (allowedCompanyIds !== null && allowedCompanyIds.length === 0) {
        return EMPTY_SANS_CODE_PAYLOAD;
    }

    const lineDomain: OdooDomain = [
        ["order_id.date_order", ">=", `${filters.from} 00:00:00`],
        ["order_id.date_order", "<=", `${filters.to} 23:59:59`],
        ["order_id.state", "in", ["paid", "done", "invoiced"]],
        ["qty", ">", 0],
        productIds && productIds.length > 0
            ? ["product_id", "in", productIds]
            : ["product_id.barcode", "in", [...SANS_CODE_BARCODES]],
    ];

    if (allowedCompanyIds !== null) {
        lineDomain.push(["order_id.company_id", "in", allowedCompanyIds]);
    }

    // 1. Lignes POS sans code uniquement
    const lines = await odooClient.searchRead<{
        id: number;
        order_id: [number, string] | false;
        qty: number;
        price_subtotal_incl: number;
        note: string | false;
    }>("pos.order.line", {
        domain: lineDomain,
        fields: ["order_id", "qty", "price_subtotal_incl", "note"],
        limit: 5000,
    });

    if (!lines.length) {
        return EMPTY_SANS_CODE_PAYLOAD;
    }

    const uniqueOrderIds = [
        ...new Set(
            lines
                .map((l) => (Array.isArray(l.order_id) ? l.order_id[0] : null))
                .filter((id): id is number => id !== null),
        ),
    ];

    if (uniqueOrderIds.length === 0) {
        return EMPTY_SANS_CODE_PAYLOAD;
    }

    // 2. Commandes correspondantes uniquement (chunkées si > 500)
    const orders = await fetchOrdersByIdsChunked(uniqueOrderIds);
    if (!orders.length) {
        return EMPTY_SANS_CODE_PAYLOAD;
    }

    const orderMap = new Map(orders.map((o) => [o.id, o]));
    const rowMap = new Map<number, SansCodeOrderRow>();
    const noteSetMap = new Map<number, Set<string>>();

    for (const line of lines) {
        const orderId = Array.isArray(line.order_id) ? line.order_id[0] : null;
        if (!orderId) continue;

        const order = orderMap.get(orderId);
        if (!order) continue;

        const noteText = extractNoteText(line.note);
        if (noteText) {
            const set = noteSetMap.get(orderId) ?? new Set<string>();
            set.add(noteText);
            noteSetMap.set(orderId, set);
        }

        let row = rowMap.get(orderId);
        if (!row) {
            row = {
                id: String(orderId),
                posConfig: Array.isArray(order.config_id) ? order.config_id[1] : "N/A",
                date: (order.date_order ?? "").split(" ")[0] || "",
                invoiceRef: order.pos_reference || `#${orderId}`,
                note: "",
                clientName: Array.isArray(order.partner_id)
                    ? order.partner_id[1]
                    : "Client de passage",
                qtySansCode: 0,
                amountSansCode: 0,
                isRefunded: Number(order.refund_orders_count ?? 0) > 0,
            };
            rowMap.set(orderId, row);
        }

        row.qtySansCode += Number(line.qty ?? 0);
        row.amountSansCode += Number(line.price_subtotal_incl ?? 0);
    }

    // Tri chronologique décroissant garanti même après chunking
    const allRows = Array.from(rowMap.values())
        .map((r) => {
            const notes = noteSetMap.get(Number(r.id));
            return notes && notes.size > 0
                ? { ...r, note: Array.from(notes).join(" · ") }
                : r;
        })
        .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));

    const posConfigs = Array.from(new Set(allRows.map((r) => r.posConfig))).sort((a, b) =>
        a.localeCompare(b),
    );

    const visibleRows = filters.pos
        ? allRows.filter((r) => r.posConfig === filters.pos)
        : allRows;

    return {
        kpis: buildKpis(visibleRows),
        rows: visibleRows,
        posConfigs,
    };
}