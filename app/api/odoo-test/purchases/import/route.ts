// app/api/odoo-test/purchases/import/route.ts
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

    for (const order of orders) {
      try {
        // Construction des lignes de commande (One2many)
        const orderLines = order.lines.map((line: any) => [0, 0, {
            product_id: Number(line.product_id),
            product_qty: Number(line.qty),
            price_unit: Number(line.price_unit),
            date_planned: order.date, // Date prévue = Date commande
            // Gestion des taxes (Many2many) : [[6, 0, [ids]]]
            taxes_id: line.tax_id ? [[6, 0, [Number(line.tax_id)]]] : []
        }]);

        const purchaseData = {
            partner_id: Number(order.partner_id),
            date_order: order.date, // Date forcée
            order_line: orderLines,
            // Optionnel : ajouter currency_id si présent
            ...(order.currency_id && { currency_id: Number(order.currency_id) })
        };

        // 1. Création de la commande
        const purchaseId = await odooCall('purchase.order', 'create', [purchaseData]);

        // OPTIONNEL : Auto-confirmation pour historique
        // Si tu veux que les commandes soient directement confirmées (Bon de commande) :
        // await odooCall('purchase.order', 'button_confirm', [[purchaseId]]);
        // await odooCall('purchase.order', 'write', [[purchaseId], { date_approve: order.date }]);

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