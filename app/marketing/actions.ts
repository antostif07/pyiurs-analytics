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