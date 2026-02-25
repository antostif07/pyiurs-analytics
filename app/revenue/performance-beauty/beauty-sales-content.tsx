import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { BeautyTrendTable } from "@/components/revenue/beauty-trend-table";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { fr } from "date-fns/locale";

function chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

const monthMap: Record<string, string> = {
  janvier: "01",
  février: "02",
  mars: "03",
  avril: "04",
  mai: "05",
  juin: "06",
  juillet: "07",
  août: "08",
  septembre: "09",
  octobre: "10",
  novembre: "11",
  décembre: "12",
};

function parseOdooMonth(odooMonth: string): string {
  const [monthName, year] = odooMonth.toLowerCase().split(" ");
  return `${year}-${monthMap[monthName]}`;
}

function ensureTrackerEntry(tracker: Map<string, any>, hsCode: string, name = "Produit inconnu") {
    if (!tracker.has(hsCode)) {
        tracker.set(hsCode, {
            hs_code: hsCode,
            name,
            monthlySales: {},
            monthlyStockOpening: {},
            currentStock: 0
        });
    } else {
        const entry = tracker.get(hsCode);

        if (!entry.monthlySales) entry.monthlySales = {};
        if (!entry.monthlyStockOpening) entry.monthlyStockOpening = {};
        if (!entry.currentStock) entry.currentStock = 0;
    }

    return tracker.get(hsCode);
}

async function getDataSixMonthSales(month: string, year: string, productIds: number[], products: any[]) {
    const selectedDate = new Date(Number(year), Number(month) - 1); // JS months are 0-indexed    

    // 1. Générer les 6 derniers mois pour les filtres et les colonnes
    const monthRange = Array.from({ length: 6 }, (_, i) => subMonths(selectedDate, i)).reverse();
    const startDate = format(startOfMonth(monthRange[0]), 'yyyy-MM-dd 00:00:00');
    const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd 23:59:59');

    const tracker = new Map<string, any>();
    const productMap = new Map<number, any>();
    const productToHs = new Map<number, string>();
    products.forEach(p => productMap.set(p.id, p));
    products.forEach(p => {
        const hs = p.hs_code || "SANS-HS";
        productToHs.set(p.id, hs);
    });

    try {
        let salesDomain = [
            ["order_id.state", "in", ["paid", "done", "invoiced"]],
            ["create_date", ">=", startDate],
            ["create_date", "<=", endDate]
        ]

        const chunkedProductIds = chunkArray(productIds, 2000);
        let salesLines: any[] = [];
        
        for (const chunk of chunkedProductIds) {
            const chunkDomain = [...salesDomain, ["product_id.id", "in", chunk]];
            const lines = await odooClient.execute("pos.order.line", "read_group", [
                chunkDomain,
                ["price_subtotal_incl", "product_id"],
                ["product_id", "create_date:month"], // Double groupement
            ], { lazy: false }) as any[];
            salesLines = [...salesLines, ...lines];
        }

        salesLines.forEach(line => {
            const pInfo = productMap.get(line.product_id[0]);
            if (!pInfo) return;

            const hsCode = pInfo.hs_code || "SANS-HS";
            const cleanName = pInfo.name.split('[')[0].trim();

            const odooMonth = line['create_date:month'];

            const entry = ensureTrackerEntry(tracker, hsCode, cleanName);
            const monthMatch = monthRange.find(m => 
                odooMonth.toLowerCase().includes(format(m, 'MMMM', { locale: fr }).toLowerCase())
            );
            if (monthMatch) {
                const monthKey = format(monthMatch, 'yyyy-MM');
                entry.monthlySales[monthKey] = (entry.monthlySales[monthKey] || 0) + line.price_subtotal_incl;
            }
        });

        let stockMoves: any[] = [];
        for (const chunk of chunkedProductIds) {
            const chunkDomain = [
                ["product_id.id", "in", chunk],
                ["date", "<=", endDate],
                ["picking_code", "in", ["outgoing", "incoming"]],
            ];
            const moves = await odooClient.execute("stock.move", "read_group", [
                chunkDomain,
                ["product_uom_qty"],
                ["product_id", "date:month", "picking_code"],
            ], { lazy: false }) as any[];
            stockMoves = [...stockMoves, ...moves];
        }

        console.log(stockMoves);
        

        const selectedMonthKey = format(selectedDate, "yyyy-MM");
        const monthKeys = monthRange.map(m => format(m, "yyyy-MM"));
        const moveTracker = new Map<string, Record<string, number>>();
        
        stockMoves.forEach(move => {
            const productId = move.product_id[0];
            const hsCode = productToHs.get(productId);
            if (!hsCode) return;

            const monthKey = parseOdooMonth(move["date:month"]);
            const pickingCode = move.picking_code;
            const qty = move.product_uom_qty;

            if (!moveTracker.has(hsCode)) {
                moveTracker.set(hsCode, {});
            }

            const hsMoves = moveTracker.get(hsCode)!;
            const signedQty = pickingCode === "incoming" ? qty : -qty;
            hsMoves[monthKey] = (hsMoves[monthKey] || 0) + signedQty;
        });

        moveTracker.forEach((months, hsCode) => {
            const firstProduct = products.find(p => p.hs_code === hsCode);
            const cleanName = firstProduct?.name.split('[')[0].trim() || "Produit";

            const entry = ensureTrackerEntry(tracker, hsCode, cleanName);

            monthKeys.forEach(currentMonth => {

                let stockBeforeMonth = 0;

                Object.entries(months).forEach(([moveMonth, qty]) => {

                    // si mouvement STRICTEMENT avant le mois courant
                    if (moveMonth < currentMonth) {
                        stockBeforeMonth += qty;
                    }
                });

                entry.monthlyStockOpening[currentMonth] = stockBeforeMonth;

                // si c'est le mois sélectionné → stock actuel
                if (currentMonth === selectedMonthKey) {
                    entry.currentStock = stockBeforeMonth;
                }
            });
        });
        
        return {
            clients: Array.from(tracker.values()), 
            columns: monthRange.map(d => ({
                key: format(d, 'yyyy-MM'),
                label: format(d, 'MMM yy', { locale: fr }).toUpperCase()
            }))};
    } catch (error) {
        console.error(error);
        return { clients: [], columns: [] };
    }
}

export default async function BeautySalesContent({ month, year, productIds, products }: { 
    month: string, year: string,
    productIds: number[], products: any[]
}) {
    const { clients, columns } = await getDataSixMonthSales(month, year, productIds, products);

    console.log(clients);
    
    return <BeautyTrendTable data={clients} months={columns} />;
}