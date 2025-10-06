import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log(body);

        return NextResponse.json({success: true,});
    } catch (error: unknown) {
        console.error('❌ Webhook Error:', error);
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}