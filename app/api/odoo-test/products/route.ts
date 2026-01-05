// app/api/odoo-test/products/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const id = searchParams.get('id'); // Nouveau paramètre

  try {
    let domain: any[] = [];

    if (id) {
        // Recherche exacte par ID
        domain = [['id', '=', Number(id)]];
    } else if (search) {
        // Recherche textuelle
        domain = ['|', '|', ['name', 'ilike', search], ['barcode', 'ilike', search], ['default_code', 'ilike', search]];
    } else {
        // Si rien, on limite fort
        // domain = []; 
    }

    const products = await odooCall('product.product', 'search_read', [domain], {
      fields: ['id', 'display_name', 'list_price', 'barcode', 'default_code'], 
      limit: 20
    });

    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}