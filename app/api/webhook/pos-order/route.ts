import { Redis } from "@upstash/redis";
import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type PayloadWhatsappMessage = {
    messaging_product: string;
    recipient_type: string;
    to: string;
    type: string;
    template?: {
        name: string;
        language: {code: string};
        components: Array<{
            type: "header" | "body" | "footer",
            parameters: Array<{
                type: string;
                text: string;
                parameter_name?: string;
            }>
        }>
    }
}

function formatPhoneNumber(rawPhone: string): string | null {
  if (!rawPhone) return null;

  // 1️⃣ Normaliser les lettres et les caractères
  let phone = rawPhone
    .replace(/[oOaA]/g, "0") // remplacer lettres par zéro
    .replace(/[^0-9+]/g, "") // garder que les chiffres et le +

  // 2️⃣ Supprimer les espaces, tirets, parenthèses, etc.
  phone = phone.trim();

  // 3️⃣ Uniformiser les formats
  if (phone.startsWith("00243")) {
    phone = "+243" + phone.slice(5);
  } else if (phone.startsWith("243")) {
    phone = "+243" + phone.slice(3);
  } else if (phone.startsWith("0")) {
    phone = "+243" + phone.slice(1);
  } else if (!phone.startsWith("+243")) {
    // Si pas de code pays, on suppose RDC
    phone = "+243" + phone;
  }

  // 4️⃣ Supprimer les doublons éventuels de code
  phone = phone.replace(/\+243\+243/g, "+243");

  // 5️⃣ Vérifier la longueur totale (ex: +243812345678 = 13 caractères)
  const digitsOnly = phone.replace(/\D/g, ""); // sans +
  if (digitsOnly.length !== 12) {
    console.warn(`⚠️ Numéro invalide (${rawPhone}) après formatage: ${phone}`);
    return null;
  }

  return phone;
}

async function getPOSConfig(id: number) {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name&domain=[["id", "=", ${id}]]`,
        { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("Erreur API Odoo - Configuration POS");
    return res.json();
}

async function getPartner(id: number) {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/res.partner?fields=id,name,phone&domain=[["id", "=", ${id}]]`,
        { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("Erreur API Odoo - Configuration POS");
    return res.json();
}

export function getBoutiqueLabel(posConfigName: string): {name: string, phone: string}|undefined {
  if (!posConfigName) return undefined;

  const name = posConfigName.toLowerCase();

  if (name.includes("24")) {
    return {name: "24", phone: "+243896139999"};
  } else if (name.includes("ktm")) {
    return {name: "Kintambo", phone: ""};
  } else if (name.includes("mto")) {
    return {name: "Météo", phone: "+243891829999"};
  } else if (name.includes("onl")) {
    return {name: "Service Livraison", phone: "+243899900151"};
  }

  return undefined;
}

async function sendMessage(payload: PayloadWhatsappMessage) {
    try {
        const response = await fetch(`https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        return result;
    } catch (error: unknown) {
        console.error('💥 Webhook Error:', error);
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : String(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { amount_paid, partner_id, id: orderId, config_id, name, create_date } = body.data || body;
        
        if (!orderId) {
            console.error("❌ orderId manquant dans le webhook");
            return NextResponse.json({ error: "orderId manquant" }, { status: 400 });
        }

        // 🔒 Vérification Redis : commande déjà traitée ?
        const alreadyProcessed = await redis.get(`pyiurs-order:${orderId}`);

        if(alreadyProcessed) {
            console.log(`⚠️ Commande ${orderId} déjà traitée, on ignore.`);
            return NextResponse.json({ success: false, duplicate: true, orderId });
        }

        // ✅ Marquer la commande comme traitée pour 10 minutes
        await redis.set(`pyiurs-order:${orderId}`, "processed", { ex: 1200 });

        const [posConfigData, partnerData] = await Promise.all([
            getPOSConfig(config_id),
            getPartner(partner_id)
        ]);

        const partner = partnerData?.records?.[0];
        const posConfig = posConfigData?.records?.[0];

        const boutique = getBoutiqueLabel(posConfig?.name);

        const clientPhone = partner?.phone || "";
        const formattedPhone = formatPhoneNumber(clientPhone);

        if (!formattedPhone) {
            console.error(`❌ Numéro client invalide: ${clientPhone}`);
            return NextResponse.json({ error: "Numéro client invalide" }, { status: 400 });
        }
        
        const payload_client: PayloadWhatsappMessage = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "template",
            template: {
                name: "envoi_details_facture",
                language: { code: "fr" },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: partner?.name || "Cher(e) Client(e)", parameter_name: "nom_client" },
                            { type: "text", text: ` ${boutique?.name}`, parameter_name: "shop_name" },
                            { type: "text", text: name, parameter_name: "numero_commande" },
                            { type: "text", text: format(create_date, "dd MMM yyyy"), parameter_name: "date_commande" },
                            { type: "text", text: `${amount_paid}$`, parameter_name: "montant_total" },
                            { type: "text", text: "Espèces", parameter_name: "mode_paiement" },
                            { type: "text", text: ` ${boutique?.name}`, parameter_name: "shop_name_2" },
                            { type: "text", text: ` ${boutique?.phone}`, parameter_name: "shop_number" },
                            { type: "text", text: `+243899900151`, parameter_name: "service_number" },
                            { type: "text", text: `info@pyiurs.com`, parameter_name: "email_support" },
                        ]
                    }
                ]
            }
        };
        
        const result = await sendMessage(payload_client)
        const resultAdmin = await sendMessage({...payload_client, to: "+243841483052"} as PayloadWhatsappMessage)

        return NextResponse.json({
            success: true,
            // message_id: result.messages?.[0]?.id || null,
            to: payload_client.to,
            template: payload_client.template?.name,
        });
    } catch (error: unknown) {
        console.error('💥 Webhook Error:', error);
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : String(error);

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
