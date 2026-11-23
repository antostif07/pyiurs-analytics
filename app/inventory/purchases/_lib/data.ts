import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { processBatchesSequentially, safeSearchRead } from "@/lib/odoo/odoo-safe";
import type {
    IncomingReceipt,
    PurchaseInsight,
    PurchasesData,
    PurchasesFilters,
    PurchasesKpis,
    ReceiptStatus,
} from "./types";

interface OdooPicking {
    id: number;
    name: string;
    origin: string | false;
    partner_id: [number, string] | false;
    scheduled_date: string | false;
    date_done: string | false;
    state: "draft" | "waiting" | "confirmed" | "assigned" | "done" | "cancel";
    carrier_id: [number, string] | false;
    company_id: [number, string] | false;
}

interface OdooMove {
    id: number;
    picking_id: [number, string] | false;
    product_uom_qty: number;
    quantity?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const GLOBAL_ROLES = new Set([
    "admin",
    "controller",
    "inventory-manager",
    "inventory_manager",
]);

async function resolveAllowedCompanyIds(profile: Profile): Promise<number[] | null> {
    if (GLOBAL_ROLES.has(profile.role ?? "") || profile.shop_access_type === "all") {
        return null;
    }

    // Financier : compagnies assignées uniquement
    const directIds = Array.isArray(profile.assigned_companies)
        ? profile.assigned_companies
            .map((c) => Number(c))
            .filter((n) => Number.isFinite(n) && n > 0)
        : [];
    if (directIds.length > 0) {
        return [...new Set(directIds)];
    }

    // Fallback UUID assigned_shops -> shops.odoo_company_id si assigned_companies vide
    const shopUuids = Array.isArray(profile.assigned_shops)
        ? profile.assigned_shops
            .map((s) => String(s).trim())
            .filter((s) => UUID_RE.test(s))
        : [];

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

async function getIncomingPickings(
    allowedCompanyIds: number[] | null,
    filters: PurchasesFilters,
): Promise<OdooPicking[]> {
    const domain: Array<[string, string, unknown]> = [
        ["picking_type_code", "=", "incoming"],
    ];

    if (allowedCompanyIds !== null) {
        domain.push(["company_id", "in", allowedCompanyIds]);
    }
    if (filters.start_date) {
        domain.push(["scheduled_date", ">=", `${filters.start_date} 00:00:00`]);
    }
    if (filters.end_date) {
        domain.push(["scheduled_date", "<=", `${filters.end_date} 23:59:59`]);
    }

    return await safeSearchRead<OdooPicking>("stock.picking", {
        domain,
        fields: [
            "id",
            "name",
            "origin",
            "partner_id",
            "scheduled_date",
            "date_done",
            "state",
            "carrier_id",
            "company_id",
        ],
        limit: filters.start_date || filters.end_date ? 500 : 250,
        order: "scheduled_date desc",
    });
}

async function getPickingMoves(pickingIds: number[]): Promise<OdooMove[]> {
    if (pickingIds.length === 0) return [];

    const BATCH_SIZE = 200;
    const batches: number[][] = [];
    for (let i = 0; i < pickingIds.length; i += BATCH_SIZE) {
        batches.push(pickingIds.slice(i, i + BATCH_SIZE));
    }

    const all = await processBatchesSequentially(batches, async (batch) => {
        return await safeSearchRead<OdooMove>("stock.move", {
            domain: [["picking_id", "in", batch]],
            fields: ["id", "picking_id", "product_uom_qty", "quantity"],
            limit: 5000,
        });
    });

    return all.flat();
}

function computeStatus(picking: OdooPicking, now: Date): ReceiptStatus {
    if (picking.state === "done") return "Done";
    if (picking.state === "assigned") return "Ready";
    if (picking.state === "draft") return "Draft";

    if (picking.scheduled_date) {
        const scheduled = new Date(picking.scheduled_date);
        if (scheduled.getTime() < now.getTime()) return "Late";
    }
    return "Waiting";
}

function buildReceipts(pickings: OdooPicking[], moves: OdooMove[]): IncomingReceipt[] {
    const now = new Date();
    const byPicking = new Map<number, { expected: number; received: number }>();

    for (const move of moves) {
        if (!Array.isArray(move.picking_id)) continue;
        const pid = move.picking_id[0];
        const bucket = byPicking.get(pid) ?? { expected: 0, received: 0 };
        bucket.expected += Number(move.product_uom_qty ?? 0);
        bucket.received += Number(move.quantity ?? 0);
        byPicking.set(pid, bucket);
    }

    return pickings.map((p) => {
        const totals = byPicking.get(p.id) ?? { expected: 0, received: 0 };
        const supplier = Array.isArray(p.partner_id) ? p.partner_id[1] : "Non défini";
        const carrier = Array.isArray(p.carrier_id) ? p.carrier_id[1] : "—";
        const originPO =
            typeof p.origin === "string" && p.origin.trim() ? p.origin.trim() : "—";

        return {
            pickingId: p.id,
            pickingRef: p.name,
            originPO,
            supplier,
            scheduledDate: typeof p.scheduled_date === "string" ? p.scheduled_date : null,
            actualDate: typeof p.date_done === "string" ? p.date_done : null,
            carrier,
            totalQtyExpected: totals.expected,
            totalQtyReceived: totals.received,
            status: computeStatus(p, now),
        };
    });
}

export function buildPurchasesKpis(receipts: IncomingReceipt[]): PurchasesKpis {
    const pending = receipts.filter((r) => r.status !== "Done").length;
    const late = receipts.filter((r) => r.status === "Late").length;
    const done = receipts.filter((r) => r.status === "Done").length;

    const totalExpected = receipts.reduce((s, r) => s + r.totalQtyExpected, 0);
    const totalReceived = receipts.reduce((s, r) => s + r.totalQtyReceived, 0);
    const receptionRate =
        totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

    return { pending, late, done, receptionRate };
}

export function buildPurchasesInsights(receipts: IncomingReceipt[]): PurchaseInsight[] {
    const insights: PurchaseInsight[] = [];

    const lateOnes = receipts.filter((r) => r.status === "Late");
    if (lateOnes.length > 0) {
        const preview = lateOnes
            .slice(0, 3)
            .map((r) => `${r.originPO} (${r.supplier})`)
            .join(", ");
        insights.push({
            type: "critical",
            message: `${lateOnes.length} réception${lateOnes.length > 1 ? "s" : ""} en retard : ${preview}${lateOnes.length > 3 ? "…" : ""}`,
            action: "Contacter transporteurs",
        });
    }

    const largeOnes = receipts.filter(
        (r) => r.totalQtyExpected > 1000 && r.status !== "Done",
    );
    if (largeOnes.length > 0) {
        insights.push({
            type: "warning",
            message: `${largeOnes.length} réception${largeOnes.length > 1 ? "s" : ""} volumineuse${largeOnes.length > 1 ? "s" : ""} (> 1 000 unités) attend${largeOnes.length > 1 ? "ent" : ""} confirmation d'emplacements.`,
            action: "Vérifier emplacements",
        });
    }

    if (insights.length === 0 && receipts.length > 0) {
        insights.push({
            type: "info",
            message: "Aucune anomalie logistique détectée sur les réceptions en cours.",
            action: "Voir historique",
        });
    }

    return insights;
}

// ─── Cache scopé par profil + période sur globalThis (2 min) ──────────────

const g = globalThis as unknown as {
    __invPurchasesCache?: Map<string, { data: PurchasesData; at: number }>;
    __invPurchasesInFlight?: Map<string, Promise<PurchasesData>>;
};
const CACHE_TTL_MS = 2 * 60 * 1000;

export async function fetchPurchasesData(
    filters: PurchasesFilters,
    profile: Profile,
): Promise<PurchasesData> {
    const allowedCompanyIds = await resolveAllowedCompanyIds(profile);

    if (allowedCompanyIds !== null && allowedCompanyIds.length === 0) {
        return {
            receipts: [],
            kpis: { pending: 0, late: 0, done: 0, receptionRate: 0 },
            insights: [],
            suppliers: [],
        };
    }

    const scopeKey =
        allowedCompanyIds === null ? "all" : [...allowedCompanyIds].sort().join(",");
    const cacheKey = `${scopeKey}:${filters.start_date ?? ""}:${filters.end_date ?? ""}`;

    if (!g.__invPurchasesCache) g.__invPurchasesCache = new Map();
    if (!g.__invPurchasesInFlight) g.__invPurchasesInFlight = new Map();

    const cached = g.__invPurchasesCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return applyStatusFilter(cached.data, filters.status);
    }

    let flight = g.__invPurchasesInFlight.get(cacheKey);
    if (!flight) {
        flight = (async () => {
            try {
                const pickings = await getIncomingPickings(allowedCompanyIds, filters);
                const moves = await getPickingMoves(pickings.map((p) => p.id));

                const receipts = buildReceipts(pickings, moves);
                const kpis = buildPurchasesKpis(receipts);
                const insights = buildPurchasesInsights(receipts);
                const suppliers = Array.from(
                    new Set(
                        receipts
                            .map((r) => r.supplier)
                            .filter((s) => s && s !== "Non défini"),
                    ),
                ).sort();

                const data: PurchasesData = { receipts, kpis, insights, suppliers };
                g.__invPurchasesCache!.set(cacheKey, { data, at: Date.now() });
                return data;
            } finally {
                g.__invPurchasesInFlight!.delete(cacheKey);
            }
        })();
        g.__invPurchasesInFlight.set(cacheKey, flight);
    }

    const baseData = await flight;
    return applyStatusFilter(baseData, filters.status);
}

function applyStatusFilter(data: PurchasesData, status: string | null): PurchasesData {
    if (!status || status === "all") return data;
    const filtered = data.receipts.filter((r) => r.status === status);
    return {
        ...data,
        receipts: filtered,
        kpis: buildPurchasesKpis(filtered),
        insights: buildPurchasesInsights(filtered),
    };
}