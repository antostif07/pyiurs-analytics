// app/api/configs/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // On cherche tous les points de vente disponibles
    const configs = await odooCall('pos.config', 'search_read', [], {
      fields: ['id', 'name'],
    });
    return NextResponse.json(configs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}