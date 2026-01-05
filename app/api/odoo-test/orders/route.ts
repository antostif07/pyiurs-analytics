// app/api/odoo-test/orders/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // On récupère la date envoyée par le front, sinon on prend la date actuelle
    const { sessionId, amount, partnerId, orderDate } = body;
    
    // Date finale (soit celle fournie, soit maintenant)
    const finalDate = orderDate ? orderDate : new Date().toISOString().replace('T', ' ').split('.')[0];

    console.log(`Création commande pour session ${sessionId} à la date ${finalDate}`);

    const orderData = {
      name: `RETRO-${Date.now()}`, // Nom unique
      session_id: sessionId,
      
      // C'EST ICI QUE LA MAGIE OPÈRE :
      date_order: finalDate,  // Force la date de la commande
      
      pos_reference: `REF-${Math.floor(Math.random() * 10000)}`,
      partner_id: partnerId || false,
      amount_total: amount,
      amount_tax: 0,
      amount_paid: amount,
      amount_return: 0,
      
      // Lignes de produits
      lines: [
        [0, 0, {
          product_id: 1, // ⚠️ Assure-toi que l'ID 1 existe (ex: "Divers")
          qty: 1,
          price_unit: amount,
          price_subtotal: amount,
          price_subtotal_incl: amount,
        }]
      ],

      // Paiements (Important : mettre la même date que la commande)
      payment_ids: [
        [0, 0, {
            amount: amount,
            payment_method_id: 1, // ⚠️ Assure-toi que l'ID 1 existe (ex: "Cash")
            payment_date: finalDate // <--- Très important pour la cohérence comptable
        }]
      ]
    };

    const orderId = await odooCall('pos.order', 'create', [orderData]);

    return NextResponse.json({ success: true, orderId, date: finalDate });
  } catch (error: any) {
    console.error("Erreur création commande:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}