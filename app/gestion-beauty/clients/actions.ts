'use server'

import { odooClient } from "@/lib/odoo/xmlrpc";

/**
 * Normalise les numéros de téléphone pour le dédoublonnage (Format RDC)
 * Transforme "0891234567", "+243 891 234 567", "891234567" en "+243891234567"
 */
function normalizePhone(phone: any): string | null {
  if (!phone || typeof phone !== 'string') return null;

  // 1. Enlever tout ce qui n'est pas un chiffre (espaces, parenthèses, tirets, plus)
  let cleaned = phone.replace(/\D/g, '');

  // 2. Cas "00243..." -> on enlève les deux premiers zéros pour avoir "243..."
  if (cleaned.startsWith('00243')) {
    cleaned = cleaned.substring(2);
  }
  // 3. Cas "08..." ou "09..." -> on remplace le 0 par 243
  else if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '243' + cleaned.substring(1);
  }
  // 4. Cas "8..." ou "9..." (9 chiffres) -> on ajoute 243 devant
  else if (cleaned.length === 9 && (cleaned.startsWith('8') || cleaned.startsWith('9'))) {
    cleaned = '243' + cleaned;
  }

  // 5. Validation finale : Un numéro RDC valide fait 12 chiffres et commence par 243
  if (cleaned.length === 12 && cleaned.startsWith('243')) {
    return '+' + cleaned;
  }

  return null;
}

function getCleanProductName(name: string): string {
  // On coupe à partir du premier '[' et on retire les espaces vides
  return name.split('[')[0].trim();
}

export async function getBeautyKPIs() {
  try {
    // 1. Récupérer les lignes de vente Beauty
    const beautyLines = await odooClient.searchRead("pos.order.line", {
      domain: [
        ["product_id.x_studio_segment", "=", "Beauty"],
        ["order_id.state", "in", ["paid", "done", "invoiced"]],
        ["order_id.partner_id", "not in", [28987, 28907]]
      ],
      fields: ["price_subtotal_incl", "order_id"]
    }) as any[];

    if (!beautyLines.length) return { totalClients: 0, totalRevenue: 0, vipGold: 0, avgBasket: 0 };

    // 2. Récupérer les partenaires via les commandes
    const orderIds = [...new Set(beautyLines.map(l => l.order_id[0]))];
    const orders = await odooClient.execute("pos.order", "read", [
      orderIds,
      ["partner_id"]
    ]) as any[];

    const partnerIds = [...new Set(orders.filter(o => o.partner_id).map(o => o.partner_id[0]))];

    // 3. Récupérer les détails des partenaires (Phone)
    const partners = await odooClient.execute("res.partner", "read", [
      partnerIds,
      ["name", "phone"]
    ]) as any[];

    // 4. Créer un mapping : PartnerID -> NormalizedPhone
    const partnerToPhoneMap = new Map<number, string>();
    partners.forEach(p => {
      const normalized = normalizePhone(p.phone);
      if (normalized) {
        partnerToPhoneMap.set(p.id, normalized);
      } else {
        // Fallback sur l'ID Odoo en string si aucun téléphone n'est trouvé
        partnerToPhoneMap.set(p.id, `ID-${p.id}`);
      }
    });

    // 5. AGRÉGATION PAR NUMÉRO NORMALISÉ
    // On utilise une Map où la clé est le numéro de téléphone unique
    const aggregatedStats = new Map<string, { revenue: number; orders: Set<number> }>();

    beautyLines.forEach(line => {
      const orderId = line.order_id[0];
      const partnerId = orders.find(o => o.id === orderId)?.partner_id?.[0];
      
      if (!partnerId) return; // Client anonyme ignoré

      const phoneKey = partnerToPhoneMap.get(partnerId);
      if (!phoneKey) return;

      const current = aggregatedStats.get(phoneKey) || { revenue: 0, orders: new Set() };
      current.revenue += line.price_subtotal_incl;
      current.orders.add(orderId);
      
      aggregatedStats.set(phoneKey, current);
    });

    // 6. Calcul des KPIs sur les données consolidées
    const uniqueClientsArray = Array.from(aggregatedStats.values());
    
    const totalRevenue = uniqueClientsArray.reduce((acc, c) => acc + c.revenue, 0);
    const totalClients = uniqueClientsArray.length; // C'est ici qu'on a le vrai nombre d'humains
    
    // Un client (unique par téléphone) est Gold s'il dépasse 1000$ cumulés
    const vipGold = uniqueClientsArray.filter(c => c.revenue >= 1000).length;
    
    const totalOrdersCount = new Set(beautyLines.map(l => l.order_id[0])).size;
    const avgBasket = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

    return {
      totalClients,
      totalRevenue: Math.round(totalRevenue),
      vipGold,
      avgBasket: Math.round(avgBasket)
    };

  } catch (error) {
    console.error("Dédoublonnage KPI Error:", error);
    return { totalClients: 0, totalRevenue: 0, vipGold: 0, avgBasket: 0 };
  }
}

