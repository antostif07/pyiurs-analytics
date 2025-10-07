import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        console.log(body);
        const {amount_paid, partner_id} = body

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: "+243985976862",
            type: "template",
            template: {
                "name": "promo_deux_achat_un_ajout",
                "language": {
                    "code": "fr"
                },
                "components": [
                    {
                        type: "header",
                        parameters: [
                            {
                                type: "text",
                                parameter_name: "nom_de_la_promo",
                                text: "Facture test"
                            }
                        ]
                    },
                    {
                        type: "body",
                        parameters: [
                            {
                                "type": "text",
                                "parameter_name": "date_debut",
                                "text": partner_id,
                            },
                            {
                                "type": "text",
                                "parameter_name": "prix_de_depart",
                                "text": `${amount_paid} $`
                            },
                            {
                                "type": "text",
                                "parameter_name": "date_fin",
                                "text": partner_id,
                            },
                        ]
                    }
                ]
            }
        }
        

        if (body._model !== "pos.order" || !body.data) {
            return NextResponse.json({ message: "Not a POS event" }, { status: 200 });
        }

        await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });
        // const order = body.data;

        // const orderId = order.id || order.name;

        return NextResponse.json({success: true,});
    } catch (error: unknown) {
        console.error('❌ Webhook Error:', error);
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}