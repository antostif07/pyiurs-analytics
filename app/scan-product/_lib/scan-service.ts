
import { odooClient, OdooDomain } from '@/lib/odoo/odoo-json2-client';
import { IMAGES_BASE, ODOO_FIELDS, ODOO_MODELS } from './scan-config';
import type { Product, Store, Variant } from './types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function m2oId(value: unknown): number | null {
    if (Array.isArray(value) && typeof value[0] === 'number') return value[0];
    if (typeof value === 'number') return value;
    return null;
}

function m2oName(value: unknown): string {
    if (Array.isArray(value) && typeof value[1] === 'string') return value[1];
    if (typeof value === 'string') return value;
    return '';
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stripHtml(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

function slugify(input: string): string {
    return input
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '');
}

function fallbackColorHex(colorName: string): string {
    const map: Record<string, string> = {
        blanc: '#FFFFFF', white: '#FFFFFF',
        noir: '#1A1A1A', black: '#1A1A1A',
        rouge: '#DC2626', red: '#DC2626',
        bleu: '#2563EB', blue: '#2563EB',
        'bleu marine': '#1E3A8A', navy: '#1E3A8A',
        'bleu nuit': '#1E3A8A',
        vert: '#16A34A', green: '#16A34A',
        jaune: '#FACC15', yellow: '#FACC15',
        gris: '#6B7280', gray: '#6B7280', grey: '#6B7280',
        'gris chine': '#9CA3AF', 'gris chiné': '#9CA3AF',
        beige: '#D6C7A1',
        marron: '#78350F', brown: '#78350F',
        rose: '#EC4899', pink: '#EC4899',
        violet: '#7C3AED', purple: '#7C3AED',
        orange: '#F97316',
        kaki: '#4B5320', khaki: '#4B5320',
    };
    return map[colorName.trim().toLowerCase()] ?? '#9CA3AF';
}

function buildImageUrl(hsCode: string | undefined, colorName: string, preferedBarcode: string): string {
    const fallback = 'https://images.bybkm.fr/8901030841125_.jpg';
    if (!IMAGES_BASE) return fallback;

    const base = /^https?:\/\//i.test(IMAGES_BASE) ? IMAGES_BASE : `https://${IMAGES_BASE}`;
    const hs = (hsCode ?? '').trim() || 'no-hs';
    const color = preferedBarcode.includes("COS") || preferedBarcode.includes("cos") ? '_' : slugify(colorName);

    return `${base.replace(/\/$/, '')}/${hs}_${color}.jpg`;
}

/* ------------------------------------------------------------------ */
/*  Point d'entrée : barcode → tous les produits partageant le HS code */
/* ------------------------------------------------------------------ */

export async function findProductsByBarcode(barcode: string): Promise<Product[]> {
    const code = barcode.trim();
    if (!code) return [];

    /* 1️⃣ Variant scanné (recherche insensible à la casse) ------------ */
    const [scanned] = await odooClient.searchRead<Record<string, any>>(
        ODOO_MODELS.variant,
        {
            domain: [[ODOO_FIELDS.variant.barcode, '=ilike', code]],
            fields: ['id', 'product_tmpl_id', 'barcode', ODOO_FIELDS.variant.color],
            limit: 1,
        }
    );

    if (!scanned) return [];

    const scannedTemplateId = m2oId(scanned.product_tmpl_id);
    if (!scannedTemplateId) return [];

    const scannedColor = m2oName(scanned[ODOO_FIELDS.variant.color]);
    const scannedBarcode = asString(scanned[ODOO_FIELDS.variant.barcode]);

    /* 2️⃣ Récupérer le hs_code du template scanné --------------------- */
    const [scannedTemplate] = await odooClient.searchRead<Record<string, any>>(
        ODOO_MODELS.template,
        {
            domain: [['id', '=', scannedTemplateId]],
            fields: ['id', ODOO_FIELDS.template.hsCode],
            limit: 1,
        }
    );

    if (!scannedTemplate) return [];

    const hsCode = asString(scannedTemplate[ODOO_FIELDS.template.hsCode]).trim();

    /* 3️⃣ Tous les templates ayant le MÊME hs_code -------------------- */
    const templateDomain: OdooDomain = hsCode
        ? [[ODOO_FIELDS.template.hsCode, '=', hsCode]]
        : [['id', '=', scannedTemplateId]];

    const templates = await odooClient.searchRead<Record<string, any>>(
        ODOO_MODELS.template,
        {
            domain: templateDomain,
            fields: [
                'id',
                ODOO_FIELDS.template.name,
                ODOO_FIELDS.template.description,
                ODOO_FIELDS.template.hsCode,
                ODOO_FIELDS.template.brand,
            ],
        }
    );

    if (!templates.length) return [];

    const templateIds = templates.map((t) => t.id as number);

    /* 4️⃣ Tous les variants de ces templates -------------------------- */
    const allVariants = await odooClient.searchRead<Record<string, any>>(
        ODOO_MODELS.variant,
        {
            domain: [['product_tmpl_id', 'in', templateIds]],
            fields: [
                'id',
                'product_tmpl_id',
                ODOO_FIELDS.variant.barcode,
                ODOO_FIELDS.variant.color,
                ODOO_FIELDS.variant.size,
                ODOO_FIELDS.variant.price,
            ],
        }
    );
    if (!allVariants.length) return [];

    const variantIds = allVariants.map((v) => v.id as number);

    /* 5️⃣ Quants avec stock dispo uniquement -------------------------- */
    const quants = await odooClient.searchRead<Record<string, any>>(
        ODOO_MODELS.quant,
        {
            domain: [
                ['product_id', 'in', variantIds],
                ['location_id.usage', '=', 'internal'],
                ['quantity', '>', 0],   // ✅ champ stocké (au lieu de available_quantity)
            ],
            fields: ['product_id', 'location_id', 'quantity'],
        }
    );

    /* 6️⃣ Locations → warehouse_id ------------------------------------ */
    const locationIds = [
        ...new Set(
            quants
                .map((q) => m2oId(q.location_id))
                .filter((id): id is number => !!id)
        ),
    ];
    const locations = locationIds.length
        ? await odooClient.searchRead<Record<string, any>>(ODOO_MODELS.location, {
            domain: [['id', 'in', locationIds]],
            fields: ['id', 'warehouse_id'],
        })
        : [];

    const locationMap = new Map<number, number | null>();
    for (const loc of locations) {
        locationMap.set(loc.id as number, m2oId(loc.warehouse_id));
    }

    /* 7️⃣ Warehouses -------------------------------------------------- */
    const warehouseIds = [
        ...new Set([...locationMap.values()].filter((id): id is number => !!id)),
    ];
    const warehouses = warehouseIds.length
        ? await odooClient.searchRead<Record<string, any>>(ODOO_MODELS.warehouse, {
            domain: [['id', 'in', warehouseIds]],
            fields: ['id', ODOO_FIELDS.warehouse.name, ODOO_FIELDS.warehouse.companyId],
        })
        : [];

    const warehouseMap = new Map<number, { companyId: number | null; name: string }>();
    for (const wh of warehouses) {
        warehouseMap.set(wh.id as number, {
            companyId: m2oId(wh[ODOO_FIELDS.warehouse.companyId]),
            name: asString(wh[ODOO_FIELDS.warehouse.name]),
        });
    }

    /* 8️⃣ Companies (= boutiques) ------------------------------------- */
    const companyIds = [
        ...new Set(
            [...warehouseMap.values()]
                .map((w) => w.companyId)
                .filter((id): id is number => !!id)
        ),
    ];
    const companies = companyIds.length
        ? await odooClient.searchRead<Record<string, any>>(ODOO_MODELS.company, {
            domain: [['id', 'in', companyIds]],
            fields: ['id', ODOO_FIELDS.company.name],
        })
        : [];

    const companyMap = new Map<number, string>();
    for (const c of companies) {
        companyMap.set(c.id as number, asString(c[ODOO_FIELDS.company.name]));
    }

    /* 9️⃣ Index : template → variants, variant → quants --------------- */
    const variantsByTemplate = new Map<number, Record<string, any>[]>();
    for (const v of allVariants) {
        const tid = m2oId(v.product_tmpl_id);
        if (!tid) continue;
        if (!variantsByTemplate.has(tid)) variantsByTemplate.set(tid, []);
        variantsByTemplate.get(tid)!.push(v);
    }

    const quantsByVariant = new Map<number, Record<string, any>[]>();
    for (const q of quants) {
        const vid = m2oId(q.product_id);
        if (!vid) continue;
        if (!quantsByVariant.has(vid)) quantsByVariant.set(vid, []);
        quantsByVariant.get(vid)!.push(q);
    }

    /* 🔟 Construction des produits ----------------------------------- */
    const products: Product[] = [];

    for (const tmpl of templates) {
        const tmplId = tmpl.id as number;
        const tmplVariants = variantsByTemplate.get(tmplId) ?? [];
        if (!tmplVariants.length) continue;

        // Variants de CE template qui ont du stock
        const variantsWithStock = tmplVariants.filter(
            (v) => (quantsByVariant.get(v.id as number) ?? []).length > 0
        );
        if (!variantsWithStock.length) continue; // pas dispo → on exclut

        const tmplQuants = variantsWithStock.flatMap(
            (v) => quantsByVariant.get(v.id as number) ?? []
        );

        const isScanned = tmplId === scannedTemplateId;

        // Couleur représentative pour l'image : celle scannée si c'est le produit scanné,
        // sinon la première couleur dispo parmi les variants en stock.
        const representativeColor = isScanned
            ? scannedColor
            : m2oName(variantsWithStock[0]?.[ODOO_FIELDS.variant.color]);

        const representativeBarcode = isScanned
            ? scannedBarcode
            : asString(
                variantsWithStock.find((v) => v[ODOO_FIELDS.variant.barcode])?.[
                ODOO_FIELDS.variant.barcode
                ]
            );

        products.push(
            buildProduct(
                tmpl,
                variantsWithStock,
                tmplQuants,
                locationMap,
                warehouseMap,
                companyMap,
                representativeColor,
                representativeBarcode
            )
        );
    }

    /* Trie : produit scanné en premier, puis alphabétique ------------ */
    products.sort((a, b) => {
        if (a.id === String(scannedTemplateId)) return -1;
        if (b.id === String(scannedTemplateId)) return 1;
        return a.name.localeCompare(b.name, 'fr');
    });

    return products;
}

/* ------------------------------------------------------------------ */
/*  Construction du payload UI                                        */
/* ------------------------------------------------------------------ */

function buildProduct(
    template: Record<string, any>,
    variantsInStock: Record<string, any>[],
    quants: Record<string, any>[],
    locationMap: Map<number, number | null>,
    warehouseMap: Map<number, { companyId: number | null; name: string }>,
    companyMap: Map<number, string>,
    preferredColor: string,
    preferredBarcode: string
): Product {
    const variantById = new Map<number, Record<string, any>>();
    for (const v of variantsInStock) variantById.set(v.id as number, v);

    /* Regroupement par company (boutique) */
    const grouped = new Map<number, Map<number, Variant>>();

    for (const q of quants) {
        const variantId = m2oId(q.product_id);
        const locationId = m2oId(q.location_id);
        if (!variantId || !locationId) continue;

        const warehouseId = locationMap.get(locationId) ?? null;
        const companyId = warehouseId
            ? warehouseMap.get(warehouseId)?.companyId ?? 0
            : 0;

        if (!grouped.has(companyId)) grouped.set(companyId, new Map());
        const bucket = grouped.get(companyId)!;

        const meta = variantById.get(variantId);
        if (!meta) continue;

        const qty = Number(q.quantity ?? 0);
        if (qty <= 0) continue;

        const existing = bucket.get(variantId);
        if (existing) {
            existing.quantity += qty;
        } else {
            bucket.set(variantId, mapVariant(meta, qty));
        }
    }

    const stores: Store[] = [...grouped.entries()]
        .map(([companyId, variants]) => ({
            id: String(companyId),
            name: companyMap.get(companyId) || 'Boutique sans nom',
            variants: [...variants.values()].sort(sortVariant),
        }))
        .filter((s) => s.variants.length > 0);

    const hsCode = asString(template[ODOO_FIELDS.template.hsCode]) || undefined;
    const brand = m2oName(template[ODOO_FIELDS.template.brand]) || '—';

    return {
        id: String(template.id),
        name: asString(template[ODOO_FIELDS.template.name], 'Produit sans nom'),
        brand,
        description: stripHtml(template[ODOO_FIELDS.template.description]),
        barcode: preferredBarcode,
        hsCode,
        image: buildImageUrl(hsCode, preferredColor, preferredBarcode),
        stores,
    };
}

function mapVariant(meta: Record<string, any>, quantity: number): Variant {
    const color = m2oName(meta[ODOO_FIELDS.variant.color]) || '—';
    const size = m2oName(meta[ODOO_FIELDS.variant.size]) || '—';

    return {
        id: String(meta.id),
        size,
        color,
        colorHex: fallbackColorHex(color),
        barcode: asString(meta[ODOO_FIELDS.variant.barcode]),
        quantity,
        price: asNumber(meta[ODOO_FIELDS.variant.price]),
    };
}

function sortVariant(a: Variant, b: Variant): number {
    if (a.size !== b.size) return a.size.localeCompare(b.size, 'fr', { numeric: true });
    return a.color.localeCompare(b.color, 'fr');
}