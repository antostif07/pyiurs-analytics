// app/api/inventory/items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { odooClient } from "@/lib/odoo/odoo-json2-client";
import type { OdooDomain } from "@/lib/odoo/odoo-json2-client";
import { createClient } from "@/lib/supabase/server";
import {
    resolveSaleUnitPrice,
    resolveCostUnitPrice,
} from "@/lib/inventory/pricing";
import type {
    InventoryItemRow,
    InventoryItemSortKey,
    InventoryItemsResponse,
    InventorySegment,
} from "@/app/inventory/_lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = [
    "admin",
    "manager",
    "inventory_manager",
    "inventory-manager",
    "financier",
    "controller",
];
const GROUP_WIDE_ROLES = ["admin", "financier", "controller"];

const EXCLUDED_PRODUCT_IDS: number[] = [499831, 543466, 103873];

const VALID_SORTS: InventoryItemSortKey[] = [
    "saleValue_desc",
    "saleValue_asc",
    "quantity_desc",
    "quantity_asc",
    "marginValue_desc",
    "marginValue_asc",
    "productName_asc",
    "productName_desc",
];

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type LocationField = "location_id" | "location_dest_id";

function buildCompanyLocationDomain(
    companies: number[],
    locationsByCompany: Map<number, number[]>,
    locationField: LocationField,
): OdooDomain {
    if (companies.length === 0) return [[locationField, "=", -1]];

    const withLocations: number[] = [];
    const withoutLocations: number[] = [];
    const locSet = new Set<number>();

    for (const cId of companies) {
        const locs = locationsByCompany.get(cId) ?? [];
        if (locs.length > 0) {
            withLocations.push(cId);
            for (const l of locs) locSet.add(l);
        } else {
            withoutLocations.push(cId);
        }
    }

    const locArr = Array.from(locSet);
    const usageField = `${locationField}.usage`;

    if (withLocations.length > 0 && withoutLocations.length === 0) {
        return [
            ["company_id", "in", withLocations],
            [locationField, "child_of", locArr],
        ];
    }
    if (withLocations.length === 0 && withoutLocations.length > 0) {
        return [
            ["company_id", "in", withoutLocations],
            [usageField, "=", "internal"],
        ];
    }
    return [
        "|",
        "&",
        ["company_id", "in", withLocations],
        [locationField, "child_of", locArr],
        "&",
        ["company_id", "in", withoutLocations],
        [usageField, "=", "internal"],
    ];
}

function extractMany2oneName(
    value: [number, string] | false | null | undefined,
): string | null {
    if (Array.isArray(value) && typeof value[1] === "string") {
        return value[1];
    }
    return null;
}

function sortItems(
    items: InventoryItemRow[],
    sort: InventoryItemSortKey,
): InventoryItemRow[] {
    const sorted = [...items];
    switch (sort) {
        case "saleValue_desc":
            return sorted.sort((a, b) => b.saleValue - a.saleValue);
        case "saleValue_asc":
            return sorted.sort((a, b) => a.saleValue - b.saleValue);
        case "quantity_desc":
            return sorted.sort((a, b) => b.quantity - a.quantity);
        case "quantity_asc":
            return sorted.sort((a, b) => a.quantity - b.quantity);
        case "marginValue_desc":
            return sorted.sort((a, b) => b.marginValue - a.marginValue);
        case "marginValue_asc":
            return sorted.sort((a, b) => a.marginValue - b.marginValue);
        case "productName_asc":
            return sorted.sort((a, b) =>
                a.productName.localeCompare(b.productName),
            );
        case "productName_desc":
            return sorted.sort((a, b) =>
                b.productName.localeCompare(a.productName),
            );
    }
}

