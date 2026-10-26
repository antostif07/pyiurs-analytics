// app/inventory/stock-femme/_lib/data.ts
import { endOfMonth, format, startOfMonth } from "date-fns";
import { odooClient as odooJsonClient } from "@/lib/odoo/odoo-json2-client";
import { extractBoutiqueCode } from "@/lib/utils";
import { formatTimeShort } from "@/lib/format-time-short";
import type {
    BarcodeDetail,
    ControlStockFemmeModel,
    StockFemmeData,
} from "./types";
import { getShopLocations, type ShopLocationsConfig } from "../../_lib/locations";
import { StockQuant } from "@/app/types/stock";
import { PurchaseOrder, PurchaseOrderLine } from "@/app/types/purchase";
import { OdooProductTemplate } from "@/app/types/product_template";
import { POSOrderLine } from "@/app/types/pos";

// ─────────────────────────────────────────────────────────────
// Fetch Odoo — Stock quants
// ─────────────────────────────────────────────────────────────

async function getStockQuantsForProducts(
    productIds: number[],
): Promise<{ records: StockQuant[]; success: boolean }> {
    if (productIds.length === 0) return { records: [], success: true };

    try {
        const BATCH_SIZE = 500;
        const batches: number[][] = [];
        for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
            batches.push(productIds.slice(i, i + BATCH_SIZE));
        }

        const allResults: StockQuant[] = [];

        for (const batch of batches) {
            const domain = JSON.stringify([
                ["product_id", "in", batch],
                ["location_id", "not in", [5, 4]],
            ]);

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/stock.quant?fields=id,product_id,location_id,quantity&domain=${domain}`,
                { next: { revalidate: 300 } },
            );

            if (!res.ok) {
                throw new Error(
                    `Erreur lors de la récupération des stocks: ${res.statusText}`,
                );
            }

            const batchResults = await res.json();
            allResults.push(...batchResults.records);
        }

        return { success: true, records: allResults };
    } catch (error) {
        console.error(
            "❌ Erreur lors de la récupération des stocks quant:",
            error,
        );
        return { records: [], success: false };
    }
}

// ─────────────────────────────────────────────────────────────
// Fetch Odoo — Purchase orders
// ─────────────────────────────────────────────────────────────

async function getPurchaseOrders(
    startDate: string,
    endDate: string,
    partnerFilter?: string,
    orderNameFilter?: string,
): Promise<{ records: PurchaseOrder[] }> {
    let domain = `[["partner_id.name", "ilike", "P.FEM"], ["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;

    if (partnerFilter) {
        domain = `[["partner_id", "ilike", "${partnerFilter}"], ["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
    }

    if (orderNameFilter) {
        domain = `[["name", "ilike", "${orderNameFilter}"], ["partner_id", "ilike", "P.FEM"], ["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`;
    }

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order?fields=id,create_date,partner_id,name,partner_ref,partner_id&domain=${domain}`,
        { next: { revalidate: 300 } },
    );

    if (!res.ok) {
        throw new Error("Erreur API Odoo - Commandes d'achat");
    }

    return res.json();
}

// ─────────────────────────────────────────────────────────────
// Fetch Odoo — Products
// ─────────────────────────────────────────────────────────────

async function getProductsByIds(
    productIds: number[],
): Promise<{ records: OdooProductTemplate[] }> {
    if (productIds.length === 0) return { records: [] };

    try {
        const CHUNK_SIZE = 1000;
        const chunks: number[][] = [];
        for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
            chunks.push(productIds.slice(i, i + CHUNK_SIZE));
        }

        const allResults: OdooProductTemplate[] = [];

        for (const chunk of chunks) {
            const res = await odooJsonClient.searchRead<OdooProductTemplate>(
                "product.template",
                {
                    domain: [
                        ["product_variant_ids", "in", chunk],
                        ["type", "=", "consu"],
                    ],
                    fields: "id,name,list_price,categ_id,barcode,hs_code,product_variant_id,x_studio_many2one_field_21bvh,x_studio_many2one_field_QyelN,x_studio_many2one_field_Arl5D".split(
                        ",",
                    ),
                },
            );
            allResults.push(...res);
        }
        return { records: allResults };
    } catch (e) {
        console.error("getProductsByIds:", e);
    }
    return { records: [] };
}

// ─────────────────────────────────────────────────────────────
// Fetch Odoo — Purchase order lines
// ─────────────────────────────────────────────────────────────

async function getPurchaseOrderLinesByIds(
    purchaseOrderIds: number[],
): Promise<{ records: PurchaseOrderLine[] }> {
    if (purchaseOrderIds.length === 0) return { records: [] };

    const domain = `[["order_id", "in", [${purchaseOrderIds.join(",")}]]]`;

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/purchase.order.line?fields=id,order_id,product_id,product_qty,qty_received,price_unit,write_date&domain=${domain}`,
        { next: { revalidate: 300 } },
    );

    if (!res.ok) {
        throw new Error("Erreur API Odoo - Lignes de commandes d'achat");
    }

    return res.json();
}

// ─────────────────────────────────────────────────────────────
// Fetch Odoo — POS order lines
// ─────────────────────────────────────────────────────────────

async function getPOSOrderLines(
    productIds: number[],
): Promise<{ records: POSOrderLine[] }> {
    if (productIds.length === 0) return { records: [] };

    try {
        const CHUNK_SIZE = 1000;
        const chunks: number[][] = [];
        for (let i = 0; i < productIds.length; i += CHUNK_SIZE) {
            chunks.push(productIds.slice(i, i + CHUNK_SIZE));
        }

        const allResults: POSOrderLine[] = [];

        for (const chunk of chunks) {
            const res = await odooJsonClient.searchRead<POSOrderLine>(
                "pos.order.line",
                {
                    domain: [["product_id", "in", chunk]],
                    fields: "id,qty,product_id".split(","),
                },
            );
            allResults.push(...res);
        }
        return { records: allResults };
    } catch (e) {
        console.error("getPOSOrderLines:", e);
    }
    return { records: [] };
}

// ─────────────────────────────────────────────────────────────
// Transformation (pure)
// ─────────────────────────────────────────────────────────────

type StockBreakdown = Record<string, number> & { total: number };

function emptyBreakdown(): StockBreakdown {
    return { total: 0 };
}

function transformToControlStockModel(
    purchaseOrders: PurchaseOrder[],
    purchaseOrderLines: PurchaseOrderLine[],
    products: OdooProductTemplate[],
    posOrderLines: POSOrderLine[],
    stockQuants: StockQuant[],
    locationConfig: ShopLocationsConfig,
): ControlStockFemmeModel[] {
    const allProductIds = products
        .map((p) => (p.product_variant_id ? p.product_variant_id[0] : 0))
        .filter((id) => id > 0);

    // ── Stock par produit × boutique ─────────────────────────
    const stockByProductAndBoutique = new Map<number, StockBreakdown>();

    allProductIds.forEach((productId) => {
        stockByProductAndBoutique.set(productId, emptyBreakdown());
    });

    stockQuants.forEach((quant) => {
        const productId = quant.product_id[0];
        const odooLocationId = quant.location_id[0];
        const locationName = quant.location_id[1];
        const quantity = quant.quantity;

        // 1. Match par odoo_location_id (source de vérité Supabase)
        // 2. Fallback parsing nom → nom connu (si la location est aussi trackée)
        let shopName = locationConfig.byOdooId.get(odooLocationId);

        if (!shopName) {
            // Fallback : on parse le nom Odoo et on vérifie qu'il correspond
            // à une boutique connue (par inclusion de code, ex: "P.KTM" → "P.KTM")
            const code = extractBoutiqueCode(locationName);
            const fallbackMatch = locationConfig.names.find((n) =>
                n.toUpperCase().includes(code.toUpperCase()),
            );
            if (!fallbackMatch) return; // location non configurée → on skip
            shopName = fallbackMatch;
        }

        const current = stockByProductAndBoutique.get(productId) ?? emptyBreakdown();
        current[shopName] = (current[shopName] ?? 0) + quantity;
        current.total += quantity;
        stockByProductAndBoutique.set(productId, current);
    });

    // ── Produits par variant_id ──────────────────────────────
    const productsMap = new Map<number, OdooProductTemplate>();
    products.forEach((product) => {
        const pId = product.product_variant_id ? product.product_variant_id[0] : 0;
        if (pId > 0) productsMap.set(pId, product);
    });

    // ── Ventes par variant_id ────────────────────────────────
    const salesByProductId = new Map<number, number>();
    posOrderLines.forEach((line) => {
        const productId = line.product_id?.[0];
        if (productId) {
            const currentQty = salesByProductId.get(productId) ?? 0;
            salesByProductId.set(productId, currentQty + (line.qty || 0));
        }
    });

    // ── Groupement par hs_code + couleur ─────────────────────
    type GroupProduct = {
        product: OdooProductTemplate;
        stock: StockBreakdown | undefined;
    };

    const linesByHsCode = new Map<
        string,
        {
            lines: PurchaseOrderLine[];
            brands: Set<string>;
            colors: Set<string>;
            category: string;
            price: string;
            imageUrl: string;
            age: string;
            po_name: string;
            barcodes: Set<string>;
            barcodesByShop: Map<string, Set<string>>;
            products: Map<number, GroupProduct>;
        }
    >();

    purchaseOrderLines.forEach((line) => {
        const productId = line.product_id?.[0];
        if (!productId) return;

        const product = productsMap.get(productId);
        if (!product) return;

        let age = "";
        if (line.qty_received > 0) {
            age = formatTimeShort(line.write_date);
        }

        const hsCode = product.hs_code || "UNKNOWN";
        const color = product.x_studio_many2one_field_Arl5D?.[1] ?? "";
        const groupKey = `${hsCode}_${color}`;
        const categ_id = product.categ_id?.[1] ?? "";
        const category = categ_id.split("/").pop()?.trim() ?? "";
        const price = product.list_price;
        const imageUrl = `http://${process.env.NEXT_PUBLIC_IMAGES_DIR ?? "images.bybkm.fr"}/${hsCode}_${color}.jpg`;

        const stock = stockByProductAndBoutique.get(productId);

        if (!linesByHsCode.has(groupKey)) {
            const po = line.order_id
                ? purchaseOrders.find((p) => p.id === line.order_id[0])
                : null;
            const po_name = po
                ? `${po.partner_id[1].split("-")[1]} - ${po.partner_ref}`
                : "Aucune Reference";
            linesByHsCode.set(groupKey, {
                lines: [],
                brands: new Set(),
                colors: new Set(),
                category,
                price: `${price} $`,
                imageUrl,
                age,
                po_name,
                barcodes: new Set(),
                barcodesByShop: new Map(),
                products: new Map(),
            });
        }

        const group = linesByHsCode.get(groupKey)!;
        group.lines.push(line);

        const brand = product.x_studio_many2one_field_21bvh?.[1];
        const size = product.x_studio_many2one_field_QyelN?.[1];
        if (brand) group.brands.add(brand);

        if (product.barcode) {
            group.barcodes.add(product.barcode);

            if (stock) {
                for (const shopName of locationConfig.names) {
                    if ((stock[shopName] ?? 0) > 0) {
                        if (!group.barcodesByShop.has(shopName)) {
                            group.barcodesByShop.set(shopName, new Set());
                        }
                        group.barcodesByShop.get(shopName)!.add(product.barcode);
                    }
                }
            }
        }

        if (size) group.colors.add(size);

        group.products.set(productId, { product, stock });
    });

    // ── Construction des lignes finales ──────────────────────
    const result: ControlStockFemmeModel[] = [];

    linesByHsCode.forEach((group, key) => {
        // 1. barcodeDetails = 1 entrée par produit unique
        const barcodeDetails: BarcodeDetail[] = [];

        group.products.forEach(({ product, stock }, productId) => {
            const lines = group.lines.filter(
                (l) => l.product_id?.[0] === productId,
            );

            const product_qty = lines.reduce(
                (s, l) => s + (l.product_qty || 0),
                0,
            );
            const qty_received = lines.reduce(
                (s, l) => s + (l.qty_received || 0),
                0,
            );
            const not_received = product_qty - qty_received;
            const qty_sold = salesByProductId.get(productId) ?? 0;

            const stockByShop: Record<string, number> = {};
            let qty_available = 0;
            for (const shopName of locationConfig.names) {
                const v = stock?.[shopName] ?? 0;
                if (v !== 0) stockByShop[shopName] = v;
                qty_available += v;
            }

            const ageLine = lines.find((l) => l.qty_received > 0);
            const age = ageLine ? formatTimeShort(ageLine.write_date) : "";

            const perf =
                qty_received > 0 ? (qty_sold / qty_received) * 100 : 0;

            barcodeDetails.push({
                barcode: product.barcode || `ID-${productId}`,
                product_qty,
                qty_received,
                not_received,
                qty_sold,
                qty_available,
                stockByShop,
                age,
                perf,
            });
        });

        // 2. Agrégats dérivés
        const product_qty = barcodeDetails.reduce((s, d) => s + d.product_qty, 0);
        const qty_received = barcodeDetails.reduce((s, d) => s + d.qty_received, 0);
        const not_received = product_qty - qty_received;
        const qty_sold = barcodeDetails.reduce((s, d) => s + d.qty_sold, 0);
        const qty_available = barcodeDetails.reduce((s, d) => s + d.qty_available, 0);

        const stockByShop: Record<string, number> = {};
        for (const shopName of locationConfig.names) {
            const v = barcodeDetails.reduce(
                (s, d) => s + (d.stockByShop[shopName] ?? 0),
                0,
            );
            if (v !== 0) stockByShop[shopName] = v;
        }

        const barcodesByShop: Record<string, string[]> = {};
        group.barcodesByShop.forEach((set, shopName) => {
            barcodesByShop[shopName] = Array.from(set);
        });

        const [hsCode, color] = key.split("_");
        const brands = Array.from(group.brands);
        const sizes = Array.from(group.colors);

        const brand =
            brands.length > 0
                ? `${brands[0]}${brands.length > 1 ? `, +${brands.length - 1}` : ""}`
                : "Autres";

        const size = sizes.length > 0 ? sizes.toString() : "";

        result.push({
            name: `${group.category} ${color} - ${hsCode} (${group.price})`,
            brand,
            color: size,
            product_qty,
            qty_received,
            not_received,
            qty_sold,
            qty_available,
            barcodes: Array.from(group.barcodes),
            barcodesByShop,
            imageUrl: group.imageUrl,
            age: group.age,
            stockByShop,
            po_name: group.po_name,
            barcodeDetails,
        });
    });

    return result;
}

// ─────────────────────────────────────────────────────────────
// Point d'entrée : getData
// ─────────────────────────────────────────────────────────────

export async function getData(
    start_date?: string,
    end_date?: string,
    partnerFilter?: string,
    orderNameFilter?: string,
): Promise<StockFemmeData> {
    let startDate: string;
    let endDate: string;

    if (!start_date || !end_date) {
        const today = new Date();
        startDate = format(startOfMonth(today), "yyyy-MM-dd");
        endDate = format(endOfMonth(today), "yyyy-MM-dd");
    } else {
        startDate = start_date;
        endDate = end_date;
    }

    // 1. Charger la config des emplacements depuis Supabase
    const locationConfig = await getShopLocations();

    // 2. Fetch Odoo
    const purchaseOrders = await getPurchaseOrders(
        startDate,
        endDate,
        partnerFilter,
        orderNameFilter,
    );

    const purchaseOrderIds = purchaseOrders.records.map((p) => p.id);
    const purchaseOrderLines = await getPurchaseOrderLinesByIds(purchaseOrderIds);

    const productIds = purchaseOrderLines.records
        .map((line) => line.product_id?.[0])
        .filter((id): id is number => id !== undefined && id !== null);

    const products = await getProductsByIds(productIds);
    const posOrderLines = await getPOSOrderLines(productIds);

    const stockQuantsResponse = await getStockQuantsForProducts(productIds);
    if (!stockQuantsResponse.success) {
        console.error(
            "❌ Échec récupération des stocks. Quantités dispo à 0.",
        );
    }

    // 3. Transformation
    const data = transformToControlStockModel(
        purchaseOrders.records,
        purchaseOrderLines.records,
        products.records,
        posOrderLines.records,
        stockQuantsResponse.records,
        locationConfig,
    );

    const brandsSet = new Set<string>();
    const colorsSet = new Set<string>();
    data.forEach((item) => {
        if (item.brand) brandsSet.add(item.brand);
        if (item.color) colorsSet.add(item.color);
    });

    const partnersSet = new Set<string>();
    const orderNamesSet = new Set<string>();
    purchaseOrders.records.forEach((order) => {
        if (order.partner_id?.[1]) partnersSet.add(order.partner_id[1]);
        if (order.name) orderNamesSet.add(order.name);
    });

    return {
        data,
        brands: Array.from(brandsSet).sort(),
        colors: Array.from(colorsSet).sort(),
        partners: Array.from(partnersSet).sort(),
        orderNames: Array.from(orderNamesSet).sort(),
        shops: locationConfig.names,
    };
}