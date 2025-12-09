'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';

const SEGMENT_FIELD = 'product_id.product_tmpl_id.x_studio_segment';
const SEGMENT_VALUE = 'femme';

export type HeatmapData = {
  day: string;
  hours: number[];
};

export type CategoryData = {
  name: string;
  revenue: number;
  count: number;
};

export async function getPosConfigs() {
  try {
    const configs = await odooClient('pos.config', 'search_read', [], {
      fields: ['name'], // On récupère juste ID et Nom
      order: 'name asc'
    }) as any[];
    return configs.map((c: any) => ({ id: c.id, name: c.name }));
  } catch (e) {
    console.error("Erreur POS Configs:", e);
    return [];
  }
}

export async function getSalesTrends(period: '7d' | '30d' | '90d', configId?: string) {
  const endDate = new Date();
  const startDate = new Date();
  
  if (period === '7d') startDate.setDate(endDate.getDate() - 7);
  if (period === '30d') startDate.setDate(endDate.getDate() - 30);
  if (period === '90d') startDate.setDate(endDate.getDate() - 90);

  const fmtDate = (d: Date) => d.toISOString().split('T')[0];

  try {
    // 1. Récupérer les ventes POS
    const domain = [
      [SEGMENT_FIELD, 'ilike', SEGMENT_VALUE],
      ['order_id.date_order', '>=', fmtDate(startDate)],
      ['order_id.state', 'in', ['paid', 'done', 'invoiced']]
    ];

    if (configId) {
      domain.push(['order_id.session_id.config_id', '=', configId]); 
      // Note: Parfois c'est 'order_id.config_id' direct selon version Odoo. 
      // Mais 'order_id.session_id.config_id' est le chemin le plus sûr techniquement.
    }
    const sales = await odooClient('pos.order.line', 'search_read', [domain], {
      fields: ['price_subtotal', 'create_date', 'product_id'], 
      limit: 5000 
    }) as any[];

    // 2. Récupérer les IDs des produits
    const productIds = [...new Set(sales.map(s => s.product_id[0]))];
    
    // 3. Récupérer les catégories IDs sur les produits (pos_categ_ids)
    const productsInfo = await odooClient('product.product', 'read', [productIds], {
      fields: ['pos_categ_ids'] // <--- Changement ici (Pluriel)
    }) as any[];

    // 4. Collecter tous les IDs de catégories uniques pour chercher leurs noms
    const categoryIds = new Set<number>();
    const productToCatIds = new Map<number, number[]>();

    productsInfo.forEach((p: any) => {
      const cats = p.pos_categ_ids || [];
      productToCatIds.set(p.id, cats);
      cats.forEach((cId: number) => categoryIds.add(cId));
    });

    // 5. Récupérer les NOMS des catégories depuis pos.category
    let catIdToName = new Map<number, string>();
    
    if (categoryIds.size > 0) {
      const categoriesInfo = await odooClient('pos.category', 'read', [[...categoryIds]], {
        fields: ['name']
      }) as any[];
      
      categoriesInfo.forEach((c: any) => {
        catIdToName.set(c.id, c.name);
      });
    }

    // --- TRAITEMENT DES DONNÉES ---

    const daysOrder = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const heatMapRaw: Record<string, number[]> = {};
    daysOrder.forEach(d => heatMapRaw[d] = new Array(24).fill(0));

    const catStats: Record<string, { rev: number, count: number }> = {};

    sales.forEach(sale => {
      // A. Heatmap
      const date = new Date(sale.create_date); // Attention: create_date est UTC
      const dayName = daysOrder[date.getDay()];
      const hour = date.getHours(); 
      
      if (heatMapRaw[dayName]) {
        heatMapRaw[dayName][hour] += 1;
      }

      // B. Category Logic
      const pId = sale.product_id[0];
      const pCatIds = productToCatIds.get(pId) || [];
      
      // Stratégie : On prend la PREMIÈRE catégorie trouvée.
      // Si un produit n'a pas de catégorie, on le met dans "Sans Catégorie"
      let catName = "Sans Catégorie";
      
      if (pCatIds.length > 0) {
        // On récupère le nom de la première catégorie (ID)
        const firstCatId = pCatIds[0]; 
        catName = catIdToName.get(firstCatId) || "Inconnu";
      }
      
      if (!catStats[catName]) catStats[catName] = { rev: 0, count: 0 };
      catStats[catName].rev += sale.price_subtotal || 0;
      catStats[catName].count += 1;
    });

    // --- RETOUR ---

    // Formatage Heatmap
    const heatmap: HeatmapData[] = daysOrder.map(day => ({ 
        day, 
        hours: heatMapRaw[day]
    })).filter(d => d.day !== "Dim"); // Filtre Dimanche si fermé

    const orderedHeatmap = [...heatmap.slice(1), heatmap[0]].filter(Boolean);

    // Formatage Categories
    const categories: CategoryData[] = Object.entries(catStats)
      .map(([name, val]) => ({ name, revenue: val.rev, count: val.count }))
      .sort((a, b) => b.revenue - a.revenue);

    return { heatmap: orderedHeatmap, categories };

  } catch (error) {
    console.error("Trends Error:", error);
    return { heatmap: [], categories: [] };
  }
}