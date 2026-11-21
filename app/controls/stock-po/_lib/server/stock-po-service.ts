import * as XLSX from "xlsx";
import { createClient, getServerAuth } from "@/lib/supabase/server";
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

export function isStockPoFileField(
    val: string | null | undefined,
): val is StockPoFileField {
    return (
        typeof val === "string" &&
        (STOCK_PO_FILE_FIELDS as readonly string[]).includes(val)
    );
}

export interface ExcelPreviewSheet {
    name: string;
    rows: string[][];
    totalRows: number;
    totalCols: number;
    truncated: boolean;
}

export interface ExcelPreviewData {
    fileName: string;
    sheets: ExcelPreviewSheet[];
}

export const EMPTY_STOCK_PO_PAYLOAD: StockPoReportData = {
    kpis: {
        totalOrders: 0,
        withExcelCaCount: 0,
        withInvoiceCount: 0,
        totalPickings: 0,
        donePickings: 0,
        validatedCount: 0,
    },
    orders: [],
};

interface FilenameFieldMapping {
    x_studio_fichier_excel_ca: string | null;
    x_studio_facture_fournisseur: string | null;
}

interface StockPoValidationRow {
    odoo_po_id: number;
    validation_file_name: string;
    validation_mime_type: string;
    notes: string | null;
    validated_at: string;
    validator: { full_name: string | null } | { full_name: string | null }[] | null;
}

const g = globalThis as unknown as {
    __stockPoCache?: Map<string, { data: StockPoReportData; at: number }>;
    __stockPoInFlight?: Map<string, Promise<StockPoReportData>>;
    __stockPoFilenameFields?: { mapping: FilenameFieldMapping; at: number };
};

const REPORT_TTL = 20 * 1000;
const FILENAME_FIELDS_TTL = 60 * 60 * 1000;
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

export function clearStockPoReportCache() {
    g.__stockPoCache?.clear();
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

export async function requireStockPoValidateAccess(requireAdminOnly = false) {
    const auth = await getServerAuth();
    if (!auth.user) return { ok: false as const, status: 401, error: "Non authentifié" };
    if (!auth.profile) return { ok: false as const, status: 403, error: "Profil manquant" };

    const role = auth.profile.role ?? "";
    const allowed = requireAdminOnly ? role === "admin" : canEditStockPo(role);
    if (!allowed) {
        return {
            ok: false as const,
            status: 403,
            error: requireAdminOnly
                ? "Seul un admin peut retirer une validation"
                : "Seuls un controller ou un admin peuvent valider",
        };
    }
    return { ok: true as const, user: auth.user, profile: auth.profile };
}

function extractFilenameAttrFromXml(arch: string, binaryField: string): string | null {
    const patterns = [
        new RegExp(`<field[^>]*name=["']${binaryField}["'][^>]*filename=["']([^"']+)["']`, "i"),
        new RegExp(`<field[^>]*filename=["']([^"']+)["'][^>]*name=["']${binaryField}["']`, "i"),
    ];
    for (const re of patterns) {
        const m = arch.match(re);
        if (m?.[1]) return m[1];
    }
    return null;
}

async function resolveFilenameFields(): Promise<FilenameFieldMapping> {
    if (
        g.__stockPoFilenameFields &&
        Date.now() - g.__stockPoFilenameFields.at < FILENAME_FIELDS_TTL
    ) {
        return g.__stockPoFilenameFields.mapping;
    }

    const mapping: FilenameFieldMapping = {
        x_studio_fichier_excel_ca: null,
        x_studio_facture_fournisseur: null,
    };

    try {
        const [views, studioCharFields] = await Promise.all([
            withOdooRetry(() =>
                odooClient.searchRead<{ id: number; arch_db: string | false }>("ir.ui.view", {
                    domain: [
                        ["model", "=", "purchase.order"],
                        ["type", "=", "form"],
                        ["arch_db", "ilike", "x_studio_"],
                    ],
                    fields: ["arch_db"],
                    limit: 30,
                }),
            ),
            withOdooRetry(() =>
                odooClient.searchRead<{ id: number; name: string }>("ir.model.fields", {
                    domain: [
                        ["model", "=", "purchase.order"],
                        ["ttype", "=", "char"],
                        ["name", "ilike", "x_studio_"],
                    ],
                    fields: ["name"],
                    limit: 100,
                }),
            ),
        ]);

        const validCharFieldSet = new Set(studioCharFields.map((f) => f.name));

        for (const field of STOCK_PO_FILE_FIELDS) {
            for (const v of views) {
                if (typeof v.arch_db !== "string") continue;
                const found = extractFilenameAttrFromXml(v.arch_db, field);
                if (found && validCharFieldSet.has(found)) {
                    mapping[field] = found;
                    break;
                }
            }
            if (!mapping[field] && validCharFieldSet.has(`${field}_filename`)) {
                mapping[field] = `${field}_filename`;
            }
        }
    } catch (err) {
        console.warn("[STOCK_PO] filename fields discovery failed:", err);
    }

    g.__stockPoFilenameFields = { mapping, at: Date.now() };
    return mapping;
}

function guessMimeFromName(fileName: string, fallbackMime: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".xlsx")) {
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
    if (lower.endsWith(".csv")) return "text/csv; charset=utf-8";
    return fallbackMime;
}

