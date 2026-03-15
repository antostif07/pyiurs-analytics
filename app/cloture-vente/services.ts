
// Mapping Shop ID -> Company Name (Pour les dépenses)

import { odooClient, OdooDomainCondition } from "@/lib/odoo/xmlrpc";

// Idéalement, ça devrait être dynamique, mais gardons ta logique pour l'instant
const SHOP_COMPANY_MAP: Record<string, string> = {
  "1": "PB - 24",
  "13": "PB - LMB",
  "14": "PB - KTM",
  "15": "PB - MTO",
  "17": "PB - BC",
  "all": "all"
};

export interface ClosingStats {
  sales: {
    total: number;
    cash: number;
    bank: number;
    mobile: number;
    onl: number; // Online / Virement
    other: number;
  };
  segments: {
    femme: number;
    beauty: number;
    enfant: number;
  };
  expenses: {
    total: number;
    items: any[];
  };
  exchangeRate: number;
  orders: any[]; // On garde les détails si besoin d'afficher la liste
}

export async function getDailyClosingStats(date: Date, shopId: string): Promise<ClosingStats> {
  const dateStr = date.toISOString().split('T')[0];
  const startOfDay = `${dateStr} 00:00:00`;
  const endOfDay = `${dateStr} 23:59:59`;
  
  // Filtre de base : Date + Shop (si défini)
  const basePosDomain: OdooDomainCondition[] = [['date_order', '>=', startOfDay], 
    ['date_order', '<=', endOfDay]
  ];

  const paymentDomain: OdooDomainCondition[] = [
    ['payment_date', '>=', startOfDay], 
    ['payment_date', '<=', endOfDay]
  ];

  const segmentDomain: OdooDomainCondition[] = [
    ['order_id.date_order', '>=', startOfDay],['order_id.date_order', '<=', endOfDay],
    ['order_id.state', 'in',['paid', 'done', 'invoiced']]
  ];

  const expenseDomain: OdooDomainCondition[] = [
    ['date', '=', dateStr]
  ];

  // Gestion du Shop ID (session_id.config_id pour les paiements)
  if (shopId !== 'all') {
    const shopIdInt = parseInt(shopId, 10);
    
    // Ajout de la condition à tous les domaines de manière propre
    basePosDomain.push(['session_id.config_id', '=', shopIdInt]);
    paymentDomain.push(['session_id.config_id', '=', shopIdInt]);
    segmentDomain.push(['order_id.session_id.config_id', '=', shopIdInt]);
    
    const companyName = SHOP_COMPANY_MAP[shopId];
    if (companyName && companyName !== 'all') {
       expenseDomain.push(['description', 'ilike', companyName]); 
    }
  }

  try {
    // 1. PAIEMENTS
    const paymentGroups = await odooClient.execute('pos.payment', 'read_group', [], {
      domain: paymentDomain, 
      fields:['amount', 'payment_method_id'],
      groupby: ['payment_method_id'],
      lazy: false
    });

    // 2. SEGMENTS
    const segmentGroups = await odooClient.execute('pos.order.line', 'read_group', [], {
      domain: segmentDomain,
      fields:['price_subtotal_incl', 'product_id'],
      groupby: ['product_id.x_studio_segment'], 
      lazy: false
    });

    // 3. DÉPENSES
    const expenses = await odooClient.searchRead('hr.expense', {
      domain: expenseDomain,
      fields:['name', 'total_amount', 'date', 'description']
    });

    // 4. TAUX DE CHANGE (Dernier taux)
    const rate = await odooClient.searchRead('res.currency.rate', {
      domain: [['currency_id.name', '=', 'CDF']], // Exemple
      fields: ['rate'],
      limit: 1,
      order: 'name desc'
    });

    // 5. LISTE DES COMMANDES (Juste pour l'affichage tableau, pas pour le calcul)
    const rawOrders = await odooClient.searchRead('pos.order', {
      domain: basePosDomain,
      fields:['name', 'amount_total', 'partner_id', 'pos_reference', 'state'],
      order: 'date_order desc'
    });
    
    // A. Paiements
    const payments = { total: 0, cash: 0, bank: 0, mobile: 0, onl: 0, other: 0 };

    (paymentGroups as any[]).forEach((g: any) => {
      const method = g.payment_method_id ? g.payment_method_id[1].toLowerCase() : '';
      const amount = g.amount || 0;
      
      payments.total += amount;

      if (method.includes('esp') || method.includes('cash')) payments.cash += amount;
      else if (method.includes('ban') || method.includes('card')) payments.bank += amount;
      else if (method.includes('onl')) payments.onl += amount;
      else if (['mobile', 'money', 'pesa', 'airtel', 'orange'].some(k => method.includes(k))) payments.mobile += amount;
      else payments.other += amount;
    });

    // B. Segments
    const segments = { femme: 0, beauty: 0, enfant: 0 };

    (segmentGroups as any[]).forEach((g: any) => {
        const seg = (g['product_id.x_studio_segment'] || g.x_studio_segment || '').toLowerCase();
        const amount = g.price_subtotal_incl || 0;

        if (seg === 'femme') segments.femme += amount;
        else if (seg === 'beauty' || seg.includes('bea')) segments.beauty += amount;
        else if (seg === 'enfant') segments.enfant += amount;
    });

    // C. Expenses
    const expensesTotal = (expenses as any[]).reduce((sum, e) => sum + (e.total_amount || 0), 0);
    const exchangeRate = (rate as any[])[0]?.rate || 0;

    return {
      sales: payments,
      segments,
      expenses: { total: expensesTotal, items: expenses as any[] },
      exchangeRate,
      orders: rawOrders as any[]
    };

  } catch (error) {
    console.error("❌ Erreur Clôture Service:", error);
    throw new Error("Impossible de récupérer les données de clôture.");
  }
}