export async function GET(request: NextRequest) {
    try {
        // ─── Auth ──────────────────────────────────────────────
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json(
                { error: "Non authentifié" },
                { status: 401 },
            );
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role, assigned_companies")
            .eq("id", user.id)
            .single();

        if (!profile || !ALLOWED_ROLES.includes(profile.role ?? "")) {
            return NextResponse.json(
                { error: "Permissions insuffisantes" },
                { status: 403 },
            );
        }

        // ─── Params ────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const companyParam = searchParams.get("company");
        const segmentParam = searchParams.get("segment");
        const searchParam = (searchParams.get("search") ?? "").trim();
        const sortParam = searchParams.get("sort");
        const pageParam = searchParams.get("page");
        const pageSizeParam = searchParams.get("pageSize");

        const requestedCompanyId = companyParam ? Number(companyParam) : null;
        const segment: InventorySegment =
            segmentParam === "Femme" ||
                segmentParam === "Beauty" ||
                segmentParam === "Enfant"
                ? segmentParam
                : "Tous";

        const sort: InventoryItemSortKey =
            sortParam && (VALID_SORTS as readonly string[]).includes(sortParam)
                ? (sortParam as InventoryItemSortKey)
                : "saleValue_desc";

        const requestedPage = pageParam ? Math.max(1, Number(pageParam)) : 1;
        const requestedPageSize = pageSizeParam
            ? Math.min(
                MAX_PAGE_SIZE,
                Math.max(1, Number(pageSizeParam)),
            )
            : DEFAULT_PAGE_SIZE;

        // ─── Scope companies ───────────────────────────────────
        const isGroupWide = GROUP_WIDE_ROLES.includes(profile.role ?? "");
        let allowedCompanyIds: number[];

        if (isGroupWide) {
            const { data: shops } = await supabase
                .from("shops")
                .select("odoo_company_id")
                .not("odoo_company_id", "is", null);
            allowedCompanyIds = [
                ...new Set(
                    (shops ?? [])
                        .map((s) => s.odoo_company_id)
                        .filter((id): id is number => typeof id === "number"),
                ),
            ];
        } else {
            allowedCompanyIds = Array.isArray(profile.assigned_companies)
                ? (profile.assigned_companies as unknown[]).filter(
                    (id): id is number => typeof id === "number",
                )
                : [];
        }

        const effectiveCompanyIds =
            requestedCompanyId !== null
                ? allowedCompanyIds.includes(requestedCompanyId)
                    ? [requestedCompanyId]
                    : []
                : allowedCompanyIds;

        const emptyPayload: InventoryItemsResponse = {
            items: [],
            total: 0,
            page: 1,
            pageSize: requestedPageSize,
            sort,
        };

        if (effectiveCompanyIds.length === 0) {
            return NextResponse.json(emptyPayload);
        }

        // ─── Locations ─────────────────────────────────────────
        const { data: shopsWithLocations } = await supabase
            .from("shops")
            .select(`
                odoo_company_id,
                shop_locations ( odoo_location_id, is_active )
            `)
            .in("odoo_company_id", effectiveCompanyIds);

        const locationsByCompany = new Map<number, number[]>();
        for (const shop of shopsWithLocations ?? []) {
            const cId = shop.odoo_company_id;
            if (typeof cId !== "number") continue;
            const shopLocs = (shop.shop_locations ?? []) as Array<{
                odoo_location_id: number;
                is_active: boolean;
            }>;
            const activeIds = shopLocs
                .filter((l) => l.is_active && l.odoo_location_id > 0)
                .map((l) => l.odoo_location_id);
            if (!locationsByCompany.has(cId)) locationsByCompany.set(cId, []);
            locationsByCompany.get(cId)!.push(...activeIds);
        }
        for (const [cId, locs] of locationsByCompany.entries()) {
            locationsByCompany.set(cId, [...new Set(locs)]);
        }

        // ─── Aggregation quants par product_id ────────────────
        const quantsDomain: OdooDomain = [
            ...buildCompanyLocationDomain(
                effectiveCompanyIds,
                locationsByCompany,
                "location_id",
            ),
        ];
        if (EXCLUDED_PRODUCT_IDS.length > 0) {
            quantsDomain.push([
                "product_id",
                "not in",
                EXCLUDED_PRODUCT_IDS,
            ]);
        }

        const quantsGroups = await odooClient.readGroup<{
            product_id: [number, string] | false;
            quantity: number;
        }>("stock.quant", {
            domain: quantsDomain,
            fields: ["quantity:sum"],
            groupby: ["product_id"],
            lazy: false,
        });

        if (quantsGroups.length === 0) {
            return NextResponse.json(emptyPayload);
        }

        const qtyByProduct = new Map<number, number>();
        for (const g of quantsGroups) {
            if (!Array.isArray(g.product_id)) continue;
            const pid = g.product_id[0];
            const qty = Number(g.quantity ?? 0);
            if (Math.abs(qty) < 0.001) continue;
            qtyByProduct.set(pid, qty);
        }

        if (qtyByProduct.size === 0) {
            return NextResponse.json(emptyPayload);
        }

        // ─── Fetch product details ─────────────────────────────
        const productIds = Array.from(qtyByProduct.keys());

        const products = await odooClient.searchRead<{
            id: number;
            name: string;
            barcode: string | false;
            default_code: string | false;
            list_price: number;
            standard_price: number;
            x_studio_segment: string | false;
            x_studio_many2one_field_21bvh: [number, string] | false;
            x_studio_many2one_field_Arl5D: [number, string] | false;
        }>("product.product", {
            domain: [["id", "in", productIds]],
            fields: [
                "name",
                "barcode",
                "default_code",
                "list_price",
                "standard_price",
                "x_studio_segment",
                "x_studio_many2one_field_21bvh",
                "x_studio_many2one_field_Arl5D",
            ],
            limit: productIds.length,
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // ─── Build items ───────────────────────────────────────
        const allItems: InventoryItemRow[] = [];
        const searchLower = searchParam.toLowerCase();

        for (const [pid, qty] of qtyByProduct.entries()) {
            const prod = productMap.get(pid);
            if (!prod) continue;

            const productSegment =
                typeof prod.x_studio_segment === "string"
                    ? prod.x_studio_segment
                    : "";

            // Filtre segment
            if (segment !== "Tous") {
                if (
                    productSegment.trim().toLowerCase() !==
                    segment.toLowerCase()
                ) {
                    continue;
                }
            }

            const listPrice = Number(prod.list_price ?? 0);
            const standardPrice = Number(prod.standard_price ?? 0);
            const saleUnit = resolveSaleUnitPrice(listPrice, productSegment);
            const costUnit = resolveCostUnitPrice(standardPrice, listPrice);

            const barcode =
                typeof prod.barcode === "string" && prod.barcode.trim()
                    ? prod.barcode.trim()
                    : typeof prod.default_code === "string" &&
                        prod.default_code.trim()
                        ? prod.default_code.trim()
                        : null;

            const brand = extractMany2oneName(
                prod.x_studio_many2one_field_21bvh,
            );

            // Extraction color
            const colorRaw = prod.x_studio_many2one_field_Arl5D;
            const colorName =
                Array.isArray(colorRaw) && typeof colorRaw[1] === "string"
                    ? colorRaw[1]
                    : null;

            // Filtre search
            if (searchLower) {
                const haystack = [
                    prod.name,
                    barcode ?? "",
                    brand ?? "",
                    colorName ?? "",
                ]
                    .join(" ")
                    .toLowerCase();
                if (!haystack.includes(searchLower)) continue;
            }

            allItems.push({
                productId: pid,
                productName: prod.name,
                barcode,
                brand,
                color: colorName,
                segment: productSegment || null,
                quantity: qty,
                saleUnit,
                costUnit,
                saleValue: qty * saleUnit,
                costValue: qty * costUnit,
                marginValue: qty * (saleUnit - costUnit),
            });
        }

        // ─── Sort + paginate ───────────────────────────────────
        const sorted = sortItems(allItems, sort);
        const total = sorted.length;
        const totalPages = Math.max(1, Math.ceil(total / requestedPageSize));
        const safePage = Math.min(requestedPage, totalPages);
        const start = (safePage - 1) * requestedPageSize;
        const paginated = sorted.slice(start, start + requestedPageSize);

        const payload: InventoryItemsResponse = {
            items: paginated,
            total,
            page: safePage,
            pageSize: requestedPageSize,
            sort,
        };

        return NextResponse.json(payload);
    } catch (error) {
        console.error("[INVENTORY_ITEMS_API]", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : "Erreur serveur",
            },
            { status: 500 },
        );
    }
}