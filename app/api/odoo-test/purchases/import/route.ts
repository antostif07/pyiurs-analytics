// app/api/odoo-test/purchases/import/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client'; // Vérifie que ce chemin est correct pour ton projet
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { orders } = await req.json();

    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: "Aucune commande fournie" }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const order of orders) {
      try {
        const historyDate = order.date;

        // --- 1. PRÉPARATION DES LIGNES ---
        const orderLines = order.lines.map((line: any) => {
            const lineData: any = {
                product_id: Number(line.product_id),
                product_qty: Number(line.qty),
                price_unit: Number(line.price_unit),
                date_planned: historyDate,
            };

            // FIX ODOO 19 : Utilisation de 'tax_ids' (Many2many)
            if (line.tax_id) {
                lineData.tax_ids = [[6, 0, [Number(line.tax_id)]]];
            }

            return [0, 0, lineData];
        });

        const purchaseVals: any = {
            partner_id: Number(order.partner_id),
            date_order: historyDate,
            order_line: orderLines,
            currency_id: order.currency_id ? Number(order.currency_id) : undefined,
            company_id: order.company_id ? Number(order.company_id) : undefined
        };

        // --- 2. CRÉATION (Brouillon) ---
        const purchaseId = await odooCall('purchase.order', 'create', [purchaseVals]) as number;

        // --- 3. CONFIRMATION ---
        await odooCall('purchase.order', 'button_confirm', [[purchaseId]]);
        
        // Forcer la date d'approbation (historique)
        await odooCall('purchase.order', 'write', [[purchaseId], { date_approve: historyDate }]);

        // --- 4. RÉCEPTION STOCK (Compatible Odoo 17/18/19) ---
        
        // a. Trouver le nom du PO
        const poDetails: any = await odooCall('purchase.order', 'read', [[purchaseId], ['name']]);
        const poName = poDetails[0].name;

        // b. Chercher le Picking associé (Bon de réception)
        const pickingDomain = [
            ['origin', '=', poName],
            ['state', 'not in', ['done', 'cancel']]
        ];
        if (order.company_id) {
            pickingDomain.push(['company_id', '=', Number(order.company_id)]);
        }

        const pickings: any = await odooCall('stock.picking', 'search_read', 
            [pickingDomain, ['id']]
        );

        if (pickings && pickings.length > 0) {
            const pickingId = pickings[0].id;

            // c. Récupérer les mouvements pour avoir les infos de localisation
            // On a besoin de : id, qty demandée, produit, emplacement source/dest
            const moves: any = await odooCall('stock.move', 'search_read', 
                [[['picking_id', '=', pickingId]]], 
                { fields: ['id', 'product_uom_qty', 'product_id', 'location_id', 'location_dest_id'] }
            );

            // d. Créer les lignes de mouvement (stock.move.line)
            // C'est la nouvelle méthode pour dire "J'ai tout reçu"
            for (const move of moves) {
                await odooCall('stock.move.line', 'create', [{
                    picking_id: pickingId,
                    move_id: move.id,
                    product_id: move.product_id[0],
                    quantity: move.product_uom_qty, // Champ 'quantity' remplace 'quantity_done' sur le move
                    location_id: move.location_id[0],
                    location_dest_id: move.location_dest_id[0]
                }]);
            }

            // e. Valider le transfert
            await odooCall('stock.picking', 'button_validate', [[pickingId]]);

            // f. Forcer les dates (Stock rétroactif)
            await odooCall('stock.picking', 'write', [[pickingId], { date_done: historyDate }]);
            
            const moveIds = moves.map((m: any) => m.id);
            await odooCall('stock.move', 'write', [moveIds, { date: historyDate }]);
        }

        results.success++;

      } catch (e: any) {
        console.error(`Erreur CMD ${order.temp_id}:`, e);
        results.failed++;
        results.errors.push(`CMD ${order.temp_id}: ${e.message || e}`);
      }
    }

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}