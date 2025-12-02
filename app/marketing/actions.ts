// src/actions/dashboard.ts
'use server'

import { odooClient } from "@/lib/odoo/xmlrpc";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function getDashboardStats() {
  try {
    const now = new Date();
    // Odoo stocke souvent en UTC, on ajuste la date locale pour le filtre String
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Début de semaine
    const day = now.getDay() || 7; 
    if(day !== 1) now.setHours(-24 * (day - 1)); 
    const startOfWeekStr = now.toISOString().split('T')[0];

    // --- REQUÊTE 1 : CA DU JOUR (POS) ---
    const dailyOrders: any = await odooClient('pos.order', 'search_read', [
      [
        ['date_order', '>=', todayStr], 
        ['state', 'in', ['paid', 'done', 'invoiced']] // États valides du POS
      ],
      ['amount_total'] 
    ]);

    const dailyRevenue = dailyOrders.reduce((sum: number, order: any) => sum + order.amount_total, 0);

    // --- REQUÊTE 2 : CA SEMAINE (POS) ---
    const weeklyOrders: any = await odooClient('pos.order', 'search_read', [
      [
        ['date_order', '>=', startOfWeekStr], 
        ['state', 'in', ['paid', 'done', 'invoiced']]
      ],
      ['amount_total']
    ]);
    
    const weeklyRevenue = weeklyOrders.reduce((sum: number, order: any) => sum + order.amount_total, 0);

    // --- REQUÊTE 3 : STOCK FAIBLE (Reste inchangé, c'est le produit) ---
    const lowStockIds: any = await odooClient('product.product', 'search_count', [
      [
        ['type', '=', 'product'],
        ['qty_available', '<', 3],
        ['qty_available', '>', 0]
      ]
    ]);

    // --- REQUÊTE 4 : STOCK DORMANT (Reste inchangé) ---
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateDormantStr = twoMonthsAgo.toISOString().split('T')[0];

    const dormantStockCount: any = await odooClient('product.product', 'search_count', [
        [
            ['create_date', '<', dateDormantStr],
            ['qty_available', '>', 0]
        ]
    ]);

    return {
      dailyRevenue,
      weeklyRevenue,
      lowStockCount: lowStockIds,
      dormantStockCount,
      orderCount: dailyOrders.length
    };

  } catch (error) {
    console.error("Erreur Odoo POS:", error);
    return {
      dailyRevenue: 0,
      weeklyRevenue: 0,
      lowStockCount: 0,
      dormantStockCount: 0,
      orderCount: 0
    };
  }
}

export async function getTopProducts() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    // 1. Récupérer les lignes
    const lines: any = await odooClient('pos.order.line', 'search_read', [
      [
        ['create_date', '>=', dateStr],
        ['qty', '>', 0]
      ],
      ['product_id', 'qty', 'price_subtotal_incl']
    ]);

    if (!lines || lines.length === 0) return { beauty: [], fashion: [] };

    // 2. IDs uniques
    const productIds = [...new Set(lines.map((l: any) => l.product_id[0]))];

    // 3. Infos produits (Ajout du champ couleur custom)
    const productsDetails: any = await odooClient('product.product', 'search_read', [
      [['id', 'in', productIds]],
      ['hs_code', 'name', 'categ_id', 'x_studio_many2one_field_Arl5D'] // <-- Le champ couleur est ici
    ]);

    const productMap = new Map();
    productsDetails.forEach((p: any) => {
      productMap.set(p.id, p);
    });

    // 4. Groupement
    const beautyStats: Record<string, any> = {};
    const fashionStats: Record<string, any> = {};

    lines.forEach((line: any) => {
      const productId = line.product_id[0];
      const productInfo = productMap.get(productId);
      const groupKey = productInfo?.hs_code || `ID_${productId}`;

      // Catégorie
      const catName = Array.isArray(productInfo?.categ_id) ? productInfo.categ_id[1] : '';
      const isBeauty = catName.toLowerCase().includes('beauty');

      const targetStats = isBeauty ? beautyStats : fashionStats;
      
      if (!targetStats[groupKey]) {
        const rawName = productInfo?.name || 'Produit Inconnu';
        const cleanName = rawName.split('[')[0].trim();
        const hsCode = productInfo?.hs_code || '';

        // --- CONSTRUCTION DE L'IMAGE ---
        let imageUrl = '/placeholder.png'; // Fallback local si besoin

        if (hsCode) {
            if (isBeauty) {
                // Logique Beauty : hsCode_.jpg
                imageUrl = `http://pyiurs.com/images/images/${hsCode}_.jpg`;
            } else {
                // Logique Fashion : hsCode_Couleur.jpg
                // Le champ couleur est un tableau [ID, "Nom"] (Many2One)
                const colorField = productInfo?.x_studio_many2one_field_Arl5D;
                const colorName = Array.isArray(colorField) ? colorField[1] : '';
                
                if (colorName) {
                    imageUrl = `http://pyiurs.com/images/images/${hsCode}_${colorName}.jpg`;
                } else {
                    // Si pas de couleur, on tente le format beauty par défaut
                    imageUrl = `http://pyiurs.com/images/images/${hsCode}_.jpg`;
                }
            }
        }

        targetStats[groupKey] = { 
          name: cleanName, 
          ref: hsCode || 'Sans Ref',
          imageUrl: imageUrl, // <-- On stocke l'URL
          qty: 0, 
          total: 0 
        };
      }

      targetStats[groupKey].qty += line.qty;
      targetStats[groupKey].total += line.price_subtotal_incl;
    });

    // 5. Tri
    const sortAndSlice = (statsObj: Record<string, any>) => {
      return Object.values(statsObj)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5);
    };

    return {
      beauty: sortAndSlice(beautyStats),
      fashion: sortAndSlice(fashionStats)
    };

  } catch (error) {
    console.error("Erreur Top Produits:", error);
    return { beauty: [], fashion: [] };
  }
}

