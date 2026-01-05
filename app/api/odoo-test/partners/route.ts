// app/api/odoo-test/partners/route.ts
import { odooCall } from '@/app/base-test-odoo/lib/odoo/client';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';

  try {
    // On cherche dans Nom OU Email OU Téléphone
    // Et on filtre pour n'avoir que les fournisseurs (optionnel, sinon enlève le supplier_rank)
    const domain = search 
      ? ['|', '|', ['name', 'ilike', search], ['email', 'ilike', search], ['phone', 'ilike', search]]
      : [];

    // On peut ajouter ['supplier_rank', '>', 0] dans le domaine si tu veux STRICTEMENT des fournisseurs
    
    const partners = await odooCall('res.partner', 'search_read', [domain], {
      fields: ['id', 'name', 'email', 'phone'],
      limit: 20 // On limite à 20 résultats pour que ça soit rapide
    });

    return NextResponse.json(partners);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}