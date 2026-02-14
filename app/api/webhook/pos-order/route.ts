import { getAIStockAnalysis } from "@/lib/ai/inventory-engine";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { Redis } from "@upstash/redis";
import { format, subDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { parseOdooFrenchDate } from "../utils";
import { createAdminClient } from "@/lib/supabase/admin";

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
    if (!res.ok) {
        console.log(res);
        
        throw new Error("Erreur API Odoo - Configuration POS");
    }
    return res.json();
}

async function getPOSOrderLines(posOrderId: number) {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,name,product_id&domain=[["order_id.id", "=", ${posOrderId}]]`,
        { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("Erreur API Odoo - Configuration POS");
    return res.json();
}

async function getProductInfo(id: number) {
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.product?fields=id,name,x_studio_segment,hs_code&domain=[["id", "=", ${id}]]`,
        { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("Erreur API Odoo - Product Product");
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

  if(name.includes("pb. onl facturation")){
    return undefined;
  }

  if (name.includes("24")) {
    return {name: "24", phone: "+243896139999"};
  } else if (name.includes("ktm")) {
    return {name: "Kintambo", phone: ""};
  } else if (name.includes("mto")) {
    return {name: "Météo", phone: "+243891829999"};
  } else if (name.includes("lmb")) {
    return {name: "Lemba", phone: "+243843799999"};
  }else if (name.includes("onl")) {
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
        console.log(errorMessage);
        
    }
}

const supabaseAdmin = createAdminClient();

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
        } else {
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
            
            if(boutique){
                await sendMessage(payload_client);
            }
            await sendMessage({...payload_client, to: "+243841483052"} as PayloadWhatsappMessage)
        }

        // Send Report
        const productLines = await getPOSOrderLines(orderId);
        // const startDate = format(subDays(new Date(), 60), 'yyyy-MM-dd HH:mm:ss');

        await Promise.all(
            productLines.records.map(async (pl: {id: number, product_id: [number, string]}) => {
                const product = await getProductInfo(pl.product_id[0])
                const productName = product.records[0].name.split("[")[0];

                if(product.records && product.records[0].x_studio_segment.toLowerCase() === "beauty" ) {
                    const hs_code = product.records[0].hs_code;

                    // 1. Récupération du stock réel via stock.quant
                    const quants = await odooClient.execute("stock.quant", "read_group", [
                        [
                            ["product_id.hs_code", "=", hs_code],
                            ["location_id.id", "in", [226, 180, 170, 160, 293, 89]]
                        ],
                        ["quantity"],
                        []
                    ]) as any[];

                    const currentStock = quants[0]?.quantity || 0; 

                    // 2. Si le stock est bas, on lance l'IA et on synchronise le Tracker
                    if(currentStock < 12) {
                        const sl = await odooClient.execute("pos.order.line", "read_group",[
                            [
                                ["product_id.hs_code", "=", hs_code],
                                ["order_id.state", "in", ["paid", "done", "invoiced"]],
                                // ["create_date", ">=", startDate]
                            ],
                            ["qty"],
                            ["create_date:day"]
                        ]) as Array<{"create_date:day": string; qty: number}>

                        const lines = sl.map(s => ({date: parseOdooFrenchDate(s["create_date:day"]), qty: s.qty}))

                        const rM = await odooClient.execute("stock.move", "read_group", [
                            [
                                ["product_id.hs_code", "=", product.records[0].hs_code],
                                ["state", "=", "done"],
                                // ["date", ">=", startDate],
                                ["location_dest_id", "=", 226]
                            ],
                            ["product_uom_qty"],
                            ["date:day"]
                        ]) as Array<{"date:day": string; product_uom_qty: number}>

                        const moves = rM.map(m => ({date: parseOdooFrenchDate(m["date:day"]), qty: m.product_uom_qty}))
                    
                        const history = {
                            sales: lines,
                            restocks: moves,
                        };

                        const aiInsight = await getAIStockAnalysis({
                            productName,
                            currentStock,
                            history: history
                        });

                        const { error: trackerError } = await supabaseAdmin
                            .from('beauty_inventory_tracker')
                            .upsert({
                                hs_code: hs_code,
                                product_name_base: productName,
                                last_total_stock: currentStock,
                                ai_prediction_data: aiInsight,
                                status: currentStock <= 0 ? 'out_of_stock' : 'low_stock',
                                last_analysis_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'hs_code' });

                        if (trackerError) console.error("❌ Erreur Sync Tracker:", trackerError);
                        
                        const transporter = nodemailer.createTransport({
                            host: process.env.SMTP_HOST,
                            port: Number(process.env.SMTP_PORT),
                            secure: true,
                            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
                        });

                        await transporter.sendMail({
                            from: `"RAPPORT STOCK" <${process.env.SMTP_USER}>`,
                            to: process.env.SUPPLY_CHAIN_EMAIL,
                            cc: process.env.SUPPLY_CHAIN_EMAIL_2,
                            subject: aiInsight.email_subject,
                            html: aiInsight.email_body
                        });
                    }
                }
            })
        )

        return NextResponse.json({
            success: true,
        });
    } catch (error: unknown) {
        console.error('💥 Webhook Error:', error);
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message: string }).message
            : String(error);

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

