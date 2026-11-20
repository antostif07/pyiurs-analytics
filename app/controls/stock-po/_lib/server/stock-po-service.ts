import { getServerAuth } from "@/lib/supabase/server";
import { canAccessStockPo, canEditStockPo } from "@/lib/auth/roles";
import { odooClient, type OdooDomain } from "@/lib/odoo/odoo-json2-client";
import type {
    StockPickingItem,
    StockPoAttachmentMeta,
    StockPoFilter,
    StockPoReportData,
    StockPoRow,
} from "../types";

export const STOCK_PO_FILE_FIELDS = [
    "x_studio_fichier_excel_ca",
    "x_studio_facture_fournisseur",
] as const;

export type StockPoFileField = (typeof STOCK_PO_FILE_FIELDS)[number];

export const EMPTY_STOCK_PO_PAYLOAD: StockPoReportData = {
    kpis: {
        totalOrders: 0,
        withExcelCaCount: 0,
        withInvoiceCount: 0,
        totalPickings: 0,
        donePickings: 0,
    },
    orders: [],
};

const g = globalThis as unknown as {
    __stockPoCache?: Map<string, { data: StockPoReportData; at: number }>;
    __stockPoInFlight?: Map<string, Promise<StockPoReportData>>;
};
const REPORT_TTL = 20 * 1000;
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

export async function requireStockPoAccess() {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile) return { ok: false as const, status: 403, error: "Profil manquant" };
    if (!canAccessStockPo(auth.profile.role)) {
        return { ok: false as const, status: 403, error: "Accès refusé à Stock PO" };
    }
    return {
        ok: true as const,
        user: auth.user,
        profile: auth.profile,
        canEdit: canEditStockPo(auth.profile.role),
    };
}