function detectFileFormat(
    buf: Buffer,
    fallbackMime?: string,
    originalFileName?: string,
): { mimeType: string; ext: string } {
    if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
        return { mimeType: "application/pdf", ext: "pdf" };
    }
    if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
        return {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ext: "xlsx",
        };
    }
    if (buf.length >= 4 && buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) {
        return { mimeType: "application/vnd.ms-excel", ext: "xls" };
    }
    if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return { mimeType: "image/png", ext: "png" };
    }
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { mimeType: "image/jpeg", ext: "jpg" };
    }
    if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
        return { mimeType: "image/webp", ext: "webp" };
    }

    if (originalFileName) {
        const byExt = guessMimeFromName(originalFileName, "");
        if (byExt) {
            const ext = originalFileName.split(".").pop()?.toLowerCase() ?? "bin";
            return { mimeType: byExt, ext };
        }
    }

    if (fallbackMime === "application/pdf") return { mimeType: fallbackMime, ext: "pdf" };
    if (fallbackMime === "image/png") return { mimeType: fallbackMime, ext: "png" };
    if (fallbackMime === "image/jpeg") return { mimeType: fallbackMime, ext: "jpg" };
    if (fallbackMime?.includes("spreadsheetml")) return { mimeType: fallbackMime, ext: "xlsx" };
    if (fallbackMime?.includes("csv") || fallbackMime?.includes("text/plain")) {
        return { mimeType: "text/csv; charset=utf-8", ext: "csv" };
    }

    return { mimeType: fallbackMime || "application/octet-stream", ext: "bin" };
}

