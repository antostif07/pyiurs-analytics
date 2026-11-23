import { odooClient, type OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { OdooPurchaseOrderOption } from "../../../_lib/_components/purchase-order-selector";

export interface OdooOption {
    id: number;
    name: string;
}

export interface LogPurchaseOrderOption extends OdooOption {
    partner_id?: [number, string];
}

export interface OdooProductMatch {
    id: number;
    name: string;
    description: string;
    hsCode: string;
    marque: string;
    brandId: number | null;
    segment: string;
    prix: number;
    standardPrice: number;
    pu: number;
    caa: number;
    categorieArticle: string;
    categoriePdv: string;
    taille: string;
    couleur: string;
    hsPlus: string;
}

export interface HsLookupResponse {
    exactMatches: OdooProductMatch[];
    sameBrandProducts: OdooProductMatch[];
}

export interface ImportReferenceData {
    purchaseOrders: OdooPurchaseOrderOption[];
    logPurchaseOrders: LogPurchaseOrderOption[];
    productCategories: OdooOption[];
    posCategories: OdooOption[];
}

interface ProductSchemaFlags {
    hasPosCategIds: boolean;
    hasPosCategId: boolean;
    hasDescriptionSale: boolean;
    hasDescription: boolean;
    hasSegment: boolean;
    hasBrandM2o: boolean;
    studioExtras: string[];
}

const g = globalThis as unknown as {
    __impPosCache?: { data: OdooPurchaseOrderOption[]; at: number };
    __impLogPosCache?: { data: LogPurchaseOrderOption[]; at: number };
    __impProdCatsCache?: { data: OdooOption[]; at: number };
    __impPosCatsCache?: { data: OdooOption[]; at: number };
    __impProductSchema?: { flags: ProductSchemaFlags; at: number };
};

const PO_TTL = 2 * 60 * 1000;
const CAT_TTL = 30 * 60 * 1000;
const SCHEMA_TTL = 60 * 60 * 1000;

export function clearImportOdooCaches() {
    g.__impPosCache = undefined;
    g.__impLogPosCache = undefined;
}

export async function getOdooPurchaseOrdersForImport(
    forceRefresh = false,
): Promise<OdooPurchaseOrderOption[]> {
    if (!forceRefresh && g.__impPosCache && Date.now() - g.__impPosCache.at < PO_TTL) {
        return g.__impPosCache.data;
    }

    const domain: OdooDomain = [["state", "in", ["purchase", "done"]]];
    const pos = await odooClient.searchRead<{
        id: number;
        name: string;
        partner_id: [number, string];
        partner_ref: string | false;
    }>("purchase.order", {
        domain,
        fields: ["id", "name", "partner_id", "partner_ref"],
        order: "date_order desc",
        limit: 100,
    });

    const poIds = pos.map((p) => p.id);
    const externalIdMap = new Map<number, string>();

    if (poIds.length > 0) {
        const irModelData = await odooClient.searchRead<{
            res_id: number;
            module: string;
            name: string;
        }>("ir.model.data", {
            domain: [
                ["model", "=", "purchase.order"],
                ["res_id", "in", poIds],
            ],
            fields: ["res_id", "module", "name"],
            limit: poIds.length * 2,
        });
        for (const data of irModelData) {
            externalIdMap.set(data.res_id, `${data.module}.${data.name}`);
        }
    }

    const result: OdooPurchaseOrderOption[] = pos.map((po) => ({
        id: po.id,
        name: po.name,
        externalId: externalIdMap.get(po.id) || `__export__.purchase_order_${po.id}`,
        supplierRef: po.partner_ref || "",
        supplierId: Array.isArray(po.partner_id) ? po.partner_id[0] : 0,
        supplierName: Array.isArray(po.partner_id) ? po.partner_id[1] : "Fournisseur Inconnu",
    }));

    g.__impPosCache = { data: result, at: Date.now() };
    return result;
}

export async function getOdooLogPurchaseOrders(
    forceRefresh = false,
): Promise<LogPurchaseOrderOption[]> {
    if (!forceRefresh && g.__impLogPosCache && Date.now() - g.__impLogPosCache.at < PO_TTL) {
        return g.__impLogPosCache.data;
    }
    const pos = await odooClient.searchRead<LogPurchaseOrderOption>("purchase.order", {
        domain: [
            ["state", "in", ["purchase", "done"]],
            ["partner_id.name", "ilike", "log"],
        ],
        fields: ["id", "name", "partner_id"],
        order: "date_order desc",
        limit: 50,
    });
    g.__impLogPosCache = { data: pos, at: Date.now() };
    return pos;
}

export async function getOdooProductCategories(): Promise<OdooOption[]> {
    if (g.__impProdCatsCache && Date.now() - g.__impProdCatsCache.at < CAT_TTL) {
        return g.__impProdCatsCache.data;
    }
    const all = await odooClient.searchRead<OdooOption>("product.category", {
        fields: ["id", "name"],
        order: "name asc",
        limit: 300,
    });
    const filtered = all.filter((cat) => cat.name.split("/").length < 4);
    g.__impProdCatsCache = { data: filtered, at: Date.now() };
    return filtered;
}

export async function getOdooPosCategories(): Promise<OdooOption[]> {
    if (g.__impPosCatsCache && Date.now() - g.__impPosCatsCache.at < CAT_TTL) {
        return g.__impPosCatsCache.data;
    }
    const cats = await odooClient.searchRead<OdooOption>("pos.category", {
        fields: ["id", "name"],
        order: "name asc",
        limit: 300,
    });
    g.__impPosCatsCache = { data: cats, at: Date.now() };
    return cats;
}

export async function preloadImportReferenceData(
    forceRefresh = false,
): Promise<ImportReferenceData> {
    const [purchaseOrders, logPurchaseOrders, productCategories, posCategories] =
        await Promise.all([
            getOdooPurchaseOrdersForImport(forceRefresh),
            getOdooLogPurchaseOrders(forceRefresh),
            getOdooProductCategories(),
            getOdooPosCategories(),
        ]);

    return { purchaseOrders, logPurchaseOrders, productCategories, posCategories };
}

// ─── Schéma dynamique product.product & Lookup Code HS / Marque ──────────

const CANDIDATE_STUDIO_FIELDS = [
    "x_studio_taille",
    "x_studio_contenance",
    "x_studio_size",
    "x_studio_couleur",
    "x_studio_color",
    "x_studio_pu",
    "x_studio_caa",
    "x_studio_hs_plus",
    "x_studio_marque",
    "x_studio_code_remise",
];

async function getProductSchemaFlags(): Promise<ProductSchemaFlags> {
    if (g.__impProductSchema && Date.now() - g.__impProductSchema.at < SCHEMA_TTL) {
        return g.__impProductSchema.flags;
    }

    const candidates = [
        "pos_categ_ids",
        "pos_categ_id",
        "description_sale",
        "description",
        "x_studio_segment",
        "x_studio_many2one_field_21bvh",
        ...CANDIDATE_STUDIO_FIELDS,
    ];

    const found = await odooClient.searchRead<{ name: string }>("ir.model.fields", {
        domain: [
            ["model", "=", "product.product"],
            ["name", "in", candidates],
        ],
        fields: ["name"],
        limit: candidates.length,
    });

    const set = new Set(found.map((f) => f.name));
    const flags: ProductSchemaFlags = {
        hasPosCategIds: set.has("pos_categ_ids"),
        hasPosCategId: set.has("pos_categ_id"),
        hasDescriptionSale: set.has("description_sale"),
        hasDescription: set.has("description"),
        hasSegment: set.has("x_studio_segment"),
        hasBrandM2o: set.has("x_studio_many2one_field_21bvh"),
        studioExtras: CANDIDATE_STUDIO_FIELDS.filter((f) => set.has(f)),
    };

    g.__impProductSchema = { flags, at: Date.now() };
    return flags;
}

function extractContenanceFromName(name: string): string {
    const m = name.match(/\b(\d+(?:[.,]\d+)?\s?(?:ml|g|kg|l|oz|cl))\b/i);
    return m ? m[1].replace(/\s+/g, "") : "";
}

function extractSizeFromName(name: string): string {
    // Ex: "... - 38" ou "... - XL" en fin de nom
    const parts = name.split("-").map((s) => s.trim());
    const last = parts[parts.length - 1] ?? "";
    if (last && last.length <= 10 && !last.includes("[")) return last;
    return "";
}

function mapOdooProduct(
    raw: Record<string, unknown>,
    posCategNameById: Map<number, string>,
): OdooProductMatch {
    const name = String(raw.name ?? "");
    const hsCode = typeof raw.hs_code === "string" ? raw.hs_code : "";
    const listPrice = Number(raw.list_price ?? 0);
    const standardPrice = Number(raw.standard_price ?? 0);

    const rawCaa = Number(raw.x_studio_caa ?? 0);
    const caa = Number.isFinite(rawCaa) && rawCaa >= 1 ? rawCaa : 1.5;

    const rawPu = Number(raw.x_studio_pu ?? 0);
    const pu =
        Number.isFinite(rawPu) && rawPu > 0
            ? rawPu
            : standardPrice > 0
                ? Number((standardPrice / caa).toFixed(2))
                : 0;

    let brandId: number | null = null;
    let marque = "";
    const m2oBrand = raw.x_studio_many2one_field_21bvh;
    if (Array.isArray(m2oBrand)) {
        brandId = Number(m2oBrand[0]) || null;
        marque = String(m2oBrand[1] ?? "");
    } else if (typeof m2oBrand === "string") {
        marque = m2oBrand;
    } else if (typeof raw.x_studio_marque === "string") {
        marque = raw.x_studio_marque;
    }

    const segment = typeof raw.x_studio_segment === "string" ? raw.x_studio_segment : "";
    const categorieArticle = Array.isArray(raw.categ_id)
        ? String(raw.categ_id[1] ?? "All")
        : "All";

    let categoriePdv = "";
    if (Array.isArray(raw.pos_categ_id) && raw.pos_categ_id[1]) {
        categoriePdv = String(raw.pos_categ_id[1]);
    } else if (Array.isArray(raw.pos_categ_ids) && raw.pos_categ_ids.length > 0) {
        const firstId = Number(raw.pos_categ_ids[0]);
        categoriePdv = posCategNameById.get(firstId) ?? "";
    }

    const description =
        (typeof raw.description_sale === "string" && raw.description_sale.trim()) ||
        (typeof raw.description === "string" && raw.description.trim()) ||
        name;

    const rawTaille =
        (typeof raw.x_studio_taille === "string" && raw.x_studio_taille) ||
        (typeof raw.x_studio_contenance === "string" && raw.x_studio_contenance) ||
        (typeof raw.x_studio_size === "string" && raw.x_studio_size) ||
        "";

    const taille =
        rawTaille ||
        (segment.toLowerCase().includes("beauty")
            ? extractContenanceFromName(name)
            : extractSizeFromName(name));

    const couleur =
        (typeof raw.x_studio_couleur === "string" && raw.x_studio_couleur) ||
        (typeof raw.x_studio_color === "string" && raw.x_studio_color) ||
        "";

    const hsPlus = typeof raw.x_studio_hs_plus === "string" ? raw.x_studio_hs_plus : "";

    return {
        id: Number(raw.id),
        name,
        description,
        hsCode,
        marque,
        brandId,
        segment,
        prix: listPrice,
        standardPrice,
        pu,
        caa,
        categorieArticle,
        categoriePdv,
        taille,
        couleur,
        hsPlus,
    };
}

export async function lookupOdooProducts(params: {
    codeHs?: string;
    brand?: string;
    departement?: string;
}): Promise<HsLookupResponse> {
    const codeHs = params.codeHs?.trim() ?? "";
    const brandQuery = params.brand?.trim() ?? "";
    const isBeauty = (params.departement ?? "").toLowerCase() === "beauty";

    if (!codeHs && !brandQuery) {
        return { exactMatches: [], sameBrandProducts: [] };
    }

    const [flags, posCategories] = await Promise.all([
        getProductSchemaFlags(),
        getOdooPosCategories(),
    ]);
    const posCategNameById = new Map(posCategories.map((c) => [c.id, c.name]));

    const fields = [
        "id",
        "name",
        "hs_code",
        "list_price",
        "standard_price",
        "categ_id",
        ...(flags.hasPosCategIds ? ["pos_categ_ids"] : []),
        ...(flags.hasPosCategId ? ["pos_categ_id"] : []),
        ...(flags.hasDescriptionSale ? ["description_sale"] : []),
        ...(flags.hasDescription ? ["description"] : []),
        ...(flags.hasSegment ? ["x_studio_segment"] : []),
        ...(flags.hasBrandM2o ? ["x_studio_many2one_field_21bvh"] : []),
        ...flags.studioExtras,
    ];

    let exactMatches: OdooProductMatch[] = [];
    if (codeHs) {
        const rawExact = await odooClient.searchRead<Record<string, unknown>>(
            "product.product",
            {
                domain: [["hs_code", "=", codeHs]],
                fields,
                limit: 40,
                order: "id desc",
            },
        );
        exactMatches = rawExact.map((r) => mapOdooProduct(r, posCategNameById));
    }

    // Si Beauty : récupérer les autres produits / contenances de la même marque
    let sameBrandProducts: OdooProductMatch[] = [];
    if (isBeauty && flags.hasBrandM2o) {
        const matchedBrandId = exactMatches.find((m) => m.brandId !== null)?.brandId ?? null;
        const brandDomain: OdooDomain = [];

        if (matchedBrandId !== null) {
            brandDomain.push(["x_studio_many2one_field_21bvh", "=", matchedBrandId]);
        } else if (brandQuery.length >= 2) {
            brandDomain.push(["x_studio_many2one_field_21bvh.name", "ilike", brandQuery]);
        }

        if (brandDomain.length > 0) {
            if (flags.hasSegment) {
                brandDomain.push(["x_studio_segment", "ilike", "beauty"]);
            }
            const rawBrand = await odooClient.searchRead<Record<string, unknown>>(
                "product.product",
                {
                    domain: brandDomain,
                    fields,
                    limit: 50,
                    order: "name asc",
                },
            );
            const exactIds = new Set(exactMatches.map((e) => e.id));
            sameBrandProducts = rawBrand
                .map((r) => mapOdooProduct(r, posCategNameById))
                .filter((p) => !exactIds.has(p.id));
        }
    }

    return { exactMatches, sameBrandProducts };
}