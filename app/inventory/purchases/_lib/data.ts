import { processBatchesSequentially, safeSearchRead } from "@/lib/odoo/odoo-safe";
import type {
    IncomingReceipt,
    PurchaseInsight,
    PurchasesData,
    PurchasesKpis,
    ReceiptStatus,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Types Odoo (bruts)
// ─────────────────────────────────────────────────────────────

interface OdooPicking {
    id: number;
    name: string;
    origin: string | false;
    partner_id: [number, string] | false;
    scheduled_date: string | false;
    date_done: string | false;
    state: "draft" | "waiting" | "confirmed" | "assigned" | "done" | "cancel";
    carrier_id: [number, string] | false;
}

interface OdooMove {
    id: number;
    picking_id: [number, string] | false;
    product_uom_qty: number;
    // Odoo 17+: "quantity" — Odoo 16-: "qty_done"
    quantity?: number;
    qty_done?: number;
}

// ─────────────────────────────────────────────────────────────
// Fetch Odoo
// ─────────────────────────────────────────────────────────────

async function getIncomingPickings(limit = 200): Promise<OdooPicking[]> {
    return await safeSearchRead<OdooPicking>("stock.picking", {
        domain: [["picking_type_code", "=", "incoming"]],
        fields: [
            "id",
            "name",
            "origin",
            "partner_id",
            "scheduled_date",
            "date_done",
            "state",
            "carrier_id",
        ],
        limit,
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

// ─────────────────────────────────────────────────────────────
// Transformation
// ─────────────────────────────────────────────────────────────

function computeStatus(
    picking: OdooPicking,
    now: Date,
): ReceiptStatus {
    if (picking.state === "done") return "Done";
    if (picking.state === "assigned") return "Ready";
    if (picking.state === "draft") return "Draft";

    // confirmed / waiting → Late si scheduled_date < now
    if (picking.scheduled_date) {
        const scheduled = new Date(picking.scheduled_date);
        if (scheduled.getTime() < now.getTime()) return "Late";
    }
    return "Waiting";
}

function buildReceipts(
    pickings: OdooPicking[],
    moves: OdooMove[],
): IncomingReceipt[] {
    const now = new Date();

    // Aggregate moves by pickingId
    const byPicking = new Map<
        number,
        { expected: number; received: number }
    >();
    for (const move of moves) {
        if (!Array.isArray(move.picking_id)) continue;
        const pid = move.picking_id[0];
        const expected = Number(move.product_uom_qty ?? 0);
        const received = Number(move.quantity ?? 0);

        const bucket = byPicking.get(pid) ?? { expected: 0, received: 0 };
        bucket.expected += expected;
        bucket.received += received;
        byPicking.set(pid, bucket);
    }

    return pickings.map((p) => {
        const totals = byPicking.get(p.id) ?? { expected: 0, received: 0 };
        const supplier =
            Array.isArray(p.partner_id) ? p.partner_id[1] : "Non défini";
        const carrier =
            Array.isArray(p.carrier_id) ? p.carrier_id[1] : "—";
        const originPO =
            typeof p.origin === "string" && p.origin.trim()
                ? p.origin.trim()
                : "—";

        return {
            pickingId: p.id,
            pickingRef: p.name,
            originPO,
            supplier,
            scheduledDate:
                typeof p.scheduled_date === "string"
                    ? p.scheduled_date
                    : null,
            actualDate:
                typeof p.date_done === "string" ? p.date_done : null,
            carrier,
            totalQtyExpected: totals.expected,
            totalQtyReceived: totals.received,
            status: computeStatus(p, now),
        };
    });
}

function buildKpis(receipts: IncomingReceipt[]): PurchasesKpis {
    const pending = receipts.filter((r) => r.status !== "Done").length;
    const late = receipts.filter((r) => r.status === "Late").length;
    const done = receipts.filter((r) => r.status === "Done").length;

    const totalExpected = receipts.reduce(
        (s, r) => s + r.totalQtyExpected,
        0,
    );
    const totalReceived = receipts.reduce(
        (s, r) => s + r.totalQtyReceived,
        0,
    );
    const receptionRate =
        totalExpected > 0
            ? Math.round((totalReceived / totalExpected) * 100)
            : 0;

    return { pending, late, done, receptionRate };
}

function buildInsights(receipts: IncomingReceipt[]): PurchaseInsight[] {
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
            message:
                "Aucune anomalie logistique détectée sur les réceptions en cours.",
            action: "Voir historique",
        });
    }

    return insights;
}

// ─────────────────────────────────────────────────────────────
// Cache mémoire (5 min)
// ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedData: { data: PurchasesData; timestamp: number } | null = null;
let inflight: Promise<PurchasesData> | null = null;

// ─────────────────────────────────────────────────────────────
// Point d'entrée
// ─────────────────────────────────────────────────────────────

export async function fetchPurchasesData(): Promise<PurchasesData> {
    const now = Date.now();
    if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
        return cachedData.data;
    }
    if (inflight) return inflight;

    inflight = (async () => {
        try {
            const pickings = await getIncomingPickings();
            const pickingIds = pickings.map((p) => p.id);
            const moves = await getPickingMoves(pickingIds);

            const receipts = buildReceipts(pickings, moves);
            const kpis = buildKpis(receipts);
            const insights = buildInsights(receipts);

            const suppliers = Array.from(
                new Set(
                    receipts
                        .map((r) => r.supplier)
                        .filter((s) => s && s !== "Non défini"),
                ),
            ).sort();

            const data: PurchasesData = {
                receipts,
                kpis,
                insights,
                suppliers,
            };

            cachedData = { data, timestamp: Date.now() };
            return data;
        } finally {
            inflight = null;
        }
    })();

    return inflight;
}