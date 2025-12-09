'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';
import { createClient } from '@/lib/supabase/server';

// CONFIGURATION
const SEGMENT_FIELD = 'product_id.product_tmpl_id.x_studio_segment';
const SEGMENT_VALUE = 'femme';

export async function getFemmeOverview(range: '7j' | '30j' | '12m') {
  
  // 1. Dates
  const today = new Date();
  let startDate = new Date();
  if (range === '7j') startDate.setDate(today.getDate() - 7);
  if (range === '30j') startDate.setDate(today.getDate() - 30);
  if (range === '12m') startDate.setFullYear(today.getFullYear() - 1);
  const fmtDate = startDate.toISOString().split('T')[0];

  try {
    // --- DOMAINE ---
    const posDomain = [
      [SEGMENT_FIELD, 'ilike', SEGMENT_VALUE],
      ['order_id.date_order', '>=', fmtDate],
      ['order_id.state', 'in', ['paid', 'done', 'invoiced']]
    ];

    // --- ÉTAPE 1 : Requêtes Initiales (KPI + Top Variants) ---
    // On demande le TOP 100 variants pour être sûr d'avoir assez de matière 
    // pour constituer le TOP 5 Modèles après regroupement.
    const [statsResult, topVariantsResult, targetResult] = await Promise.all([
      // A. KPI Totaux (Reste inchangé)
      odooClient('pos.order.line', 'read_group', [], {
        domain: posDomain, fields: ['price_subtotal', 'qty'], groupby: [] 
      }),
      // B. Top 100 Variants (On trie, on groupe plus tard)
      odooClient('pos.order.line', 'read_group', [], {
        domain: posDomain, fields: ['price_subtotal', 'qty'], groupby: ['product_id'], orderby: 'qty desc', limit: 100
      }),
      // C. Target
      getSupabaseTarget()
    ]);

    // --- ÉTAPE 2 : Enrichissement & Regroupement par HS CODE ---
    const topVariants = (topVariantsResult as any[]) || [];

    // Récupérer les détails (HS Code, Name) de ces 100 variants
    let variantsInfo: any[] = [];
    if (topVariants.length > 0) {
        const variantIds = topVariants.map((v: any) => v.product_id[0]);
        // On récupère hs_code et name
        variantsInfo = await odooClient('product.product', 'read', [
            variantIds, ['hs_code', 'name', 'qty_available']
        ]) as any[];
    }

    // Création d'une Map pour grouper par HS Code
    // Clé = hs_code, Valeur = { sold, revenue, name, variantsStock }
    const refMap = new Map<string, { name: string, sold: number, revenue: number, hs_code: string }>();

    variantsInfo.forEach((prod) => {
        // Trouver les ventes associées à ce variant dans le résultat précédent
        const salesData = topVariants.find((v: any) => v.product_id[0] === prod.id);
        if (!salesData) return;

        // La clé de regroupement est le HS CODE. S'il est vide, on utilise le nom (fallback)
        const key = prod.hs_code || prod.name; 
        
        // On nettoie le nom (souvent "Robe (S)" -> on veut juste "Robe")
        // Tu peux adapter cette logique de nommage selon tes données
        const cleanName = prod.name.split('[')[0].trim(); 

        const existing = refMap.get(key) || { 
            name: prod.hs_code ? `${cleanName} [${prod.hs_code}]` : cleanName, 
            sold: 0, 
            revenue: 0,
            hs_code: prod.hs_code 
        };

        refMap.set(key, {
            name: existing.name,
            hs_code: existing.hs_code, // On garde le code pour chercher le stock total après
            sold: existing.sold + (salesData.qty || 0),
            revenue: existing.revenue + (salesData.price_subtotal || 0),
        });
    });

    // Transformer la Map en tableau et Trier pour avoir le vrai Top 5 Références
    const topRefs = Array.from(refMap.values())
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);

    // --- ÉTAPE 3 : Stock Total par Référence ---
    // Pour chaque Référence du Top 5, on veut la somme du stock de TOUS les variants (pas juste ceux vendus)
    const topHsCodes = topRefs.map(r => r.hs_code).filter(Boolean);
    let stockMap: Record<string, number> = {};

    if (topHsCodes.length > 0) {
        // On cherche tous les produits qui ont ces HS Codes
        const allVariantsForStock = await odooClient('product.product', 'search_read', [
            [['hs_code', 'in', topHsCodes]], // Domaine
            ['hs_code', 'qty_available']     // Champs
        ]) as any[];

        // On somme le stock par HS Code
        allVariantsForStock.forEach(v => {
            if (v.hs_code) {
                stockMap[v.hs_code] = (stockMap[v.hs_code] || 0) + v.qty_available;
            }
        });
    }

    // --- RETOUR FINAL ---
    const stats = (statsResult as any[])?.[0] || {};
    const totalRevenue = stats.price_subtotal || 0;
    const totalUnits = stats.qty || 0;
    const target = targetResult || 50000;

    return {
      kpi: {
        revenue: totalRevenue,
        unitsSold: totalUnits,
        avgUnitVal: totalUnits > 0 ? Math.round(totalRevenue / totalUnits) : 0,
      },
      topProducts: topRefs.map((p) => ({
        id: p.hs_code, // On utilise le HS Code comme ID unique ici
        name: p.name,
        sold: p.sold,
        revenue: p.revenue,
        stock: stockMap[p.hs_code] ?? 0 // Le stock TOTAL de la référence
      })),
      target: {
        current: totalRevenue,
        goal: target,
        percent: target > 0 ? Math.round((totalRevenue / target) * 100) : 0
      }
    };

  } catch (error) {
    console.error("Erreur Odoo:", error);
    return {
        kpi: { revenue: 0, unitsSold: 0, avgUnitVal: 0 },
        topProducts: [],
        target: { current: 0, goal: 0, percent: 0 }
    };
  }
}

async function getSupabaseTarget() {
  const supabase = createClient();
  const now = new Date();
  
  const { data } = await supabase
    .from('sales_targets')
    .select('target_amount')
    .eq('category_tag', 'femme')
    .eq('year', now.getFullYear())
    .eq('month', now.getMonth() + 1)
    .single();
  return data?.target_amount || 50000;
}