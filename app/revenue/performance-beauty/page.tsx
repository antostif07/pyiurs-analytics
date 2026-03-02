import { RevenueDateFilter } from "@/components/revenue/revenue-date-filter";
import { format } from "date-fns";
import { Suspense } from "react";
import Loader from "@/components/loader";
import BeautySalesContent from "./beauty-sales-content";
import RevenueSmart, { dataToOptions } from "@/components/revenue/revenue-smart";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { RevenueSmartFilter } from "@/components/revenue/revenue-smart-filter";

async function getPurchasesLines(filters: any) {
    let allLines: any[] = [];
    let offset = 0;
    let domain = [['product_id.x_studio_segment', 'ilike', "beauty"]];

    if(filters.q) {
        domain.push(['product_id.name', 'ilike', filters.q]);
    }
    if(filters.category) {
        const cat = filters.category.split(',');
        domain.push(['product_id.categ_id.id', 'in', cat]);
    }

    while (true) {
        const chunk = await odooClient.searchRead("purchase.order.line", {
            domain: domain,
            fields: ["product_id", "product_qty", "price_unit", "order_id",],
            limit: 20000, offset
        }) as any[];
        allLines = [...allLines, ...chunk];
        if (chunk.length < 20000) break;
        offset += 20000;
    }

    return allLines
}

async function getPurchases(ids: number[]) {
    let allPurchases: any[] = [];
    let offset = 0;
    let domain = [
        ['id', 'in', ids],
        ['partner_id', 'not in', [24099, 28907, 1, 23705, 28987]]
    ];

    const chunks = chunkArray(ids, 1000); // Odoo peut gérer des chunks de 1000 IDs pour éviter les problèmes de performance

    for (const chunk of chunks) {
        const chunkDomain = [
            ['id', 'in', chunk],
            ['partner_id', 'not in', [24099, 28907, 1, 23705, 28987]]
        ];
        const purchasesChunk = await odooClient.searchRead("purchase.order", {
            domain: chunkDomain,
            fields: ["id", "date_order", "partner_id"],
            limit: 20000, offset: 0
        }) as any[];
        allPurchases = [...allPurchases, ...purchasesChunk];
    }

    return allPurchases
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

async function getProducts(ids: any) {
    let allProducts: any[] = [];
    let offset = 0;
    let domain = [['x_studio_segment', 'ilike', "beauty"], ['id', 'in', ids]];

    const chunks = chunkArray(ids, 1000); // Odoo peut gérer des chunks de 1000 IDs pour éviter les problèmes de performance

    for (const chunk of chunks) {
        const chunkDomain = [['x_studio_segment', 'ilike', "beauty"], ['id', 'in', chunk]];
        const productsChunk = await odooClient.searchRead("product.product", {
            domain: chunkDomain,
            fields: ["hs_code", "name", "x_studio_many2one_field_Arl5D", 'categ_id', 'x_studio_many2one_field_21bvh'],
            limit: 20000, offset: 0
        }) as any[];
        allProducts = [...allProducts, ...productsChunk];
    }

    return allProducts
}

function getUniqueCategories(products: any[]) {
    const uniqueCategories = Array.from(
        new Map(
            products
            .filter(p => p.categ_id)
            .map(p => [p.categ_id[0], p.categ_id[1]])
        )
    ).map(([id, name]) => ({ id, name }));

    return uniqueCategories;
}

function getUniqueColors(products: any[]) {
    const uniqueColors = Array.from(
        new Map(
            products
            .filter(p => p.x_studio_many2one_field_Arl5D)
            .map(p => [p.x_studio_many2one_field_Arl5D[0], p.x_studio_many2one_field_Arl5D[1]])
        )
    ).map(([id, name]) => ({ id, name }));

    return uniqueColors;
}

function getUniqueBrands(products: any[]) {
    const uniqueBrands = Array.from(
        new Map(
            products
            .filter(p => p.x_studio_many2one_field_21bvh)
            .map(p => [p.x_studio_many2one_field_21bvh[0], p.x_studio_many2one_field_21bvh[1]])
        )
    ).map(([id, name]) => ({ id, name }));

    return uniqueBrands;
}

function getUniqueSuppliers(purchases: any[]) {
    const uniqueSuppliers = Array.from(
        new Map(
            purchases
            .filter(p => p.partner_id)
            .map(p => [p.partner_id[0], p.partner_id[1]])
        )
    ).map(([id, name]) => ({ id, name }));

    return uniqueSuppliers;
}

async function getData(filters: any) {
    const purchaseLines = await getPurchasesLines(filters);
    const purchaseIds = Array.from(new Set(purchaseLines.map(line => line.order_id[0])));
    const productsIds = Array.from(new Set(purchaseLines.map(line => line.product_id[0])));
    
    const products = await getProducts(productsIds);
    const productMap = new Map(products.map(p => [p.id, p]));
    const purchases = await getPurchases(purchaseIds);

    const categories = getUniqueCategories(products);
    const colors = getUniqueColors(products);
    const suppliers = getUniqueSuppliers(purchases);
    const brands = getUniqueBrands(products);


    return {categories, colors, suppliers, brands, productsIds, products}
}

export default async function BeautySalesTrendPage({ searchParams }: any) {
    const params = await searchParams;
    const month = params.month || format(new Date(), "MM");
    const year = params.year || format(new Date(), "yyyy");

    const filters = {
        q: params.q,
        color: params.color,
        category: params.category,
        partner: params.partner
    };

    const {categories, colors, suppliers, brands, productsIds, products} = await getData(filters);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div className="flex-1 w-full space-y-4">
                    <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">
                        Trend <span className="text-rose-600">Beauty</span> 6 Mois
                    </h1>
                    <RevenueSmartFilter 
                        categories={dataToOptions(categories)}
                        colors={dataToOptions(colors)} 
                        suppliers={dataToOptions(suppliers)}
                        brands={dataToOptions(brands)}
                    />
                </div>
                <RevenueDateFilter />
            </div>
            <Suspense key={`${month}-${year}-${JSON.stringify(filters)}`} fallback={<Loader placeholder="Chargement des données de performance..." />}>
                {/* <BeautySalesContent month={month} year={year} productIds={productsIds} products={products} /> */}
            </Suspense>
        </div>
    );
}