export async function getBeautyClientsData() {
  try {
    const lines = await odooClient.searchRead("pos.order.line", {
      domain: [
        ["product_id.x_studio_segment", "=", "Beauty"],
        ["order_id.state", "in", ["paid", "done", "invoiced"]],
        ["order_id.partner_id", "not in", [28987, 28907]]
      ],
      fields: ["price_subtotal_incl", "order_id", "product_id", "qty"]
    }) as any[];

    const orderIds = [...new Set(lines.map(l => l.order_id[0]))];
    const orders = await odooClient.execute("pos.order", "read", [
        orderIds, ["partner_id", "date_order"]
    ]) as any[];

    const partnerIds = [...new Set(orders.filter(o => o.partner_id).map(o => o.partner_id[0]))];
    const partners = await odooClient.execute("res.partner", "read", [
      partnerIds, ["name", "email", "phone"]
    ]) as any[];

    const consolidated = new Map<string, any>();
    const allUniqueCleanProducts = new Set<string>(); // Pour le filtre frontend

    lines.forEach(line => {
      const order = orders.find(o => o.id === line.order_id[0]);
      if (!order?.partner_id) return;
      const partner = partners.find(p => p.id === order.partner_id[0]);
      if (!partner) return;

      const phoneKey = normalizePhone(partner.phone) || `ID-${partner.id}`;

      const rawName = line.product_id[1];
      const cleanName = getCleanProductName(rawName);
      
      allUniqueCleanProducts.add(cleanName);

      if (!consolidated.has(phoneKey)) {
        consolidated.set(phoneKey, {
          id: phoneKey,
          name: partner.name,
          email: partner.email || "—",
          phone: phoneKey.startsWith('+') ? phoneKey : "Non renseigné",
          totalSpent: 0,
          lastPurchase: order.date_order,
          orders: new Set(), // Pour compter les commandes uniques
          productsMap: new Map<string, number>()
        });
      }

      const entry = consolidated.get(phoneKey);
      entry.totalSpent += line.price_subtotal_incl;
      entry.orders.add(line.order_id[0]);
      
      if (new Date(order.date_order) > new Date(entry.lastPurchase)) {
        entry.lastPurchase = order.date_order;
      }

      const currentQty = entry.productsMap.get(cleanName) || 0;
      entry.productsMap.set(cleanName, currentQty + line.qty);
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(now.getDate() - 60);

    const clients = Array.from(consolidated.values()).map(c => {
      const orderCount = c.orders.size;
      const avgBasket = orderCount > 0 ? c.totalSpent / orderCount : 0;
      const lastDate = new Date(c.lastPurchase);

      let status = 'Très inactif';
      if (lastDate >= thirtyDaysAgo) status = 'Actif';
      else if (lastDate >= sixtyDaysAgo) status = 'Inactif';

      return {
        ...c,
        orderCount,
        averageBasket: Math.round(avgBasket),
        totalSpent: Math.round(c.totalSpent),
        status,
        products: Array.from(c.productsMap, ([name, qty]: [string, number]) => ({ name, qty }))
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      clients,
      productOptions: Array.from(allUniqueCleanProducts).sort().map(name => ({ 
        value: name, 
        label: name 
      }))
    };

  } catch (error) {
    console.error(error);
    return { clients: [], productOptions: [] };
  }
}