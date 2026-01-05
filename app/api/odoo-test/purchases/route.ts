// app/api/odoo-test/purchases/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

// GET : Lister les achats récents
export async function GET() {
  try {
    const purchases = await odooCall('purchase.order', 'search_read', [], {
      fields: ['id', 'name', 'partner_id', 'amount_total', 'state', 'date_approve', 'date_order'],
      limit: 20,
      order: 'date_order desc'
    });
    return NextResponse.json(purchases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST : Créer un brouillon d'achat
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partnerId, date, currencyId, lines } = body;

    // Structure des lignes d'achat
    const orderLines = lines.map((line: any) => [0, 0, {
        product_id: Number(line.product_id),
        product_qty: Number(line.qty),
        price_unit: Number(line.price_unit),
        date_planned: date,
        // GESTION DES TAXES : Odoo attend une relation Many2many [[6, 0, [ids]]]
        taxes_id: line.tax_id ? [[6, 0, [Number(line.tax_id)]]] : [] 
    }]);

    const purchaseId = await odooCall('purchase.order', 'create', [{
        partner_id: Number(partnerId),
        currency_id: Number(currencyId), // La devise
        date_order: date,
        order_line: orderLines,
    }]);

    return NextResponse.json({ success: true, purchaseId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}