export async function getTodayTasks() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // On récupère les tâches qui sont soit pour aujourd'hui, soit en retard (non faites avant aujourd'hui)
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .or(`due_date.eq.${today},and(status.eq.pending,due_date.lt.${today})`)
    .order('is_priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erreur Supabase:', error);
    return [];
  }
  return data || [];
}

export async function addTask(formData: FormData) {
  const title = formData.get('title') as string;
  if (!title) return;

  const { error } = await supabase.from('tasks').insert({
    title,
    due_date: new Date().toISOString(), // Date du jour par défaut
    status: 'pending',
    task_type: 'general'
  });

  if (error) console.error(error);
  revalidatePath('/'); // Rafraîchit la page
}

export async function getAllTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_date', { ascending: true }) // Les plus urgentes en premier
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

// Ajouter une tâche COMPLÈTE
export async function addTaskFull(formData: FormData) {
  const title = formData.get('title') as string;
  const dateStr = formData.get('date') as string; // YYYY-MM-DD
  const type = formData.get('type') as string; // 'promo', 'shoot', 'video'...
  
  if (!title || !dateStr) return;

  const { error } = await supabase.from('tasks').insert({
    title,
    due_date: new Date(dateStr).toISOString(),
    task_type: type,
    status: 'pending'
  });

  if (error) console.error(error);
  revalidatePath('/dashboard/agenda'); // On rafraîchit la page agenda
}

// Les autres fonctions (toggle, delete) restent les mêmes...
export async function toggleTask(id: string, currentStatus: string) {
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
  revalidatePath('/marketing/agenda');
}

export async function deleteTask(id: string) {
  await supabase.from('tasks').delete().eq('id', id);
  revalidatePath('/marketing/agenda');
}

// MARKETING
// 1. AJOUTER UNE STATISTIQUE (Ex: L'équipe note les vues du jour)
export async function addDailyStat(formData: FormData) {
  const platform = formData.get('platform') as string;
  const metric = formData.get('metric') as string; // 'views', 'clicks', 'whatsapp_clicks'
  const value = Number(formData.get('value'));

  if (!value) return;

  await supabase.from('marketing_stats').insert({
    platform,
    metric_type: metric,
    value,
    date: new Date().toISOString().split('T')[0]
  });

  revalidatePath('/marketing/marketing');
}

// 2. RÉCUPÉRER LES CHIFFRES DE LA SEMAINE
export async function getWeeklyStats() {
  // On récupère les stats des 7 derniers jours
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data } = await supabase
    .from('marketing_stats')
    .select('*')
    .gte('date', dateStr);

  // Agrégation simple par plateforme
  const stats = {
    tiktok_views: 0,
    fb_reach: 0,
    whatsapp_views: 0,
    whatsapp_clicks: 0
  };

  data?.forEach(row => {
    if (row.platform === 'tiktok' && row.metric_type === 'views') stats.tiktok_views += row.value;
    if (row.platform === 'facebook' && row.metric_type === 'reach') stats.fb_reach += row.value;
    if (row.platform === 'facebook' && row.metric_type === 'whatsapp_clicks') stats.whatsapp_clicks += row.value;
    if (row.platform === 'whatsapp' && row.metric_type === 'views') stats.whatsapp_views += row.value; // Statuts
  });

  return stats;
}

