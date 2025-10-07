const processedOrders = new Set<string>();

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log("📩 Webhook reçu:", body);

        // Vérifie le modèle
        // if (body._model !== "pos.order" || !body.data) {
        //     return NextResponse.json({ message: "Not a POS event" }, { status: 200 });
        // }

        const { amount_paid, partner_id, id: orderId } = body.data || body;

        if (processedOrders.has(orderId)) {
            console.log(`⚠️ Commande ${orderId} déjà traitée, on ignore.`);
            return NextResponse.json({ success: false, duplicate: true, orderId });
        }

        processedOrders.add(orderId);

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "+243841483052",
            type: "template",
            template: {
                name: "promo_deux_achat_un_ajout",
                language: { code: "fr" },
                components: [
                    {
                        type: "header",
                        parameters: [
                            { type: "text", text: "Facture test", parameter_name: "nom_de_la_promo" }
                        ]
                    },
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: partner_id || "Client", parameter_name: "date_debut" },
                            { type: "text", text: `${amount_paid} $`, parameter_name: "prix_de_depart" },
                            { type: "text", text: partner_id || "Client", parameter_name: "date_fin" },
                        ]
                    }
                ]
            }
        };

        // 📤 Envoi du message à l'API WhatsApp Cloud
        const response = await fetch(`https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        // ✅ Vérifie le statut
        if (!response.ok) {
            console.error("❌ Erreur WhatsApp API:", result);
            return NextResponse.json({
                success: false,
                error: result.error || "Erreur lors de l'envoi WhatsApp",
            }, { status: response.status });
        }

        console.log("✅ Message WhatsApp envoyé avec succès:", result);

        return NextResponse.json({
            success: true,
            message_id: result.messages?.[0]?.id || null,
            to: payload.to,
            template: payload.template.name,
        });
    } catch (error: unknown) {
        console.error('💥 Webhook Error:', error);
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : String(error);

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
