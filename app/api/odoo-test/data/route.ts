// app/api/odoo-test/data/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  try {
    // 1. Charger les Clients (Ça reste global)
    const partners = await odooCall('res.partner', 'search_read', [[['customer_rank', '>', 0]]], {
      fields: ['id', 'name', 'email'],
      limit: 50
    });

    const taxFields = ['id', 'name', 'amount', 'amount_type'];
    const taxes = await odooCall('account.tax', 'search_read', 
        [[['type_tax_use', '=', 'purchase'], ['active', '=', true]], taxFields]
    );

    // 3. Devises
    const currencyFields = ['id', 'name', 'symbol', 'position'];
    const currencies = await odooCall('res.currency', 'search_read', 
        [[['active', '=', true]], currencyFields]
    );

    let paymentMethodDomain: any[] = [];

    // 2. Si on a un sessionId, on filtre les méthodes de paiement
    if (sessionId) {
      // a. Lire la session pour trouver le config_id
      // Le résultat sera du type : [{ id: 10, config_id: [5, "Main Shop"] }]
      const sessions: any = await odooCall('pos.session', 'read', [[Number(sessionId)]], {
        fields: ['config_id']
      });

      if (sessions && sessions.length > 0) {
        const configId = sessions[0].config_id[0]; // On prend l'ID (ex: 5)

        // b. Lire la config pour trouver les payment_method_ids
        const configs: any = await odooCall('pos.config', 'read', [[configId]], {
            fields: ['payment_method_ids']
        });

        if (configs && configs.length > 0) {
            const allowedPaymentIds = configs[0].payment_method_ids;
            // c. On prépare le domaine de recherche pour n'avoir que ceux-là
            paymentMethodDomain = [['id', 'in', allowedPaymentIds]];
        }
      }
    }

    // 3. Charger les Méthodes de Paiement (Filtrées)
    const paymentMethods = await odooCall('pos.payment.method', 'search_read', [paymentMethodDomain], {
      fields: ['id', 'name'],
    });

    return NextResponse.json({ partners, paymentMethods, taxes, currencies });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}