'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';

const SEGMENT_FIELD = 'product_tmpl_id.x_studio_segment';
const SEGMENT_VALUE = 'femme';
const WAREHOUSE_KEYWORD = 'DCFEM/ST-FEM'; 

export type HSCycleStats = {
  hs_code: string;
  product_names: string[];
  first_reception: string;
  last_reception: string;
  total_received: number;
  duration_days: number;
};

export async function getHSCycleAnalysis() {
  try {
    // 1. Trouver l'emplacement
    const locations = await odooClient('stock.location', 'search_read', 
      [
        [['complete_name', 'ilike', WAREHOUSE_KEYWORD]], // Domaine
        ['id', 'complete_name'] // Champs
      ], 
      { limit: 1 }
    ) as any[];

    if (locations.length === 0) {
      console.error(`Emplacement "${WAREHOUSE_KEYWORD}" introuvable.`);
      return [];
    }
    const locationDestId = locations[0].id;

    // 2. Trouver les produits Femme
    const products = await odooClient('product.product', 'search_read', 
      [
        [[SEGMENT_FIELD, 'ilike', SEGMENT_VALUE]], // Domaine
        ['hs_code', 'name'] // Champs
      ],
      {}
    ) as any[];

    const productMap = new Map<number, { hs: string, name: string }>();
    const productIds: number[] = [];
    
    products.forEach((p: any) => {
      productMap.set(p.id, { hs: p.hs_code || 'Indéfini', name: p.name });
      productIds.push(p.id);
    });

    if (productIds.length === 0) return [];

    // 3. Récupérer les Mouvements
    const moves = await odooClient('stock.move', 'search_read', 
      [
        [ // Domaine
          ['location_dest_id', '=', locationDestId], 
          ['product_id', 'in', productIds],          
          ['state', '=', 'done']                     
        ],
        ['product_id', 'date', 'quantity', 'product_uom_qty'] // Champs
      ],
      {}
    ) as any[];

    // 4. Aggrégation (Reste inchangée)
    const statsMap = new Map<string, {
      first: string,
      last: string,
      qty: number,
      names: Set<string>
    }>();

    moves.forEach((m: any) => {
      const pId = m.product_id[0];
      const pInfo = productMap.get(pId);
      if (!pInfo) return;

      const hs = pInfo.hs;
      const qty = m.quantity || m.product_uom_qty || 0;
      const date = m.date;

      const current = statsMap.get(hs) || { 
        first: date, 
        last: date, 
        qty: 0, 
        names: new Set() 
      };

      if (date < current.first) current.first = date;
      if (date > current.last) current.last = date;

      current.qty += qty;
      current.names.add(pInfo.name);

      statsMap.set(hs, current);
    });

    // 5. Formatage
    const today = new Date();
    
    const results: HSCycleStats[] = Array.from(statsMap.entries()).map(([hs, val]) => {
      const firstDate = new Date(val.first);
      const days = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 3600 * 24));

      return {
        hs_code: hs,
        product_names: Array.from(val.names).slice(0, 3), 
        first_reception: val.first.split(' ')[0],
        last_reception: val.last.split(' ')[0],
        total_received: val.qty,
        duration_days: days
      };
    });

    return results.sort((a, b) => new Date(b.first_reception).getTime() - new Date(a.first_reception).getTime());

  } catch (error) {
    console.error("Lifecycle Error:", error);
    return [];
  }
}