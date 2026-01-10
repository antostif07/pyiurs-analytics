'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';
import { unstable_cache } from 'next/cache'; // ⚡ Pour la performance

const SEGMENT_FIELD = 'product_id.x_studio_segment'; // Vérifie bien ce nom technique !
const SEGMENT_VALUE = 'Femme'; // Attention à la majuscule selon ton Odoo

export type CustomerRFM = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp_link: string | null; // On prépare le lien coté serveur
  total_spent: number;
  order_count: number;
  last_purchase: string;
  days_since_last: number;
  segment: 'VIP' | 'LOYAL' | 'AT_RISK' | 'NEW' | 'CASUAL';
};

// Fonction pour nettoyer le numéro pour WhatsApp (Spécial RDC)
function formatWhatsApp(phone: string | boolean): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  // On garde que les chiffres
  let clean = phone.replace(/\D/g, '');

  // Si commence par 0, on remplace par 243 (ex: 081 -> 24381)
  if (clean.startsWith('0') && clean.length >= 10) {
    clean = '243' + clean.substring(1);
  }
  // Si commence par 8 ou 9 directement (ex: 81...), on ajoute 243
  else if ((clean.startsWith('8') || clean.startsWith('9')) && clean.length === 9) {
    clean = '243' + clean;
  }

  return clean;
}

// ⚡ FONCTION INTERNE (La logique lourde)
async function getCustomersFromOdoo(limit: number) {
    try {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const fmtDate = startDate.toISOString().split('T')[0];

        // 1. Récupérer plus de lignes (5000) pour être sûr
        const domain = [
            [SEGMENT_FIELD, '=', SEGMENT_VALUE], // '=' est plus rapide que 'ilike' si c'est un choix exact
            ['order_id.date_order', '>=', fmtDate],
            ['order_id.state', 'in', ['paid', 'done', 'invoiced']],
            ['order_id.partner_id', '!=', false]
        ];

        // Optimisation : On ne récupère QUE ce qui est nécessaire
        const lines = await odooClient.searchRead('pos.order.line', {
            domain,
            fields: ['price_subtotal_incl', 'qty', 'order_id', 'create_date'], // Utilise INCL taxes pour le CA
            limit: 5000, 
            order: 'create_date desc'
        }) as any[];

        if (lines.length === 0) return [];

        // 2. Map Orders
        const orderIds = [...new Set(lines.map(l => l.order_id[0]))];
        const orders = await odooClient.searchRead('pos.order', {
            domain: [['id', 'in', orderIds]],
            fields: ['partner_id', 'date_order']
        }) as any[];

        const orderMap = new Map();
        orders.forEach((o: any) => {
            if (o.partner_id) orderMap.set(o.id, { pid: o.partner_id[0], date: o.date_order });
        });

        // 3. Agregation
        const stats = new Map();
        lines.forEach(line => {
            const orderInfo = orderMap.get(line.order_id[0]);
            if (!orderInfo) return;

            const pid = orderInfo.pid;
            const current = stats.get(pid) || { spent: 0, qty: 0, lastDate: '' };

            current.spent += line.price_subtotal_incl || 0; // CA TTC
            current.qty += line.qty || 0;
            if (orderInfo.date > current.lastDate) current.lastDate = orderInfo.date;

            stats.set(pid, current);
        });

        // 4. Partners Info
        const partnerIds = Array.from(stats.keys());
        console.log(partnerIds);
        
        const partnersInfo = await odooClient.searchRead('res.partner', {
            domain: [['id', 'in', partnerIds]],
            fields: ['name', 'email', 'phone',]
        }) as any[];

        const partnerInfoMap = new Map();
        partnersInfo.forEach((p: any) => partnerInfoMap.set(p.id, p));

        // 5. Resultat
        const results: CustomerRFM[] = [];
        const today = new Date();

        stats.forEach((val, pid) => {
            const pInfo = partnerInfoMap.get(pid);
            if (!pInfo) return;

            const lastDate = new Date(val.lastDate);
            const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

            // Segmentation ajustée (Exemple FCFA ou USD ?)
            // Assurons-nous que les seuils correspondent à ta monnaie.
            let segment: CustomerRFM['segment'] = 'CASUAL';
            if (val.spent > 500) segment = 'VIP'; // Attention si c'est 500 FCFA c'est rien, si c'est 500$ c'est bien
            else if (val.qty > 8) segment = 'LOYAL';
            else if (val.spent > 100 && daysSince > 90) segment = 'AT_RISK';
            else if (daysSince < 30 && val.qty <= 2) segment = 'NEW';

            // Logique intelligente du téléphone (Mobile prioritaire sur Fixe)
            const rawPhone = pInfo.mobile || pInfo.phone;

            results.push({
                id: pid,
                name: pInfo.name,
                email: pInfo.email || null,
                phone: rawPhone || null,
                whatsapp_link: formatWhatsApp(rawPhone), // Calculé ici
                total_spent: val.spent,
                order_count: val.qty,
                last_purchase: val.lastDate.split(' ')[0],
                days_since_last: daysSince,
                segment: segment
            });
        });

        return results.sort((a, b) => b.total_spent - a.total_spent).slice(0, limit);

    } catch (error) {
        console.error("CRM Error:", error);
        return [];
    }
}

// ⚡ EXPORT CACHÉ (C'est ça qu'on appelle dans le composant)
// Met en cache le résultat pendant 600 secondes (10 minutes)
export const getTopCustomers = unstable_cache(
  async (limit: number) => getCustomersFromOdoo(limit),
  ['top-customers-femme'], 
  { revalidate: 600, tags: ['customers'] }
);