import { getAIStockAnalysis } from "@/lib/ai/inventory-engine";
import { odooClient } from "@/lib/odoo/xmlrpc";
import { Redis } from "@upstash/redis";
import { format, subDays } from 'date-fns';
import { after, NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { parseOdooFrenchDate } from "../utils";
import { createAdminClient } from "@/lib/supabase/admin";

const CONFIG = {
    LOW_STOCK_THRESHOLD: 12,
    SUPPORT_EMAIL: "info@pyiurs.com",
    SUPPORT_PHONE: "+243899900151",
    ADMIN_WHATSAPP: "+243841483052",
    LOCATIONS_TO_CHECK:[226, 180, 170, 160, 293, 89],
    MAIN_WAREHOUSE_ID: 226,
    // Odoo Webhook Secret (À ajouter dans tes variables d'environnement)
    WEBHOOK_SECRET: process.env.ODOO_WEBHOOK_SECRET || "DEV_SECRET_DO_NOT_USE_IN_PROD"
};

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

/**
 * Cette fonction s'exécutera APRÈS que le serveur ait répondu 200 OK à Odoo.
 * Ça évite les Timeouts Vercel et libère la connexion Odoo immédiatement.
 */
async function processOrderBackgroundJob(body: any) {
    const { amount_paid, partner_id, id: orderId, config_id, name, create_date } = body;
    
    try {
        console.log(`[BACKGROUND_JOB] Démarrage du traitement pour la commande: ${orderId}`);

        // 1. Appels Odoo Parallélisés
        const [posConfigData, partnerData, productLines] = await Promise.all([
            getPOSConfig(config_id),
            getPartner(partner_id),
            getPOSOrderLines(orderId)
        ]);

        const partner = partnerData?.records?.[0];
        const posConfig = posConfigData?.records?.[0];
        const boutique = getBoutiqueLabel(posConfig?.name);

        // --- SECTION 1 : NOTIFICATION CLIENT WHATSAPP ---
        const clientPhone = partner?.phone || "";
        const formattedPhone = formatPhoneNumber(clientPhone);

        if (formattedPhone && boutique) {
            const payload_client = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: "template",
                template: {
                    name: "envoi_details_facture",
                    language: { code: "fr" },
                    components: [{
                        type: "body",
                        parameters:[
                            { type: "text", text: partner?.name || "Client", parameter_name: "nom_client" },
                            { type: "text", text: ` ${boutique.name}`, parameter_name: "shop_name" },
                            { type: "text", text: name, parameter_name: "numero_commande" },
                            { type: "text", text: format(create_date, "dd MMM yyyy"), parameter_name: "date_commande" },
                            { type: "text", text: `${amount_paid}$`, parameter_name: "montant_total" },
                            { type: "text", text: "Espèces", parameter_name: "mode_paiement" },
                            { type: "text", text: ` ${boutique.name}`, parameter_name: "shop_name_2" },
                            { type: "text", text: ` ${boutique.phone}`, parameter_name: "shop_number" },
                            { type: "text", text: CONFIG.SUPPORT_PHONE, parameter_name: "service_number" },
                            { type: "text", text: CONFIG.SUPPORT_EMAIL, parameter_name: "email_support" },
                        ]
                    }]
                }
            };
            
            // Envoi asynchrone client + admin
            await Promise.allSettled([
                sendMessage(payload_client as any),
                sendMessage({ ...payload_client, to: CONFIG.ADMIN_WHATSAPP } as any)
            ]);
        } else {
            console.warn(`[WHATSAPP_SKIP] Impossible d'envoyer, numéro ou boutique invalide. Commande: ${orderId}`);
        }

        // --- SECTION 2 : ANALYSE DES STOCKS & INTELLIGENCE ARTIFICIELLE ---
        const supabaseAdmin = createAdminClient();
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: true,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });

        // ✅ PRO: Traitement séquentiel avec 'for...of' pour éviter d'exploser les limites de l'API Odoo
        // Contrairement à Promise.all qui lance tout en même temps.
        for (const pl of productLines?.records ||[]) {
            try {
                const product = await getProductInfo(pl.product_id[0]);
                const productRecord = product?.records?.[0];

                // ✅ PRO: Safe navigation (?.) empêchant le crash si 'records' est vide
                if (!productRecord || productRecord.x_studio_segment?.toLowerCase() !== "beauty") {
                    continue; // On passe au produit suivant
                }

                const hs_code = productRecord.hs_code;
                const productName = productRecord.name.split("[")[0];

                // Check Stock
                const quants = await odooClient.execute("stock.quant", "read_group",[
                    [["product_id.hs_code", "=", hs_code],["location_id.id", "in", CONFIG.LOCATIONS_TO_CHECK]],
                    ["quantity"], []
                ]) as any[];

                const currentStock = quants?.[0]?.quantity || 0; 

                // Si stock OK, on arrête l'analyse pour ce produit
                if (currentStock >= CONFIG.LOW_STOCK_THRESHOLD) continue;

                console.log(`[STOCK_ALERT] Lancement analyse IA pour ${productName} (Stock: ${currentStock})`);

                // Récupération historique pour l'IA
                const [sl, rM] = await Promise.all([
                    odooClient.execute("pos.order.line", "read_group", [
                        [["product_id.hs_code", "=", hs_code], ["order_id.state", "in",["paid", "done", "invoiced"]]],
                        ["qty"], ["create_date:day"]
                    ]) as Promise<any[]>,
                    odooClient.execute("stock.move", "read_group", [
                        [["product_id.hs_code", "=", hs_code], ["state", "=", "done"],["location_dest_id", "=", CONFIG.MAIN_WAREHOUSE_ID]],
                        ["product_uom_qty"],["date:day"]
                    ]) as Promise<any[]>
                ]);

                const history = {
                    sales: sl.map(s => ({ date: parseOdooFrenchDate(s["create_date:day"]), quantity: s.qty })),
                    restocks: rM.map(m => ({ date: parseOdooFrenchDate(m["date:day"]), quantity: m.product_uom_qty })),
                };

                // Appel IA Zod-validé
                const aiInsight = await getAIStockAnalysis({ productName, currentStock, history });

                // Sauvegarde Tracker
                await supabaseAdmin.from('beauty_inventory_tracker').upsert({
                    hs_code,
                    product_name_base: productName,
                    last_total_stock: currentStock,
                    ai_prediction_data: aiInsight,
                    status: currentStock <= 0 ? 'out_of_stock' : 'low_stock',
                    last_analysis_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'hs_code' });

                // Envoi Email
                await transporter.sendMail({
                    from: `"RAPPORT STOCK" <${process.env.SMTP_USER}>`,
                    to: process.env.SUPPLY_CHAIN_EMAIL,
                    cc: process.env.SUPPLY_CHAIN_EMAIL_2,
                    subject: aiInsight.email_subject,
                    html: aiInsight.email_body
                });

            } catch (err) {
                // ✅ PRO: Un produit qui plante n'empêche pas les autres produits de la même commande d'être traités
                console.error(`[PRODUCT_PROCESS_ERROR] Erreur sur le produit ${pl.product_id[0]}:`, err);
            }
        }

        console.log(`[BACKGROUND_JOB_SUCCESS] Traitement terminé pour la commande: ${orderId}`);

    } catch (error) {
        console.error(`[BACKGROUND_JOB_FATAL] Erreur majeure sur la commande ${orderId}:`, error);
    }
}