// 3. GESTION DES CAMPAGNES
export async function getActiveCampaigns() {
  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
    
  return data || [];
}

export async function addCampaign(formData: FormData) {
  const name = formData.get('name') as string;
  const platform = formData.get('platform') as string;
  const budget = Number(formData.get('budget'));

  await supabase.from('campaigns').insert({
    name,
    platform,
    budget,
    status: 'active'
  });
  revalidatePath('/marketing/marketing');
}

export async function stopCampaign(id: string) {
  await supabase.from('campaigns').update({ status: 'ended' }).eq('id', id);
  revalidatePath('/marketing/marketing');
}

// STOCK
export async function getDormantStock() {
  try {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const dateLimit = twoMonthsAgo.toISOString().split('T')[0];

    // On cherche les produits créés avant cette date et qui ont encore du stock
    const products: any = await odooClient('product.product', 'search_read', [
      [
        ['create_date', '<', dateLimit],
        ['qty_available', '>', 0]
      ],
      ['name', 'hs_code', 'qty_available', 'list_price', 'create_date'] // list_price = prix de vente
    ]);

    // On ajoute le calcul de la réduction suggérée
    return products.map((p: any) => {
      const created = new Date(p.create_date);
      const now = new Date();
      // Différence en mois
      const diffMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
      
      // Règle : 2 mois = -10%, 3 mois = -20%, max -50%
      let discount = 0;
      if (diffMonths >= 2) discount = 10;
      if (diffMonths >= 3) discount = 20;
      if (diffMonths >= 6) discount = 50;

      return {
        ...p,
        age_months: diffMonths,
        suggested_discount: discount,
        new_price: p.list_price * (1 - discount / 100)
      };
    });

  } catch (error) {
    console.error(error);
    return [];
  }
}

// 2. DERNIERS ARRIVAGES (30 derniers jours)
export async function getRecentArrivals() {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const dateLimit = oneMonthAgo.toISOString().split('T')[0];

    const products: any = await odooClient('product.product', 'search_read', [
      [
        ['create_date', '>=', dateLimit],
        ['qty_available', '>', 0]
      ],
      ['name', 'hs_code', 'qty_available', 'create_date']
    ], { limit: 20, order: 'create_date desc' }); // Les 20 plus récents

    return products;
  } catch (error) {
    console.error(error);
    return [];
  }
}

// CRM
export async function getCRMClients() {
  try {
    // On récupère les 50 meilleurs clients qui ont un téléphone
    // On demande des champs utiles : nom, tél, email, CA total, nombre de ventes
    const clients: any = await odooClient('res.partner', 'search_read', [
      [
        ['customer_rank', '>', 0], // C'est un client
        ['mobile', '!=', false],    // Il a un numéro de portable
        ['email', '!=', false]      // (Optionnel) Il a un email
      ],
      ['id', 'name', 'mobile', 'email', 'total_invoiced', 'sale_order_count', 'create_date'] 
    ], { 
      limit: 50, 
      order: 'total_invoiced desc' // Les plus gros acheteurs en premier
    });

    if (!clients) return [];

    // On nettoie les données pour le frontend
    return clients.map((c: any) => ({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      totalSpent: c.total_invoiced || 0, // Attention: le champ exact dépend de ta config Odoo (parfois 'credit', 'total_invoiced'...)
      orderCount: c.sale_order_count || 0,
      whatsappLink: formatWhatsAppLink(c.mobile),
      since: new Date(c.create_date).getFullYear()
    }));

  } catch (error) {
    console.error("Erreur CRM Odoo:", error);
    return [];
  }
}

