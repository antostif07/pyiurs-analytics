// app/api/odoo-test/import/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orders } = await req.json();

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "Aucune commande fournie" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // On traite commande par commande
    for (const order of orders) {
      try {
        // 1. Calcul des totaux (Sécurité, même si calculé au front)
        const totalAmount = order.lines.reduce((sum: number, line: any) => 
            sum + (line.qty * line.price_unit), 0);

        // 2. Structure Odoo POS Order
        const odooOrder = {
          name: `IMP-${order.temp_id}`, // Référence import
          session_id: Number(order.session_id),
          date_order: order.date,
          pos_reference: `REF-${order.temp_id}`,
          partner_id: false, // Client anonyme par défaut
          
          amount_total: totalAmount,
          amount_tax: 0,
          amount_paid: totalAmount,
          amount_return: 0,

          // Lignes Produits
          lines: order.lines.map((line: any) => [0, 0, {
            product_id: Number(line.product_id),
            qty: Number(line.qty),
            price_unit: Number(line.price_unit),
            price_subtotal: Number(line.qty * line.price_unit),
            price_subtotal_incl: Number(line.qty * line.price_unit),
          }]),

          // Paiement (1 seul paiement global pour le total)
          payment_ids: [
            [0, 0, {
              amount: totalAmount,
              payment_method_id: Number(order.payment_method_id),
              payment_date: order.date
            }]
          ]
        };

        // 3. Appel Odoo
        await odooCall('pos.order', 'create', [odooOrder]);
        results.success++;

      } catch (e: any) {
        console.error(`Erreur commande ${order.temp_id}:`, e);
        results.failed++;
        results.errors.push(`CMD ${order.temp_id}: ${e.message}`);
      }
    }

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}