// app/api/odoo-test/purchases/receive/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { purchaseName, receptionDate } = await req.json();
    // purchaseName est souvent le champ 'origin' du picking (ex: P00012)

    // 1. Trouver le picking lié à cet achat
    // Le champ 'origin' contient le nom du PO
    const pickings: any = await odooCall('stock.picking', 'search_read', [
        ['origin', '=', purchaseName],
        ['state', 'not in', ['done', 'cancel']] // On cherche ceux pas encore finis
    ], { fields: ['id', 'name', 'move_ids_without_package'] });

    if (!pickings || pickings.length === 0) {
        return NextResponse.json({ error: "Aucune réception en attente trouvée pour cet achat." }, { status: 404 });
    }

    const pickingId = pickings[0].id;

    // 2. Remplir les quantités (Dire qu'on a tout reçu)
    // On doit dire à Odoo : "Quantité Faite" = "Quantité Demandée"
    // Cela se fait souvent via une méthode immediate_transfer ou en éditant les lignes.
    // Méthode robuste : Modifier les stock.move.line
    
    // Récupérer les lignes de mouvement
    const moves: any = await odooCall('stock.move', 'search_read', [
        ['picking_id', '=', pickingId]
    ], { fields: ['id', 'product_uom_qty'] });

    for (const move of moves) {
        await odooCall('stock.move', 'write', [
            [move.id],
            { quantity_done: move.product_uom_qty } // On valide tout
        ]);
    }

    // 3. Valider le Picking
    await odooCall('stock.picking', 'button_validate', [[pickingId]]);

    // 4. RETROACTIVE MAGIC : Changer la date effective du transfert
    // Il faut changer la date sur le Picking ET sur les Mouvements de stock
    // C'est ça qui corrige la valorisation du stock à date passée.
    
    await odooCall('stock.picking', 'write', [
        [pickingId],
        { 
            date_done: receptionDate, // Date de réalisation
        }
    ]);

    // Mettre à jour les mouvements comptables/stock sous-jacents
    const moveIds = moves.map((m: any) => m.id);
    await odooCall('stock.move', 'write', [
        moveIds,
        { date: receptionDate }
    ]);

    // Note : Idéalement, il faut aussi mettre à jour les account.move (pièces comptables) 
    // générés par le stock, mais cela demande les droits comptables avancés.
    // Changer stock.move.date est suffisant pour le rapport de stock.

    return NextResponse.json({ success: true, pickingId });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}