'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';

const SEGMENT_FIELD = 'product_id.product_tmpl_id.x_studio_segment';
const SEGMENT_VALUE = 'femme';

export type CustomerRFM = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  total_spent: number;    // Vrai CA Femme
  order_count: number;    // Vrai nombre d'articles Femme (Qté)
  last_purchase: string;
  days_since_last: number;
  segment: 'VIP' | 'LOYAL' | 'AT_RISK' | 'NEW' | 'CASUAL';
};

export async function getTopCustomers(limit: number = 100) {
  try {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1); // 12 derniers mois
    const fmtDate = startDate.toISOString().split('T')[0];

    // 1. Récupérer les LIGNES de vente "Femme" (Raw Data)
    const domain = [
      [SEGMENT_FIELD, 'ilike', SEGMENT_VALUE],
      ['order_id.date_order', '>=', fmtDate],
      ['order_id.state', 'in', ['paid', 'done', 'invoiced']],
      ['order_id.partner_id', '!=', false] // On ignore les clients anonymes
    ];

    // On récupère les 3000 dernières lignes de vente femme (suffisant pour le Top 100)
    // On demande 'order_id' pour pouvoir retrouver le client ensuite
    const lines = await odooClient('pos.order.line', 'search_read', [domain], {
      fields: ['price_subtotal', 'qty', 'order_id', 'create_date'],
      limit: 3000, 
      order: 'create_date desc'
    }) as any[];

    if (lines.length === 0) return [];

    // 2. Récupérer les PARTNERS liés à ces commandes
    // lines[i].order_id est sous forme [ID, "Nom"]. On veut l'ID.
    const orderIds = [...new Set(lines.map(l => l.order_id[0]))];

    // On lit les commandes pour savoir à qui elles appartiennent (Partner ID)
    const orders = await odooClient('pos.order', 'read', [orderIds], {
      fields: ['partner_id', 'date_order']
    }) as any[];

    // Map: OrderID -> { partnerId, date }
    const orderMap = new Map<number, { pid: number, date: string }>();
    const partnerIds = new Set<number>();

    orders.forEach((o: any) => {
      if (o.partner_id) {
        orderMap.set(o.id, { pid: o.partner_id[0], date: o.date_order });
        partnerIds.add(o.partner_id[0]);
      }
    });

    // 3. AGGREGATION JS (Le coeur du calcul)
    // On somme les lignes par Partner
    const stats = new Map<number, { 
      spent: number, 
      qty: number, 
      lastDate: string 
    }>();

    lines.forEach(line => {
      const orderInfo = orderMap.get(line.order_id[0]);
      if (!orderInfo) return; // Ligne orpheline ou client anonyme

      const pid = orderInfo.pid;
      const current = stats.get(pid) || { spent: 0, qty: 0, lastDate: '' };

      // Mise à jour des totaux
      current.spent += line.price_subtotal || 0;
      current.qty += line.qty || 0;

      // Mise à jour date max
      if (orderInfo.date > current.lastDate) {
        current.lastDate = orderInfo.date;
      }

      stats.set(pid, current);
    });

    // 4. Récupérer les Infos Contact (Nom, Tel)
    const partnersInfo = await odooClient('res.partner', 'read', [[...partnerIds]], {
      fields: ['name', 'email', 'phone', 'mobile']
    }) as any[];
    
    const partnerInfoMap = new Map();
    partnersInfo.forEach((p: any) => partnerInfoMap.set(p.id, p));

    // 5. Construction du Résultat Final
    const results: CustomerRFM[] = [];
    const today = new Date();

    stats.forEach((val, pid) => {
      const pInfo = partnerInfoMap.get(pid);
      if (!pInfo) return;

      // Calcul Récence réelle
      const lastDate = new Date(val.lastDate);
      const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

      // Segmentation
      let segment: CustomerRFM['segment'] = 'CASUAL';
      if (val.spent > 500) segment = 'VIP';
      else if (val.qty > 8) segment = 'LOYAL'; // Acheté plus de 8 articles femme
      else if (val.spent > 200 && daysSince > 90) segment = 'AT_RISK';
      else if (daysSince < 30 && val.qty <= 2) segment = 'NEW';

      results.push({
        id: pid,
        name: pInfo.name,
        email: pInfo.email || null,
        phone: pInfo.mobile || pInfo.phone || null,
        total_spent: val.spent, // Vrai CA Femme
        order_count: val.qty,   // Vraie Qté Femme
        last_purchase: val.lastDate.split(' ')[0],
        days_since_last: daysSince,
        segment: segment
      });
    });

    // Tri par CA décroissant et limite
    return results.sort((a, b) => b.total_spent - a.total_spent).slice(0, limit);

  } catch (error) {
    console.error("CRM Error:", error);
    return [];
  }
}