// Fonction utilitaire pour préparer le numéro pour l'API WhatsApp
function formatWhatsAppLink(phone: string) {
  if (!phone) return '';
  // 1. On garde que les chiffres
  let clean = phone.replace(/[^\d+]/g, '');
  
  // 2. Gestion basique de l'indicatif (Exemple pour le Sénégal ou l'international)
  // Si le numéro commence par '00', on remplace par '+'
  if (clean.startsWith('00')) clean = '+' + clean.substring(2);
  
  // Si pas de '+' au début et pas d'indicatif pays (ex: commence par 77, 78...), on ajoute l'indicatif (ex: 221)
  // A ADAPTER SELON TON PAYS PRINCIPAL
  if (!clean.startsWith('+')) {
      // Hypothèse : Si < 9 chiffres, c'est peut-être un numéro local sans indicatif
      clean = '243' + clean;
  }

  // Pour le lien wa.me, on enlève le '+' final
  return clean.replace('+', '');
}

// Promo
export async function getAvailableRefs() {
  try {
    // On récupère tous les produits avec du stock
    const products: any = await odooClient('product.product', 'search_read', [
      [['qty_available', '>', 0]],
      ['name', 'hs_code', 'qty_available', 'list_price']
    ]);

    const groupedMap: Record<string, any> = {};

    products.forEach((p: any) => {
      // On utilise le HS Code comme clé. S'il n'y en a pas, on ignore ou on met "Inconnu"
      const code = p.hs_code ? p.hs_code.trim() : null;
      if (!code) return;

      if (!groupedMap[code]) {
        // On nettoie le nom : "Mustella [REF123]" -> "Mustella"
        const cleanName = p.name.split('[')[0].trim();
        groupedMap[code] = {
          hs_code: code,
          name: cleanName, // On garde un nom d'exemple pour l'affichage
          total_stock: 0,
          total_value: 0
        };
      }
      groupedMap[code].total_stock += p.qty_available;
      groupedMap[code].total_value += (p.list_price * p.qty_available);
    });

    // On retourne une liste triée par stock décroissant
    return Object.values(groupedMap).sort((a: any, b: any) => b.total_stock - a.total_stock);

  } catch (error) {
    console.error("Erreur récupération refs:", error);
    return [];
  }
}

// 3. SUIVI PERFORMANCE (Inchangé, toujours valide)
export async function getActivePromosPerformance() {
  const { data: activePromos } = await supabase
    .from('active_promos')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (!activePromos || activePromos.length === 0) return [];

  const performances = await Promise.all(activePromos.map(async (promo) => {
    const sales: any = await odooClient('pos.order.line', 'search_read', [
      [
        ['product_id', 'in', promo.product_ids],
        ['create_date', '>=', promo.created_at]
      ],
      ['qty', 'price_subtotal_incl']
    ]);

    const soldQty = sales.reduce((sum: number, line: any) => sum + line.qty, 0);
    const revenue = sales.reduce((sum: number, line: any) => sum + line.price_subtotal_incl, 0);
    const currentStock = promo.initial_stock - soldQty;

    return {
      ...promo,
      sold_qty: soldQty,
      revenue_generated: revenue,
      current_stock_estimated: currentStock,
      sell_through_rate: promo.initial_stock > 0 ? Math.round((soldQty / promo.initial_stock) * 100) : 0
    };
  }));

  return performances;
}

export async function stopPromo(id: string) {
  await supabase.from('active_promos').update({ status: 'ended' }).eq('id', id);
  revalidatePath('/marketing/promos');
}

export async function createCustomPromo(formData: FormData) {
  const name = formData.get('name') as string;
  const discount = Number(formData.get('discount'));
  
  // On récupère TOUTES les valeurs des inputs nommés "hs_codes"
  const hsCodes = formData.getAll('hs_codes') as string[];

  if (!name || hsCodes.length === 0 || !discount) return;

  // A. On interroge Odoo pour TOUS les HS Codes sélectionnés
  // On cherche les produits dont le hs_code est DANS la liste (opérateur 'in')
  const products: any = await odooClient('product.template', 'search_read', [
    [['hs_code', 'in', hsCodes], ['qty_available', '>', 0], ['categ_id', 'ilike', 'fashion']],
    ['id', 'qty_available', 'name']
  ]);

  if (!products || products.length === 0) return;

  const totalStock = products.reduce((sum: number, p: any) => sum + p.qty_available, 0);
  const productIds = products.map((p: any) => p.id);

  // B. On sauvegarde dans Supabase avec le tableau de HS Codes
  const { error } = await supabase.from('active_promos').insert({
    product_name: name,
    hs_codes: hsCodes, // <-- Tableau de strings
    discount_percent: discount,
    initial_stock: totalStock,
    product_ids: productIds, // Contient les IDs de TOUS les produits de TOUS les codes
    status: 'active'
  });

  if (error) console.error("Erreur Supabase:", error);
  revalidatePath('/dashboard/promos');
}