export async function POST(req: NextRequest) {
    try {
        // ✅ PRO: Vérification d'autorisation basique (Odoo doit envoyer ce token dans ses headers)
        // const authHeader = req.headers.get('authorization');
        // if (authHeader !== `Bearer ${CONFIG.WEBHOOK_SECRET}`) {
        //     console.warn("[WEBHOOK_SECURITY_BLOCK] Tentative non autorisée d'accès au webhook Odoo.");
        //     return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        // }

        const rawBody = await req.json();
        const body = rawBody.data || rawBody;
        const orderId = body?.id;

        if (!orderId) {
            return NextResponse.json({ error: "orderId manquant" }, { status: 400 });
        }

        // 🔒 Vérification Redis (Empêche les doublons si Odoo retry)
        const redisKey = `pyiurs-order:${orderId}`;
        const alreadyProcessed = await redis.get(redisKey);

        if (alreadyProcessed) {
            return NextResponse.json({ success: true, duplicate: true, orderId }, { status: 200 });
        } 
        
        // Marquer en cours de traitement pour 20 minutes (1200s)
        await redis.set(redisKey, "processed", { ex: 1200 });

        // ✅ PRO: Délégation du travail lourd en arrière-plan (Next.js 15)
        after(() => {
            processOrderBackgroundJob(body);
        });

        // ✅ PRO: Réponse ultra-rapide à Odoo (évite le timeout de leur côté et bloque les retries intempestifs)
        return NextResponse.json({
            success: true,
            message: "Commande reçue, traitement en arrière-plan démarré.",
            orderId
        }, { status: 202 }); // 202 Accepted = Reçu mais traitement asynchrone

    } catch (error: unknown) {
        console.error('[WEBHOOK_FATAL_ERROR]', error);
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}

