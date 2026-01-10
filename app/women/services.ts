import { odooClient } from "@/lib/odoo/xmlrpc";

// --- TYPES ---
export interface ProductLifecycle {
  id: string;
  modelName: string;
  firstDropDate: string;
  lastDropDate: string;
  daysOnMarket: number;
  totalOrdered: number;
  totalSold: number;
  lifetimeSellThrough: number;
  stockCurrent: number;
  sold30d: number;
  revenueGenerated: number;
  potentialRevenue: number;
}

export interface PaginatedResult {
  data: ProductLifecycle[];
  total: number; // Nombre total de groupes (HS Codes) pour savoir combien de pages on a
}

// --- CONFIG ---
const TARGET_LOCATION_IDS = [
  89, //24 
  160, 293, // LMB
  170, // KTM
  180, // MTO
  200, 232, 259 // DC
];

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

export async function getLifecycleData(page: number = 1, pageSize: number = 50): Promise<PaginatedResult> {
  try {
    const offset = (page - 1) * pageSize;

    // --- ÉTAPE 1 : Récupérer la liste des HS Codes paginée ---
    // On groupe d'abord les produits par HS Code pour savoir "Quoi afficher sur cette page ?"
    // read_group nous donne aussi le count total implicitement si on ne met pas lazy=false trop tôt
    // Note: Pour avoir le total exact avec read_group, c'est parfois complexe. 
    // On va faire un search_count sur les produits uniques si besoin, ou se fier au length.
    
    // Pour simplifier et être précis sur la pagination des GROUPES :
    // On utilise read_group sur product.product
    const hsCodeGroups = await odooClient.execute('product.product', 'read_group', [], {
      domain: [
        ['x_studio_segment', '=', 'Femme'],
        ['active', '=', true]
      ],
      fields: ['hs_code'],
      groupby: ['hs_code'],
      limit: pageSize,
      offset: offset
      // orderby: 'create_date desc' // Optionnel: Trier par nouveauté
    }) as any[];
    
    // Si pas de résultats, on arrête
    if (!hsCodeGroups || hsCodeGroups.length === 0) {
      return { data: [], total: 0 };
    }
    // Pour le total, on peut faire un read_group sans limit/offset juste pour compter
    const totalGroupsCount = await odooClient.execute('product.product', 'read_group', [], {
       domain: [['x_studio_segment', '=', 'Femme'], ['active', '=', true]],
       fields: ['hs_code'],
       groupby: ['hs_code'],
       lazy: true // Juste pour compter
    }) as any[];
    const total = totalGroupsCount.length; 


    // --- ÉTAPE 2 : Récupérer les IDs produits de CES groupes ---
    // On extrait les HS Codes de la page courante
    const targetHsCodes = hsCodeGroups.map((g: any) => g.hs_code).filter(Boolean);
    
    // On cherche TOUS les produits qui ont ces HS Codes
    const productsInPage = await odooClient.searchRead('product.product', {
      domain: [
        ['hs_code', 'in', targetHsCodes],
        ['x_studio_segment', '=', 'Femme']
      ],
      fields: ['id', 'hs_code', 'categ_id', 'create_date', 'list_price']
    }) as any[];

    const productIds = productsInPage.map((p: any) => p.id);
    
    // Mapping ID -> Info
    const productMap = new Map<number, any>();
    productsInPage.forEach((p: any) => productMap.set(p.id, p));


    // --- ÉTAPE 3 : Récupérer Stocks & Ventes pour CES IDs ---
    const date30d = new Date();
    date30d.setDate(date30d.getDate() - 30);
    const date30dStr = date30d.toISOString().split('T')[0];

    // Parallélisme (Vitesse max)
    const [stockGroups, salesTotalGroups, sales30dGroups] = await Promise.all([
      // Stocks
      odooClient.execute('stock.quant', 'read_group', [], {
        domain: [['product_id', 'in', productIds], ['location_id', 'in', TARGET_LOCATION_IDS]],
        fields: ['quantity', 'product_id'],
        groupby: ['product_id'],
        lazy: false
      }),
      // Ventes Totales
      odooClient.execute('pos.order.line', 'read_group', [], {
        domain: [['product_id', 'in', productIds], ['order_id.state', 'in', ['paid', 'done', 'invoiced']]],
        fields: ['qty', 'price_subtotal_incl', 'product_id'],
        groupby: ['product_id'],
        lazy: false
      }),
      // Ventes 30j
      odooClient.execute('pos.order.line', 'read_group', [], {
        domain: [['product_id', 'in', productIds], ['order_id.date_order', '>=', date30dStr], ['order_id.state', 'in', ['paid', 'done', 'invoiced']]],
        fields: ['qty', 'product_id'],
        groupby: ['product_id'],
        lazy: false
      })
    ]) as [any[], any[], any[]];


    // --- ÉTAPE 4 : Consolidation (Identique à avant) ---
    const lifecycleMap = new Map<string, ProductLifecycle>();

    const getGroup = (hsCode: string, pInfo: any) => {
      if (!lifecycleMap.has(hsCode)) {
        const catNameRaw = Array.isArray(pInfo.categ_id) ? pInfo.categ_id[1] : 'Indéfini';
        const catParts = catNameRaw.split(' / ');
        const shortCat = catParts[catParts.length - 1].toUpperCase();

        lifecycleMap.set(hsCode, {
          id: hsCode,
          modelName: `${shortCat} - ${hsCode}`,
          firstDropDate: pInfo.create_date,
          lastDropDate: pInfo.create_date,
          daysOnMarket: 0,
          totalOrdered: 0,
          totalSold: 0,
          lifetimeSellThrough: 0,
          stockCurrent: 0,
          sold30d: 0,
          revenueGenerated: 0,
          potentialRevenue: 0
        });
      }
      return lifecycleMap.get(hsCode)!;
    };

    // Remplissage Stocks
    stockGroups.forEach((s: any) => {
      const pInfo = productMap.get(s.product_id[0]);
      if (pInfo && s.quantity > 0) {
        const hs = pInfo.hs_code || `UNK_${pInfo.id}`;
        const group = getGroup(hs, pInfo);
        group.stockCurrent += s.quantity;
        group.potentialRevenue += (s.quantity * pInfo.list_price);
        if (pInfo.create_date > group.lastDropDate) group.lastDropDate = pInfo.create_date;
      }
    });

    // Remplissage Ventes
    salesTotalGroups.forEach((s: any) => {
      const pInfo = productMap.get(s.product_id[0]);
      if (pInfo) {
        const hs = pInfo.hs_code || `UNK_${pInfo.id}`;
        const group = getGroup(hs, pInfo);
        group.totalSold += s.qty || 0;
        group.revenueGenerated += s.price_subtotal_incl || 0;
      }
    });

    sales30dGroups.forEach((s: any) => {
      const pInfo = productMap.get(s.product_id[0]);
      if (pInfo) {
        const hs = pInfo.hs_code || `UNK_${pInfo.id}`;
        getGroup(hs, pInfo).sold30d += s.qty || 0;
      }
    });

    // Calculs Finaux
    const data = Array.from(lifecycleMap.values()).map(item => {
      item.totalOrdered = item.stockCurrent + item.totalSold;
      if (item.totalOrdered > 0) item.lifetimeSellThrough = (item.totalSold / item.totalOrdered) * 100;
      
      const dropDate = new Date(item.firstDropDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dropDate.getTime());
      item.daysOnMarket = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return item;
    });

    return { data, total };

  } catch (error) {
    console.error("❌ Erreur Lifecycle Pagination:", error);
    return { data: [], total: 0 };
  }
}