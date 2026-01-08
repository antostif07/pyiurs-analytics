'use server';

import { odooClient } from '@/lib/odoo/xmlrpc';

const SEGMENT_FIELD = 'x_studio_segment';
const SEGMENT_VALUE = 'femme';

export type AnalysisRow = {
  hs_code: string;
  name: string;          // Nom représentatif
  create_date: string;   // Date de sortie la plus ancienne
  total_sold: number;    // Ventes totales
  total_revenue: number; // CA total
  current_stock: number; 
  last_sale: string;     // Date dernière vente
  days_on_market: number;
  velocity: number;      // Ventes / Semaine
  decision: 'BEST_SELLER' | 'GOOD' | 'SLOW' | 'DEAD' | 'NEW';
  image_url: string;
};

export async function getPerformanceAnalysis(from: string, to: string) {
  try {
    // 1. Trouver les Templates créés dans la période
    const domain = [
      [SEGMENT_FIELD, 'ilike', SEGMENT_VALUE],
      ['create_date', '>=', from],
      ['create_date', '<=', `${to} 23:59:59`], // Fin de journée
    ];

    // On récupère tout (pas de limite, car on veut analyser la collection entière)
    // Attention si collection géante > 1000 items, il faudra optimiser
    const templates = await odooClient('product.template', 'search_read', [domain], {
      fields: ['name', 'hs_code', 'default_code', 'create_date', 'qty_available', 'list_price', 'x_studio_many2one_field_Arl5D'],
      order: 'create_date desc'
    }) as any[];    

    if (!templates.length) return [];

    // 2. Préparer le regroupement par HS CODE
    const modelMap = new Map<string, {
      ids: number[],
      name: string,
      stock: number,
      created: string,
      hs_code: string,
      color: string|undefined|null;
    }>();

    templates.forEach(t => {
      // Clé de groupement : HS Code, sinon Reference, sinon ID
      const key = t.hs_code || t.default_code || `ID-${t.id}`;
      const existing = modelMap.get(key);

      if (existing) {
        existing.ids.push(t.id);
        existing.stock += (t.qty_available || 0);
        // On garde la date de création la plus ancienne (date de lancement du premier coloris)
        if (t.create_date < existing.created) existing.created = t.create_date;
      } else {
        modelMap.set(key, {
          ids: [t.id],
          hs_code: key,
          name: t.name,
          stock: t.qty_available || 0,
          created: t.create_date,
          color: t.x_studio_many2one_field_Arl5D[1]
        });
      }
    });

    // 3. Récupérer les Ventes POS pour ces modèles (Historique complet depuis création)
    // On doit passer par les variants
    const allTemplateIds = templates.map(t => t.id);
    const variants = await odooClient('product.product', 'search_read', [
        [['product_tmpl_id', 'in', allTemplateIds]]
    ], { fields: ['product_tmpl_id'] }) as any[];

    const variantIds = variants.map(v => v.id);
    const variantToTemplate = new Map<number, number>();
    variants.forEach(v => variantToTemplate.set(v.id, v.product_tmpl_id[0]));

    // On récupère les ventes SANS filtre de date de commande (on veut la performance à vie de ce produit)
    // Ou avec filtre si tu veux juste les ventes sur la période ? 
    // -> "combien a été vendu" sur un produit créé récemment implique souvent "depuis le début".
    const salesData = await odooClient('pos.order.line', 'read_group', [], {
      domain: [
        ['product_id', 'in', variantIds],
        ['order_id.state', 'in', ['paid', 'done', 'invoiced']]
      ],
      fields: ['qty', 'price_subtotal', 'create_date:max'], // create_date:max pour dernière vente
      groupby: ['product_id']
    }) as any[];

    // 4. Consolider les données
    const finalResults: AnalysisRow[] = [];
    const today = new Date();

    // Map intermédiaire pour sommer les ventes par Template ID
    const salesByTemplate = new Map<number, { qty: number, rev: number, last: string }>();
    
    salesData.forEach((s: any) => {
        const tmplId = variantToTemplate.get(s.product_id[0]);
        if (!tmplId) return;
        
        const prev = salesByTemplate.get(tmplId) || { qty: 0, rev: 0, last: '' };
        
        // Gestion max date
        // Odoo read_group retourne parfois la date max bizarrement selon versions
        // Si create_date:max ne marche pas, on fera sans pour l'instant
        // Supposons qu'on utilise la logique "Last Sale" simplifiée
        
        salesByTemplate.set(tmplId, {
            qty: prev.qty + (s.qty || 0),
            rev: prev.rev + (s.price_subtotal || 0),
            last: '' // TODO: Optimiser last sale
        });
    });

    // Construire le tableau final
    modelMap.forEach((model) => {
        let totalSold = 0;
        let totalRev = 0;

        model.ids.forEach(tid => {
            const s = salesByTemplate.get(tid);
            if (s) {
                totalSold += s.qty;
                totalRev += s.rev;
            }
        });

        // Calculs Métriques
        const creationDate = new Date(model.created);
        const daysOnMarket = Math.max(1, Math.floor((today.getTime() - creationDate.getTime()) / (1000 * 3600 * 24)));
        const velocity = (totalSold / daysOnMarket) * 7; // Ventes par Semaine

        // Algorithme de Décision
        let decision: AnalysisRow['decision'] = 'GOOD';
        
        if (daysOnMarket < 14) {
            decision = 'NEW';
        } else if (velocity > 5) { // Vends plus de 5 pièces / semaine
            decision = 'BEST_SELLER';
        } else if (velocity < 0.5 && model.stock > 0) { // Moins de 1 vente tous les 15 jours
            decision = 'DEAD'; // Stock mort
        } else if (velocity < 2) {
            decision = 'SLOW';
        }

        finalResults.push({
            hs_code: model.hs_code,
            name: model.name,
            create_date: model.created.split(' ')[0],
            total_sold: totalSold,
            total_revenue: totalRev,
            current_stock: model.stock,
            last_sale: 'N/A', // Difficile à avoir performant en read_group pur sans double query
            days_on_market: daysOnMarket,
            velocity: Number(velocity.toFixed(1)),
            decision: decision,
            image_url: `https://images.pyiurs.com/images/${model.hs_code}_${model.color}.jpg`,
        });
    });

    // Tri par performance (Best sellers en haut)
    return finalResults.sort((a, b) => b.total_revenue - a.total_revenue);

  } catch (error) {
    console.error(error);
    return [];
  }
}

