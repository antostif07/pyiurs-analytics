// app/api/odoo-test/companies/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // On récupère ID et Nom des sociétés accessibles
    const companies = await odooCall('res.company', 'search_read', [], {
      fields: ['id', 'name'],
    });
    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}