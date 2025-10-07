import { NextRequest, NextResponse } from 'next/server';

// Cache temporaire en mémoire
const processedOrders = new Set<string>();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log(body);

        if (body._model !== "pos.order" || !body.data) {
            return NextResponse.json({ message: "Not a POS event" }, { status: 200 });
        }

        const order = body.data;

        const orderId = order.id || order.name;

        // 1️⃣ Vérifie si cette commande a déjà été traitée
        if (processedOrders.has(orderId)) {
            console.log(`Commande ${orderId} déjà traitée.`);
            return NextResponse.json({ success: false, message: "Already processed" });
        }

        // 2️⃣ Ajoute dans le cache
        processedOrders.add(orderId);

        return NextResponse.json({success: true,});
    } catch (error: unknown) {
        console.error('❌ Webhook Error:', error);
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}