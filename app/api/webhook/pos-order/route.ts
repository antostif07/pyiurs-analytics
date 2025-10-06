import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log(body);

        return NextResponse.json({success: true,});
    } catch (error: any) {
        console.error('❌ Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}