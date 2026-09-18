import { findProductsByBarcode } from '@/app/scan-product/_lib/scan-service';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';         // fetch + AbortController OK
export const dynamic = 'force-dynamic';  // pas de cache Next.js

export async function GET(req: NextRequest) {
    const barcode = req.nextUrl.searchParams.get('barcode')?.trim();

    if (!barcode) {
        return NextResponse.json(
            { error: 'Paramètre "barcode" manquant.' },
            { status: 400 }
        );
    }

    try {
        const products = await findProductsByBarcode(barcode);

        if (!products) {
            return NextResponse.json({ found: false }, { status: 404 });
        }

        return NextResponse.json({ found: true, products });
    } catch (error) {
        console.error('[api/scan-product]', error);
        const message =
            error instanceof Error ? error.message : 'Erreur inconnue côté Odoo.';
        return NextResponse.json(
            { error: message },
            { status: 502 }
        );
    }
}