async function fetchStockPoValidationsChunked(poIds: number[]) {
    if (poIds.length === 0) return new Map<number, StockPoValidationRow>();
    const supabase = await createClient();
    const CHUNK = 300;
    const chunks: number[][] = [];
    for (let i = 0; i < poIds.length; i += CHUNK) {
        chunks.push(poIds.slice(i, i + CHUNK));
    }

    const resList = await Promise.all(
        chunks.map((chunk) =>
            (supabase as any)
                .from("stock_po_validations")
                .select(
                    "odoo_po_id, validation_file_name, validation_mime_type, notes, validated_at, validator:profiles!stock_po_validations_validated_by_fkey(full_name)",
                )
                .in("odoo_po_id", chunk),
        ),
    );

    const map = new Map<number, StockPoValidationRow>();
    for (const res of resList) {
        if (res.error) {
            console.warn("[STOCK_PO] validations fetch failed:", res.error.message);
        } else if (Array.isArray(res.data)) {
            for (const row of res.data as StockPoValidationRow[]) {
                map.set(row.odoo_po_id, row);
            }
        }
    }
    return map;
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
            const filenameFields = await resolveFilenameFields();

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

            const poFields: string[] = [
                "name",
                "create_date",
                "create_uid",
                "partner_id",
                "state",
                "amount_total",
                "currency_id",
            ];
            if (filenameFields.x_studio_fichier_excel_ca) {
                poFields.push(filenameFields.x_studio_fichier_excel_ca);
            }
            if (filenameFields.x_studio_facture_fournisseur) {
                poFields.push(filenameFields.x_studio_facture_fournisseur);
            }

            const pos = await withOdooRetry(() =>
                odooClient.searchRead<Record<string, unknown>>("purchase.order", {
                    domain,
                    fields: poFields,
                    order: "create_date desc, id desc",
                    limit: 1000,
                }),
            );

            if (pos.length === 0) {
                g.__stockPoCache!.set(cacheKey, { data: EMPTY_STOCK_PO_PAYLOAD, at: Date.now() });
                return EMPTY_STOCK_PO_PAYLOAD;
            }

            const poIds = pos.map((p) => Number(p.id));
            const poNames = pos.map((p) => String(p.name ?? "")).filter(Boolean);

            const [attachments, pickingsRaw, validationMap] = await Promise.all([
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
                fetchStockPoValidationsChunked(poIds),
            ]);

            const attByPo = new Map<
                number,
                Partial<Record<StockPoFileField, { id: number; name: string; mimetype: string; fileSize: number }>>
            >();
            for (const att of attachments) {
                if (!isStockPoFileField(att.res_field)) continue;
                const field = att.res_field;
                const entry = attByPo.get(att.res_id) ?? {};
                entry[field] = {
                    id: att.id,
                    name: att.name,
                    mimetype: typeof att.mimetype === "string" ? att.mimetype : "application/octet-stream",
                    fileSize: Number(att.file_size ?? 0),
                };
                attByPo.set(att.res_id, entry);
            }

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

            const buildFileMeta = (
                po: Record<string, unknown>,
                poId: number,
                field: StockPoFileField,
            ): StockPoAttachmentMeta | null => {
                const att = attByPo.get(poId)?.[field];
                const fnField = filenameFields[field];
                const rawStudioName = fnField ? po[fnField] : null;
                const studioFileName =
                    typeof rawStudioName === "string" && rawStudioName.trim().length > 0
                        ? rawStudioName.trim()
                        : null;

                if (!att && !studioFileName) return null;

                const rawAttName = att?.name && att.name !== field ? att.name : null;
                const fileName =
                    studioFileName ||
                    rawAttName ||
                    (field === "x_studio_fichier_excel_ca" ? "fichier_excel_ca.xlsx" : "facture_fournisseur");

                const mimeType = guessMimeFromName(
                    fileName,
                    att?.mimetype || "application/octet-stream",
                );

                return {
                    attachmentId: att?.id ?? 0,
                    fileName,
                    mimeType,
                    fileSize: att?.fileSize ?? 0,
                };
            };

            let withExcelCaCount = 0;
            let withInvoiceCount = 0;
            let totalPickings = 0;
            let donePickings = 0;
            let validatedCount = 0;

            const orders: StockPoRow[] = pos.map((po) => {
                const poId = Number(po.id);
                const poName = String(po.name ?? "");
                const excelCaFile = buildFileMeta(po, poId, "x_studio_fichier_excel_ca");
                const supplierInvoiceFile = buildFileMeta(po, poId, "x_studio_facture_fournisseur");
                const pickings = pickingsByOrigin.get(poName) ?? [];

                const v = validationMap.get(poId);
                const validatorObj = v
                    ? Array.isArray(v.validator)
                        ? v.validator[0]
                        : v.validator
                    : null;

                if (excelCaFile) withExcelCaCount += 1;
                if (supplierInvoiceFile) withInvoiceCount += 1;
                if (v) validatedCount += 1;
                totalPickings += pickings.length;
                donePickings += pickings.filter((p) => p.state === "done").length;

                return {
                    id: poId,
                    name: poName,
                    createdAt: (typeof po.create_date === "string" ? po.create_date : "").split(" ")[0] || "",
                    createdBy: Array.isArray(po.create_uid) ? String(po.create_uid[1]) : "—",
                    partnerName: Array.isArray(po.partner_id) ? String(po.partner_id[1]) : "—",
                    state: String(po.state ?? "draft"),
                    amountTotal: Number(po.amount_total ?? 0),
                    currency: Array.isArray(po.currency_id) ? String(po.currency_id[1]) : "USD",
                    excelCaFile,
                    supplierInvoiceFile,
                    pickings,
                    isValidated: Boolean(v),
                    validationFileName: v?.validation_file_name ?? null,
                    validationMimeType: v?.validation_mime_type ?? null,
                    validationNotes: v?.notes ?? null,
                    validatedAt: v?.validated_at ?? null,
                    validatedBy: v ? (validatorObj?.full_name ?? "—") : null,
                };
            });

            const result: StockPoReportData = {
                kpis: {
                    totalOrders: orders.length,
                    withExcelCaCount,
                    withInvoiceCount,
                    totalPickings,
                    donePickings,
                    validatedCount,
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
    const filenameFields = await resolveFilenameFields();
    const fnField = filenameFields[field];

    const fieldsToRead: string[] = [field];
    if (fnField) fieldsToRead.push(fnField);

    let base64Payload: string | null = null;
    let originalFileName: string | undefined;
    let mimeFromAtt: string | undefined;

    try {
        const rows = await odooClient.searchRead<Record<string, unknown>>("purchase.order", {
            domain: [["id", "=", poId]],
            fields: fieldsToRead,
            limit: 1,
            context: { bin_size: false },
        });
        const row = rows[0];
        if (row) {
            if (fnField && typeof row[fnField] === "string" && row[fnField].trim()) {
                originalFileName = row[fnField].trim();
            }
            const binVal = row[field];
            if (typeof binVal === "string" && binVal.length > 16) {
                base64Payload = binVal;
            }
        }
    } catch (err) {
        console.warn(`[STOCK_PO_FILE] purchase.order.${field} read failed:`, err);
    }

    try {
        const atts = await odooClient.searchRead<{
            id: number;
            name: string;
            mimetype: string | false;
        }>("ir.attachment", {
            domain: [
                ["res_model", "=", "purchase.order"],
                ["res_id", "=", poId],
                ["res_field", "=", field],
            ],
            fields: ["name", "mimetype"],
            limit: 1,
        });
        if (atts[0]) {
            if (!originalFileName && atts[0].name && atts[0].name !== field) {
                originalFileName = atts[0].name;
            }
            if (typeof atts[0].mimetype === "string") mimeFromAtt = atts[0].mimetype;
        }
    } catch {
        /* ignore */
    }

    if (!base64Payload) {
        for (const col of ["raw", "datas"] as const) {
            try {
                const atts = await odooClient.searchRead<Record<string, unknown>>("ir.attachment", {
                    domain: [
                        ["res_model", "=", "purchase.order"],
                        ["res_id", "=", poId],
                        ["res_field", "=", field],
                    ],
                    fields: [col],
                    limit: 1,
                });
                const val = atts[0]?.[col];
                if (typeof val === "string" && val.length > 0) {
                    base64Payload = val;
                    break;
                }
            } catch {
                /* tester suivant */
            }
        }
    }

    if (!base64Payload) return null;

    const buffer = Buffer.from(base64Payload.replace(/\s+/g, ""), "base64");
    if (buffer.length === 0) return null;

    const { mimeType, ext } = detectFileFormat(buffer, mimeFromAtt, originalFileName);
    const defaultBase =
        field === "x_studio_fichier_excel_ca" ? "fichier_excel_ca" : "facture_fournisseur";

    const fileName = originalFileName || `${defaultBase}.${ext}`;

    return { fileName, mimeType, buffer };
}

export async function fetchStockPoExcelPreview(
    poId: number,
    field: StockPoFileField,
): Promise<ExcelPreviewData | null> {
    const file = await fetchStockPoBinaryFile(poId, field);
    if (!file) return null;

    const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    const MAX_ROWS = 250;
    const MAX_COLS = 30;

    const sheets: ExcelPreviewSheet[] = workbook.SheetNames.map((sheetName) => {
        const ws = workbook.Sheets[sheetName];
        const rawMatrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
            header: 1,
            defval: "",
            raw: false,
        });

        const totalRows = rawMatrix.length;
        const totalCols = rawMatrix.reduce(
            (max, r) => (Array.isArray(r) ? Math.max(max, r.length) : max),
            0,
        );

        const slicedRows = rawMatrix.slice(0, MAX_ROWS).map((row) => {
            const arr = Array.isArray(row) ? row : [];
            const out: string[] = [];
            const colCount = Math.min(totalCols, MAX_COLS);
            for (let c = 0; c < colCount; c++) {
                const cell = arr[c];
                out.push(cell === null || cell === undefined ? "" : String(cell));
            }
            return out;
        });

        return {
            name: sheetName,
            rows: slicedRows,
            totalRows,
            totalCols,
            truncated: totalRows > MAX_ROWS || totalCols > MAX_COLS,
        };
    });

    return { fileName: file.fileName, sheets };
}