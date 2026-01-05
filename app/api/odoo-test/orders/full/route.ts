// app/api/odoo-test/orders/full/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, partnerId, orderDate, lines, amount, paymentMethodId } = body;

    // Construction dynamique des lignes (pos.order.line)
    // Syntaxe Odoo : [0, 0, { valeurs }]
    const orderLines = lines.map((line: any) => [0, 0, {
        product_id: line.product_id,
        qty: line.qty,
        price_unit: line.price_unit,
        price_subtotal: line.qty * line.price_unit,
        price_subtotal_incl: line.qty * line.price_unit, // Simplifié (hors taxe gestion fine)
    }]);

    const orderData = {
      name: `POS-App-${Date.now()}`,
      session_id: sessionId,
      date_order: orderDate, 
      partner_id: partnerId || false,
      amount_total: amount,
      amount_tax: 0,
      amount_paid: amount,
      amount_return: 0,
      
      lines: orderLines,

      // Paiement immédiat pour valider la commande
      payment_ids: [
        [0, 0, {
            amount: amount,
            payment_method_id: paymentMethodId,
            payment_date: orderDate
        }]
      ]
    };

    const orderId = await odooCall('pos.order', 'create', [orderData]);

    return NextResponse.json({ success: true, orderId });
  } catch (error: any) {
    console.error("Erreur création full order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}