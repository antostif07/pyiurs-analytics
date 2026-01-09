import { odooClient } from "@/lib/odoo/xmlrpc";

// --- TYPES ---
export interface InventoryGroup {
  id: string;
  displayName: string;
  stockCount: number;
  soldCount30d: number;
  revenue30d: number;
  sellThrough: number;
  status: 'STAR' | 'HOT' | 'HEALTHY' | 'SLOW' | 'DEAD';
  variantsCount: number;
}

// --- CONFIG ---
const PERIOD_DAYS = 30;

export async function getWomenDashboardStats() {
  // 1. Période : Aujourd'hui (Attention aux fuseaux horaires si nécessaire)
  const today = new Date().toISOString().split('T')[0];

  // 2. Le Filtre (Domain)
  // On traverse la relation : Ligne de vente -> Produit -> Segment Studio
  const domain = [
    ['order_id.date_order', '>=', today],               
    ['order_id.state', 'in', ['paid', 'done', 'invoiced']], // Ventes validées
    
    // C'est ici que ça change : on cible ton champ custom
    // Odoo permet d'accéder aux champs du produit via le "dot notation"
    ['product_id.x_studio_segment', '=', 'Femme'] 
  ];

  try {
    // 3. Récupération des lignes de ticket
    const posLines: any[] = await odooClient.searchRead('pos.order.line', {
      domain: domain,
      // On récupère le montant HT (price_subtotal) et TTC (price_subtotal_incl)
      // Ajuste selon ce que tu veux afficher
      fields: ['price_subtotal', 'price_subtotal_incl', 'qty', 'order_id'], 
    }) as unknown as any[];

    // 4. Calculs
    // Utilisons le TTC (Incl) car en boutique physique, c'est souvent ce qui parle le plus
    const totalRevenue = posLines.reduce((acc, line) => acc + line.price_subtotal_incl, 0);
    const totalItems = posLines.reduce((acc, line) => acc + line.qty, 0);
    
    // Compter les tickets uniques
    const uniqueOrderIds = new Set(posLines.map(line => line.order_id[0]));
    const ordersCount = uniqueOrderIds.size;
    
    const averageBasket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    return {
      revenue: totalRevenue,
      itemsSold: totalItems,
      ordersCount: ordersCount,
      averageBasket: averageBasket
    };

  } catch (error) {
    console.error("Erreur Odoo Module Femme:", error);
    // En cas d'erreur, on renvoie des zéros pour ne pas casser l'UI
    return {
      revenue: 0,
      itemsSold: 0,
      ordersCount: 0,
      averageBasket: 0
    };
  }
}

