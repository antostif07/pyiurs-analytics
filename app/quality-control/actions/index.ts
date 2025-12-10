'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';

const SEGMENT_FIELD = 'x_studio_segment'; // Champ sur le template

export type ProductQC = {
  db_id: number;
  xml_id: string; // ID Externe
  name: string;
  default_code: string;
  hs_code: string;
  segment: string;
  create_date: string;
  color: string|null;
};

export async function getProductQualityData(
  from: string, 
  to: string, 
  segment: string = 'femme',
  hsCodes: string[] = []
) {
  try {
    // 1. Domaine : Segment + Date + SANS IMAGE
    const domain: any[] = [
      [SEGMENT_FIELD, 'ilike', segment],
      ['create_date', '>=', from],
      ['create_date', '<=', `${to} 23:59:59`],
      ['image_1920', '=', false]
    ];

    // --- FILTRE MULTI-SELECT ---
    if (hsCodes.length > 0) {
      const hasUndefined = hsCodes.includes('Indéfini');
      const cleanCodes = hsCodes.filter(c => c !== 'Indéfini');

      if (hasUndefined && cleanCodes.length > 0) {
        // CORRECTION 1 : Ajout de '|' pour dire "OU"
        // CORRECTION 2 : 'cleanCodes as any' pour calmer TypeScript
        domain.push('|', 
          ['hs_code', 'in', cleanCodes as any],
          ['hs_code', '=', false]
        );
      } else if (hasUndefined) {
        domain.push(['hs_code', '=', false]);
      } else {
        // CORRECTION 3 : 'cleanCodes as any' ici aussi
        domain.push(['hs_code', 'in', cleanCodes as any]);
      }
    }

    const templates = await odooClient('product.template', 'search_read', 
      [
        domain, 
        ['name', 'default_code', 'hs_code', 'create_date', 'x_studio_many2one_field_Arl5D'] // Les champs sont ici maintenant
      ], 
      {
        limit: 2000,
        order: 'create_date desc'
      }
    ) as any[];

    if (templates.length === 0) return [];

    const templateIds = templates.map(t => t.id);

    // 3. Récupérer les IDs Externes
    // Même correction ici pour ir.model.data par sécurité
    const irModelData = await odooClient('ir.model.data', 'search_read', 
      [
        [
          ['model', '=', 'product.template'],
          ['res_id', 'in', templateIds]
        ],
        ['name', 'module', 'res_id'] // Champs en 2ème argument
      ], 
      {} // Kwargs vide ici car pas de limit/order nécessaire
    ) as any[];

    const xmlIdMap = new Map<number, string>();
    irModelData.forEach((d: any) => {
      xmlIdMap.set(d.res_id, `${d.module}.${d.name}`);
    });

    // 4. Assemblage
    const rows: ProductQC[] = templates.map(t => ({
      db_id: t.id,
      xml_id: xmlIdMap.get(t.id) || '',
      name: t.name,
      default_code: t.default_code || '',
      hs_code: t.hs_code || '',
      segment: segment,
      create_date: t.create_date,
      color: t.x_studio_many2one_field_Arl5D ? t.x_studio_many2one_field_Arl5D[1] : null
    }));
    
    return rows;

  } catch (error) {
    console.error("QC Error:", error);
    return [];
  }
}

export async function getAvailableHSCodes(from: string, to: string, segment: string) {
  try {
    const domain = [
      [SEGMENT_FIELD, 'ilike', segment],
      ['create_date', '>=', from],
      ['create_date', '<=', `${to} 23:59:59`],
      ['image_1920', '=', false]
    ];

    // On récupère juste les HS Codes
    const results = await odooClient('product.template', 'search_read', [domain], {
      fields: ['hs_code'],
      limit: 5000 
    }) as any[];

    // On compte les occurrences pour afficher (ex: "6204.42 (12)")
    const counts = new Map<string, number>();
    
    results.forEach((p: any) => {
      const code = p.hs_code || 'Indéfini';
      counts.set(code, (counts.get(code) || 0) + 1);
    });

    // On retourne un tableau trié
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count); // Les plus fréquents en premier

  } catch (error) {
    console.error(error);
    return [];
  }
}