export type PromoCandidate = {
  id: number;
  hs_code: string;
  name: string;
  image_url: string;
  stock: number;
  price: number;        // Prix de vente public
  cost: number;         // Coût de revient (standard_price)
  days_dormant: number; // Jours depuis la dernière vente (ou création si 0 vente)
  cash_tied_up: number; // Valeur du stock (au prix coûtant) -> Argent qui dort
};

export async function getDeadStockCandidates() {
  try {
    // 1. Trouver les produits avec du stock mais peu de mouvement
    // On va chercher les templates femme avec stock > 0
    const domain = [
      ['x_studio_segment', 'ilike', 'femme'],
      ['qty_available', '>', 0] 
    ];

    const templates = await odooClient('product.template', 'search_read', [domain], {
      fields: ['name', 'hs_code', 'qty_available', 'list_price', 'standard_price', 'create_date'],
      order: 'qty_available desc',
      limit: 200 // On analyse les 200 plus gros stocks pour commencer
    }) as any[];

    // 2. Vérifier la vélocité (Ventes 30 derniers jours)
    // (On réutilise la logique de velocity qu'on a déjà faite, je simplifie ici)
    const templateIds = templates.map(t => t.id);
    
    // ... (Récupération des variantes comme avant) ...
    // ... (Récupération des ventes POS 30j comme avant) ...
    // Pour l'exemple, supposons qu'on a une map `salesMap` { templateId: qtySold30d }
    
    // Mock pour l'instant si tu veux tester l'UI direct :
    // En prod, tu copies la logique "velocity" du module précédent.

    const candidates: PromoCandidate[] = [];

    templates.forEach(t => {
      // Simule une vélocité faible pour le test
      // const velocity = salesMap.get(t.id) || 0;
      const velocity = Math.random() > 0.7 ? 5 : 0; // 70% de chance d'être "dormant"

      if (velocity < 2) { // Critère : Moins de 2 ventes par mois = Candidat Promo
        candidates.push({
          id: t.id,
          hs_code: t.hs_code || `REF-${t.id}`,
          name: t.name,
          image_url: `${process.env.ODOO_URL}/web/image/product.template/${t.id}/image_128`,
          stock: t.qty_available,
          price: t.list_price,
          cost: t.standard_price || (t.list_price * 0.4), // Fallback coût estimé à 40% si vide
          days_dormant: 45, // Simulé
          cash_tied_up: t.qty_available * (t.standard_price || (t.list_price * 0.4))
        });
      }
    });

    // Tri par "Argent qui dort" décroissant (les plus urgents à vider)
    return candidates.sort((a, b) => b.cash_tied_up - a.cash_tied_up);

  } catch (error) {
    console.error(error);
    return [];
  }
}