export async function getPromoCandidates() {
  try {
    const products: any = await odooClient('product.product', 'search_read', [
      [['qty_available', '>', 0]],
      ['name', 'hs_code', 'qty_available', 'create_date', 'standard_price', 'list_price', 'categ_id', 'x_studio_many2one_field_Arl5D']
    ]);

    const groupedMap: Record<string, any> = {};

    products.forEach((p: any) => {
      const code = p.hs_code ? p.hs_code.trim() : null;
      if (!code) return;

      const created = new Date(p.create_date);
      const now = new Date();
      const ageMonths = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());

      if (!groupedMap[code]) {
        // Logique Image (inchangée)
        const catName = Array.isArray(p.categ_id) ? p.categ_id[1] : '';
        const isBeauty = catName.toLowerCase().includes('beauty');
        const colorField = p?.x_studio_many2one_field_Arl5D;
        const colorName = Array.isArray(colorField) ? colorField[1] : '';
        // Astuce : pour l'image on prend celle du 1er produit, ou on construit l'url
        let imageUrl = isBeauty ? `http://pyiurs.com/images/images/${code}_.jpg` : `http://pyiurs.com/images/images/${code}_${colorName}.jpg`;

        // PRIX : On récupère le coût (standard_price)
        const costPrice = p.list_price || 0;

        groupedMap[code] = {
          id: code,
          hs_code: code,
          name: p.name.split('[')[0].trim(),
          image_url: imageUrl,
          total_stock: 0,
          max_age: 0,
          category: isBeauty ? 'Beauty' : 'Mode',
          cost_price: costPrice, // <-- Nouveau champ
        };
      }

      groupedMap[code].total_stock += p.qty_available;
      if (ageMonths > groupedMap[code].max_age) groupedMap[code].max_age = ageMonths;
    });

    return Object.values(groupedMap).sort((a: any, b: any) => b.max_age - a.max_age);

  } catch (error) {
    console.error("Erreur candidats promos:", error);
    return [];
  }
}

export async function getCampaignDetails(campaignId: string) {
    // A. Récup campagne Supabase
    const { data: campaign } = await supabase
        .from('active_promos')
        .select('*')
        .eq('id', campaignId)
        .single();
    
    if(!campaign) return null;

    // B. Récup produits Odoo correspondants
    // AJOUT DES CHAMPS : categ_id et x_studio_many2one_field_Arl5D
    const products: any = await odooClient('product.template', 'search_read', [
        [['id', 'in', campaign.product_ids]],
        ['name', 'hs_code', 'qty_available', 'standard_price', 'list_price', 'barcode', 'categ_id', 'x_studio_many2one_field_Arl5D']
    ]);

    // C. Calcul des prix et génération image
    const details = products.map((p: any) => {
        // --- LOGIQUE IMAGE ---
        const code = p.hs_code ? p.hs_code.trim() : '';
        const catName = Array.isArray(p.categ_id) ? p.categ_id[1] : '';
        const isBeauty = catName.toLowerCase().includes('beauty');
        
        let imageUrl = '';
        if (code) {
             if (isBeauty) {
                 imageUrl = `http://pyiurs.com/images/images/${code}_.jpg`;
             } else {
                 const colorName = Array.isArray(p.x_studio_many2one_field_Arl5D) ? p.x_studio_many2one_field_Arl5D[1] : '';
                 // Si couleur présente: CODE_Couleur.jpg, sinon CODE_.jpg
                 imageUrl = colorName 
                    ? `http://pyiurs.com/images/images/${code}_${colorName}.jpg` 
                    : `http://pyiurs.com/images/images/${code}_.jpg`;
             }
        }

        // --- LOGIQUE PRIX ---
        // Note: Tu utilises list_price comme base. Si c'est le coût d'achat, c'est OK.
        // Sinon remplace p.list_price par p.standard_price.
        const cost = p.list_price || 0; 
        const shopPrice = cost * 1.25; // RÈGLE : BASE + 25%
        const discountAmount = cost * (campaign.discount_percent / 100);
        const promoPrice = cost - discountAmount;

        return {
            ...p,
            image_url: imageUrl, // Champ ajouté
            shop_price: shopPrice,
            promo_price: promoPrice,
            discount: campaign.discount_percent
        };
    });

    return { campaign, details };
}