export async function fetchStockPoReport(
    filters: StockPoFilter,
    options?: { forceRefresh?: boolean },
): Promise<StockPoReportData> {
    const cacheKey = `${filters.from}:${filters.to}:${filters.supplierPrefix}`;
    if (!g.__stockPoCache) g.__stockPoCache = new Map();
    if (!g.__stockPoInFlight) g.__stockPoInFlight = new Map();

    if (!options?.forceRefresh) {
        const cached = g.__stockPoCache.get(cacheKey);
        if (cached && Date.now() - cached.at < REPORT_TTL) {
            return cached.data;
        }
    }

    const inFlight = g.__stockPoInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const flight = (async (): Promise<StockPoReportData> => {
        try {
            const domain: OdooDomain = [
                ["create_date", ">=", `${filters.from} 00:00:00`],
                ["create_date", "<=", `${filters.to} 23:59:59`],
            ];

            if (filters.supplierPrefix === "P.BTY") {
                domain.push(["partner_id.name", "=ilike", "P.BTY%"]);
            } else if (filters.supplierPrefix === "P.FEM") {
                domain.push(["partner_id.name", "=ilike", "P.FEM%"]);
            } else {
                domain.push(
                    "|",
                    ["partner_id.name", "=ilike", "P.BTY%"],
                    ["partner_id.name", "=ilike", "P.FEM%"],
                );
            }

            // 1. Récupération des purchase.order (sans champs Binary base64 lourds)
            const pos = await withOdooRetry(() =>
                odooClient.searchRead<{
                    id: number;
                    name: string;
                    create_date: string;
                    create_uid: [number, string] | false;
                    partner_id: [number, string] | false;
                    state: string;
                    amount_total: number;
                    currency_id: [number, string] | false;
                }>("purchase.order", {
                    domain,
                    fields: [
                        "name",
                        "create_date",
                        "create_uid",
                        "partner_id",
                        "state",
                        "amount_total",
                        "currency_id",
                    ],
                    order: "create_date desc, id desc",
                    limit: 1000,
                }),
            );

            if (pos.length === 0) {
                g.__stockPoCache!.set(cacheKey, { data: EMPTY_STOCK_PO_PAYLOAD, at: Date.now() });
                return EMPTY_STOCK_PO_PAYLOAD;
            }

            const poIds = pos.map((p) => p.id);
            const poNames = pos.map((p) => p.name).filter(Boolean);

            // 2. Parallélisation : métadonnées fichiers (ir.attachment) + stock.picking (origin = po.name)
            const [attachments, pickingsRaw] = await Promise.all([
                withOdooRetry(() =>
                    odooClient.searchRead<{
                        id: number;
                        res_id: number;
                        res_field: string;
                        name: string;
                        mimetype: string | false;
                        file_size: number;
                    }>("ir.attachment", {
                        domain: [
                            ["res_model", "=", "purchase.order"],
                            ["res_id", "in", poIds],
                            ["res_field", "in", [...STOCK_PO_FILE_FIELDS]],
                        ],
                        fields: ["id", "res_id", "res_field", "name", "mimetype", "file_size"],
                        limit: 5000,
                    }),
                ),
                poNames.length > 0
                    ? withOdooRetry(() =>
                        odooClient.searchRead<{
                            id: number;
                            name: string;
                            origin: string | false;
                            state: string;
                            picking_type_id: [number, string] | false;
                            scheduled_date: string | false;
                            date_done: string | false;
                            location_dest_id: [number, string] | false;
                        }>("stock.picking", {
                            domain: [["origin", "in", poNames]],
                            fields: [
                                "name",
                                "origin",
                                "state",
                                "picking_type_id",
                                "scheduled_date",
                                "date_done",
                                "location_dest_id",
                            ],
                            order: "id asc",
                            limit: 5000,
                        }),
                    )
                    : Promise.resolve([]),
            ]);

            // Indexation attachments par (res_id -> field -> meta)
            const attMap = new Map<
                number,
                Partial<Record<StockPoFileField, StockPoAttachmentMeta>>
            >();
            for (const att of attachments) {
                const field = att.res_field as StockPoFileField;
                if (!STOCK_PO_FILE_FIELDS.includes(field)) continue;
                const entry = attMap.get(att.res_id) ?? {};
                entry[field] = {
                    attachmentId: att.id,
                    fileName: att.name || field,
                    mimeType: typeof att.mimetype === "string" ? att.mimetype : "application/octet-stream",
                    fileSize: Number(att.file_size ?? 0),
                };
                attMap.set(att.res_id, entry);
            }

            // Indexation pickings par origin (= po.name)
            const pickingsByOrigin = new Map<string, StockPickingItem[]>();
            for (const pk of pickingsRaw) {
                const origin = typeof pk.origin === "string" ? pk.origin.trim() : "";
                if (!origin) continue;
                const list = pickingsByOrigin.get(origin) ?? [];
                list.push({
                    id: pk.id,
                    name: pk.name,
                    origin,
                    state: pk.state,
                    pickingTypeName: Array.isArray(pk.picking_type_id) ? pk.picking_type_id[1] : "—",
                    scheduledDate: typeof pk.scheduled_date === "string" ? pk.scheduled_date.split(" ")[0] : "",
                    dateDone: typeof pk.date_done === "string" ? pk.date_done.split(" ")[0] : null,
                    locationDestName: Array.isArray(pk.location_dest_id) ? pk.location_dest_id[1] : "—",
                });
                pickingsByOrigin.set(origin, list);
            }

            let withExcelCaCount = 0;
            let withInvoiceCount = 0;
            let totalPickings = 0;
            let donePickings = 0;

            const orders: StockPoRow[] = pos.map((po) => {
                const files = attMap.get(po.id);
                const excelCaFile = files?.x_studio_fichier_excel_ca ?? null;
                const supplierInvoiceFile = files?.x_studio_facture_fournisseur ?? null;
                const pickings = pickingsByOrigin.get(po.name) ?? [];

                if (excelCaFile) withExcelCaCount += 1;
                if (supplierInvoiceFile) withInvoiceCount += 1;
                totalPickings += pickings.length;
                donePickings += pickings.filter((p) => p.state === "done").length;

                return {
                    id: po.id,
                    name: po.name,
                    createdAt: (po.create_date ?? "").split(" ")[0] || "",
                    createdBy: Array.isArray(po.create_uid) ? po.create_uid[1] : "—",
                    partnerName: Array.isArray(po.partner_id) ? po.partner_id[1] : "—",
                    state: po.state,
                    amountTotal: Number(po.amount_total ?? 0),
                    currency: Array.isArray(po.currency_id) ? po.currency_id[1] : "USD",
                    excelCaFile,
                    supplierInvoiceFile,
                    pickings,
                };
            });

            const result: StockPoReportData = {
                kpis: {
                    totalOrders: orders.length,
                    withExcelCaCount,
                    withInvoiceCount,
                    totalPickings,
                    donePickings,
                },
                orders,
            };

            g.__stockPoCache!.set(cacheKey, { data: result, at: Date.now() });
            return result;
        } finally {
            g.__stockPoInFlight!.delete(cacheKey);
        }
    })();

    g.__stockPoInFlight.set(cacheKey, flight);
    return flight;
}

export async function fetchStockPoBinaryFile(poId: number, field: StockPoFileField) {
    // 1. Priorité ir.attachment
    const atts = await odooClient.searchRead<{
        id: number;
        name: string;
        mimetype: string | false;
        datas: string | false;
    }>("ir.attachment", {
        domain: [
            ["res_model", "=", "purchase.order"],
            ["res_id", "=", poId],
            ["res_field", "=", field],
        ],
        fields: ["name", "mimetype", "datas"],
        limit: 1,
    });

    if (atts[0]?.datas) {
        return {
            fileName: atts[0].name || `${field}-${poId}`,
            mimeType: typeof atts[0].mimetype === "string" ? atts[0].mimetype : "application/octet-stream",
            buffer: Buffer.from(atts[0].datas, "base64"),
        };
    }

    // 2. Fallback si le champ Studio a été stocké en attachment=False
    const rows = await odooClient.searchRead<Record<string, unknown>>("purchase.order", {
        domain: [["id", "=", poId]],
        fields: [field],
        limit: 1,
    });
    const rawBase64 = rows[0]?.[field];
    if (typeof rawBase64 === "string" && rawBase64.length > 0) {
        return {
            fileName: `${field}-${poId}.bin`,
            mimeType: "application/octet-stream",
            buffer: Buffer.from(rawBase64, "base64"),
        };
    }

    return null;
}