// --- INTELLIGENCE STOCK (CORRIGÉ) ---
export async function getInventoryIntelligence(): Promise<InventoryGroup[]> {
  const date = new Date();
  date.setDate(date.getDate() - PERIOD_DAYS);
  const dateStr = date.toISOString().split('T')[0];

  try {
    // 1. STOCKS RÉELS (Source: stock.quant)
    // On groupe par 'product_id' pour avoir la somme des quants par produit.
    // 'location_id.usage' = 'internal' est CRUCIAL pour ne pas compter les retours fournisseurs etc.
    const stockData = await odooClient.execute(
      'stock.quant',
      'read_group',
      [],
      {
        domain: [
          ['product_id.x_studio_segment', '=', 'Femme'],
          ['location_id.usage', '=', 'internal'] 
        ],
        fields: ['quantity', 'product_id'],
        groupby: ['product_id'],
        lazy: false
      }
    ) as any[];

    // 2. VENTES (Source: pos.order.line)
    const salesData = await odooClient.execute(
      'pos.order.line',
      'read_group',
      [],
      {
        domain: [
          ['order_id.date_order', '>=', dateStr],
          ['order_id.state', 'in', ['paid', 'done', 'invoiced']],
          ['product_id.x_studio_segment', '=', 'Femme'] // Optimisation
        ],
        fields: ['product_id', 'qty', 'price_subtotal_incl'],
        groupby: ['product_id'],
        lazy: false
      }
    ) as any[];

    // 3. MAPPING (Récupérer les HS Codes)
    // On collecte tous les IDs produits qui ont soit du stock, soit des ventes
    const allProductIds = new Set<number>();
    
    stockData.forEach((s: any) => {
      if(s.product_id) allProductIds.add(s.product_id[0]);
    });
    salesData.forEach((s: any) => {
      if(s.product_id) allProductIds.add(s.product_id[0]);
    });

    // Si rien n'est trouvé, on arrête
    if (allProductIds.size === 0) return [];

    // On récupère les infos (hs_code) seulement pour ces produits utiles
    // (Même si tu as 100k produits, tu n'en as peut-être que 5k avec du mouvement/stock)
    const productInfos = await odooClient.searchRead('product.product', {
      domain: [['id', 'in', Array.from(allProductIds)]],
      fields: ['id', 'hs_code', 'categ_id']
    }) as any[];

    // Création d'un dictionnaire ID -> Info
    const productMap = new Map<number, { code: string, cat: string }>();
    productInfos.forEach((p: any) => {
      const code = p.hs_code ? p.hs_code.toString().trim() : `NO_CODE_${p.id}`;
      // Gestion propre du nom de catégorie
      const catNameRaw = Array.isArray(p.categ_id) ? p.categ_id[1] : 'Indéfini';
      // On prend la dernière partie de la catégorie si c'est "Vetement / Femme / Robe" -> "ROBE"
      const catParts = catNameRaw.split(' / ');
      const shortCat = catParts[catParts.length - 1].toUpperCase();
      
      productMap.set(p.id, { code, cat: shortCat });
    });

    // 4. CONSOLIDATION FINALE (Par HS Code)
    const finalMap = new Map<string, InventoryGroup>();

    // Helper pour initialiser ou récupérer un groupe
    const getGroup = (code: string, catName: string) => {
      if (!finalMap.has(code)) {
        finalMap.set(code, {
          id: code,
          displayName: `${catName} - ${code}`,
          stockCount: 0,
          soldCount30d: 0,
          revenue30d: 0,
          sellThrough: 0,
          status: 'HEALTHY',
          variantsCount: 0
        });
      }
      return finalMap.get(code)!;
    };

    // A. Ajout des Stocks
    stockData.forEach((s: any) => {
      const pId = s.product_id ? s.product_id[0] : null;
      const info = productMap.get(pId);
      if (info && s.quantity > 0) {
        const group = getGroup(info.code, info.cat);
        group.stockCount += s.quantity;
        group.variantsCount += 1; // Compte approximatif des variantes en stock
      }
    });

    // B. Ajout des Ventes
    salesData.forEach((s: any) => {
      const pId = s.product_id ? s.product_id[0] : null;
      const info = productMap.get(pId);
      if (info) {
        const group = getGroup(info.code, info.cat);
        group.soldCount30d += s.qty || 0;
        group.revenue30d += s.price_subtotal_incl || 0;
      }
    });

    // 5. CALCULS KPIs
    const results = Array.from(finalMap.values()).map(group => {
       // Formule Sell-Through
       const totalInventoryStart = group.stockCount + group.soldCount30d;
       let sellThrough = 0;
       if (totalInventoryStart > 0) {
         sellThrough = (group.soldCount30d / totalInventoryStart) * 100;
       }

       // Logique de Status
       let status: any = 'HEALTHY';
       if (sellThrough >= 70) status = 'STAR';
       else if (sellThrough >= 40) status = 'HOT';
       else if (sellThrough < 10 && totalInventoryStart > 5) status = 'DEAD';
       else if (sellThrough < 25) status = 'SLOW';

       return { ...group, sellThrough: parseFloat(sellThrough.toFixed(1)), status };
    });

    // Tri : Stars d'abord
    return results.sort((a, b) => b.sellThrough - a.sellThrough);

  } catch (error) {
    console.error("❌ Erreur Stock Logic:", error);
    return [];
  }
}