import { odooClient } from "@/lib/odoo/xmlrpc";

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