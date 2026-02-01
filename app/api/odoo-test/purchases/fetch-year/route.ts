// app/api/odoo-test/purchases/fetch-year/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { year, companyId } = await req.json();
    const targetYear = Number(year);

    console.log(`Fetch Achats ${targetYear} (Company: ${companyId})...`);

    // 1. DOMAINE AVEC FILTRE COMPAGNIE
    const domain: any[] = [
        ['date_order', '>=', `${targetYear}-01-01 00:00:00`],
        ['date_order', '<=', `${targetYear}-12-31 23:59:59`],
        ['state', 'in', ['purchase', 'done']]
    ];

    if (companyId) {
        domain.push(['company_id', '=', Number(companyId)]);
    }
    
    const fieldsOrder = ['id', 'name', 'partner_id', 'date_order', 'order_line', 'currency_id', 'company_id'];

    const orders: any = await odooCall('purchase.order', 'search_read', 
        [domain, fieldsOrder], 
        { limit: 2000 }
    );

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // 2. LIGNES
    const allLineIds = orders.flatMap((o: any) => o.order_line);
    const lineDetails: any[] = [];
    const chunkSize = 1000;
    
    // Note: On utilise 'tax_ids' pour Odoo 19, repasse à 'taxes_id' si erreur
    const fieldsLine = ['order_id', 'product_id', 'product_qty', 'price_unit', 'tax_ids']; 
    
    for (let i = 0; i < allLineIds.length; i += chunkSize) {
        const batchIds = allLineIds.slice(i, i + chunkSize);
        try {
            const batchLines: any = await odooCall('purchase.order.line', 'read', [batchIds, fieldsLine]);
            if (Array.isArray(batchLines)) lineDetails.push(...batchLines);
        } catch (e) {
            console.warn("Erreur lecture lignes:", e);
        }
    }

    const linesMap = new Map(lineDetails.map((l: any) => [l.id, l]));

    const formattedOrders = orders.map((o: any) => {
        const fullLines = o.order_line.map((lineId: number) => {
            const l = linesMap.get(lineId);
            if (!l) return null;
            
            // Gestion Taxes
            let taxId = null;
            if (l.tax_ids && l.tax_ids.length > 0) taxId = l.tax_ids[0];
            
            return {
                product_id: l.product_id[0],
                qty: l.product_qty,
                price_unit: l.price_unit,
                tax_id: taxId
            };
        }).filter((l: any) => l !== null);

        return {
            temp_id: `DUPLICATE-${o.id}`,
            partner_id: o.partner_id ? o.partner_id[0] : false,
            date: o.date_order,
            currency_id: o.currency_id ? o.currency_id[0] : null,
            company_id: o.company_id ? o.company_id[0] : null, // On garde la compagnie d'origine
            lines: fullLines
        };
    });

    return NextResponse.json({ count: formattedOrders.length, orders: formattedOrders });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}