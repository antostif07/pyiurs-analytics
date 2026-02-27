import { FemmeTrendTable } from "@/components/revenue/femme-trend-table";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import fs from 'fs';
import path from 'path';

interface PosLine {
  price_subtotal_incl: number;
  product_id: [number, string]; // [id, name]
  'create_date:month': string;
}

interface HsEntry {
  hs_code: string;
  name: string;
  color: string;
  monthlySales: Record<string, number>;
}

interface WomenPerformanceResult {
  products: HsEntry[];
  columns: { key: string; label: string }[];
}

function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

export async function getWomenPerformanceWithCache(
  month: string,
  year: string
): Promise<WomenPerformanceResult> {
  const selectedDate = new Date(Number(year), Number(month) - 1);

  // Générer les 6 derniers mois pour les colonnes
  const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
  const monthKeys = monthRange.map((m) => format(m, 'yyyy-MM'));

  const tracker = new Map<string, HsEntry>();
  const cacheDir = path.join(process.cwd(), 'cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
  
    // récupérer les hs_code femme
    const hsCodes = await odooClient.execute(
        "product.product",
        "read_group",
        [
            [['x_studio_segment', 'ilike', 'femme'], ["active", "=", true]],                   // aucun filtre
            ["hs_code"],          // champ à lire
            ["hs_code"]           // grouper par hs_code
        ],
        { lazy: false }
    );

    for (const monthDate of monthRange) {
        const monthKey = format(monthDate, 'yyyy-MM');
        const isCurrentMonth = monthKey === format(new Date(), 'yyyy-MM');
        const filePath = path.join(cacheDir, `femme-${monthKey}.json`);

        // Charger depuis cache si disponible et pas le mois actuel
        if (fs.existsSync(filePath) && !isCurrentMonth) {
        const monthData: HsEntry[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        monthData.forEach((entry) => {
            tracker.set(entry.hs_code, entry);
        });
        continue;
        }

        const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd 00:00:00');
        const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd 23:59:59');

        console.time(`POS_READ_GROUP_${monthKey}`);

        const sales = (await odooClient.execute(
        'pos.order.line',
        'read_group',
        [
            [
            ['order_id.state', 'in', ['paid', 'done', 'invoiced']],
            ['create_date', '>=', startDate],
            ['create_date', '<=', endDate],
            ['product_id.x_studio_segment', 'ilike', 'femme'],
            ],
            ['price_subtotal_incl', 'product_id'],
            ['product_id','create_date:month'],
        ],
        { lazy: false }
        )) as PosLine[];

        // 2. Récupérer les détails techniques des produits
        const productIds = [...new Set(sales.map(s => s.product_id[0]))];
        const productsInfo = await odooClient.searchRead("product.product", {
            domain: [["id", "in", productIds]],
            fields: ["name", "hs_code", "x_studio_many2one_field_Arl5D"] 
        }) as any[];
        

        console.timeEnd(`POS_READ_GROUP_${monthKey}`);
        console.log(`Nombre de lignes retournées pour ${monthKey}:`, sales.length);

        sales.forEach((line) => {
            const pInfo = productsInfo.find(p => p.id === line.product_id[0]);
            if (!pInfo) return;

            const hsCode = pInfo.hs_code || "SANS-HS";
            const cleanName = pInfo.name.split('[')[0].trim();
            const rawColor = pInfo.x_studio_many2one_field_Arl5D;
            const colorName = Array.isArray(rawColor) ? rawColor[1] : (rawColor || "");

            if (!tracker.has(hsCode)) {
                tracker.set(hsCode, {
                hs_code: hsCode,
                name: cleanName,
                color: colorName,
                monthlySales: {},
                });
            }
            const entry = tracker.get(hsCode)!;
            const lineMonth = format(monthDate, 'yyyy-MM');
            entry.monthlySales[lineMonth] = (entry.monthlySales[lineMonth] || 0) + line.price_subtotal_incl;
        });

        // Sauvegarder ce mois dans le cache
        const monthEntries: HsEntry[] = Array.from(tracker.values()).map((e) => ({
        hs_code: e.hs_code,
        name: e.name,
        color: e.color,
        monthlySales: { [monthKey]: e.monthlySales[monthKey] },
        }));
        fs.writeFileSync(filePath, JSON.stringify(monthEntries, null, 2));
    }

    // const products = Array.from(tracker.values());
    const columns = monthKeys.map((m) => ({ key: m, label: m }));

    return { products: [], columns };
}

export default async function WomenSegmentPerformanceContent({month, year}: {month: string; year: string;}) {
    const {products, columns} = await getWomenPerformanceWithCache(month, year);

    console.log(products[0]);

    return <FemmeTrendTable data={products} months={columns} />;
}