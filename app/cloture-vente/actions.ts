import { endOfDay, format, startOfDay } from "date-fns";
import { POSConfig, POSOrder, POSOrderLine, POSPayment } from "../types/pos";
import { AccountAccount, Expense, ExpenseSheet } from "../types/cloture";
import { Profile } from "@/contexts/AuthContext";
import { ProductProduct } from "../types/product_template";
import { odooClient } from "@/lib/odoo/xmlrpc";

// Type de retour enrichi pour les cartes
type DailySalesResult = {
  success: boolean;
  records: POSOrder[]; // On le garde pour la suite
  stats: {
    femme: number;
    enfants: number;
    beauty: number;
  };
  totals: {
    cash: number;
    bank: number;
    mobile: number;
    onl: number;
    daily: number;
  };
  counts: { // NOUVEAU: Pour le nombre de transactions
    cash: number;
    bank: number;
    mobile: number;
    onl: number;
  }
};

// 1. Récupérer la liste des boutiques (Ultra rapide + Cache)
export async function getPOSConfig() {
  try {
    const records = await odooClient.searchRead('pos.config', {
      domain: [["id", "not in", [19]]], // Ton exclusion actuelle
      fields: ['id', 'name'],
    }) as POSConfig[];

    return { success: true, records };
  } catch (error) {
    console.error("Erreur getPOSConfig:", error);
    return { success: false, records: [] };
  }
}

// Récupérer les ventes du jour avec filtre shop
export async function getDailySalesLines(date: Date, shop?: string): Promise<DailySalesResult> {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss");
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss");

  // 1. Définition des filtres
  const commonDomain = [
    ['date_order', '>=', startDate],
    ['date_order', '<=', endDate],
    ['state', 'in', ['paid', 'done', 'invoiced']]
  ];
  
  // Si shop='all', on exclut juste le shop historique (19), sinon on filtre précis
  const shopDomain = (shop && shop !== 'all') 
    ? [['config_id', '=', parseInt(shop)]] 
    : [['config_id', 'not in', [19]]];

  const fullDomain = [...commonDomain, ...shopDomain];

  try {
    // 2. EXÉCUTION PARALLÈLE (4 Requêtes simultanées)
    const [ordersBasic, paymentGroups, lineGroups] = await Promise.all([
      
      // A. Récupérer les Commandes (Structure de base)
      odooClient.searchRead('pos.order', {
        domain: fullDomain,
        fields: ['id', 'name', 'pos_reference', 'amount_total', 'partner_id', 'date_order', 'state', 'payment_ids', 'config_id', 'create_date'], 
        order: 'date_order desc'
      }),

      // B. Agrégation des Paiements (Pour les Totaux et Compteurs)
      odooClient.execute('pos.payment', 'read_group', [], {
        domain: [
            ['payment_date', '>=', startDate],
            ['payment_date', '<=', endDate],
            // Filtre sur la session liée
            ...(shop && shop !== 'all' ? [['session_id.config_id', '=', parseInt(shop)]] : [['session_id.config_id', '!=', 19]])
        ],
        fields: ['amount', 'payment_method_id'],
        groupby: ['payment_method_id'],
        lazy: false
      }),

      // C. Agrégation des Lignes (Pour les Stats Femme/Enfant)
      // On groupe par PRODUIT pour éviter le bug categ_id
      odooClient.execute('pos.order.line', 'read_group', [], {
        domain: [
            ['order_id.date_order', '>=', startDate],
            ['order_id.date_order', '<=', endDate],
            ['order_id.state', 'in', ['paid', 'done', 'invoiced']],
            ...(shop && shop !== 'all' ? [['order_id.config_id', '=', parseInt(shop)]] : [['order_id.config_id', '!=', 19]])
        ],
        fields: ['price_subtotal_incl', 'product_id'],
        groupby: ['product_id'],
        lazy: false
      })
    ]);

    // 3. TRAITEMENT : Hydratation des Paiements pour DetailsAndAccounting
    // Ton composant trie les ventes par méthode de paiement, il lui faut les détails.
    const orders = ordersBasic as any[];
    const orderIds = orders.map(o => o.id);
    let allPayments: any[] = [];

    if (orderIds.length > 0) {
        // On récupère tous les paiements liés à ces commandes en une seule fois
        allPayments = await odooClient.searchRead('pos.payment', {
            domain: [['pos_order_id', 'in', orderIds]],
            fields: ['id', 'amount', 'payment_method_id', 'pos_order_id', 'payment_date']
        }) as any[];
    }

    // On crée un dictionnaire : OrderID -> [Paiements]
    const paymentsByOrder = new Map<number, POSPayment[]>();
    allPayments.forEach((p: any) => {
        const orderId = p.pos_order_id ? p.pos_order_id[0] : 0;
        if (!paymentsByOrder.has(orderId)) paymentsByOrder.set(orderId, []);
        paymentsByOrder.get(orderId)?.push(p);
    });

    // On assemble les commandes finales
    const enrichedOrders = orders.map(order => ({
        ...order,
        lines: [], // On laisse vide pour la perf (l'UI liste n'affiche pas les produits)
        payments: paymentsByOrder.get(order.id) || [] // INDISPENSABLE pour DetailsAndAccounting
    }));


    // 4. TRAITEMENT : Calcul des Stats Segments (Via x_studio_segment)
    const productIds = (lineGroups as any[])
        .map((g: any) => g.product_id ? g.product_id[0] : null)
        .filter(id => id);
    
    let productInfos: any[] = [];
    if (productIds.length > 0) {
        // On récupère le champ Studio directement
        productInfos = await odooClient.searchRead('product.product', {
            domain: [['id', 'in', productIds]],
            fields: ['id', 'x_studio_segment'] 
        }) as any[];
    }

    const segmentMap = new Map<number, string>();
    productInfos.forEach((p: any) => {
        const segment = p.x_studio_segment ? p.x_studio_segment.toString().toLowerCase() : '';
        segmentMap.set(p.id, segment);
    });

    const stats = { femme: 0, enfants: 0, beauty: 0 };
    (lineGroups as any[]).forEach((g: any) => {
        const pId = g.product_id ? g.product_id[0] : 0;
        const segment = segmentMap.get(pId) || '';
        const amount = g.price_subtotal_incl || 0;

        if (segment === 'femme') stats.femme += amount;
        else if (segment.includes('enfant')) stats.enfants += amount;
        else if (segment === 'beauty') stats.beauty += amount;
    });


    // 5. TRAITEMENT : Totaux et Compteurs
    const totals = { cash: 0, bank: 0, mobile: 0, onl: 0, daily: 0 };
    const counts = { cash: 0, bank: 0, mobile: 0, onl: 0 };

    (paymentGroups as any[]).forEach((g: any) => {
        const name = g.payment_method_id ? g.payment_method_id[1].toLowerCase() : '';
        const amount = g.amount || 0;
        const count = g.__count || 1; // Le nombre de transactions de ce type

        totals.daily += amount;

        if (name.includes('esp')) { 
            totals.cash += amount; 
            counts.cash += count; 
        }
        else if (name.includes('ban')) { 
            totals.bank += amount; 
            counts.bank += count; 
        }
        else if (name.includes('onl')) { 
            totals.onl += amount; 
            counts.onl += count; 
        }
        else if (['mobile', 'money', 'pesa', 'airtel', 'orange'].some(k => name.includes(k))) {
            totals.mobile += amount;
            counts.mobile += count;
        }
    });

    return {
      success: true,
      records: enrichedOrders as POSOrder[],
      stats,
      totals,
      counts
    };

  } catch (error) {
    console.error("❌ Erreur getDailySalesLines:", error);
    return { 
        success: false, 
        records: [], 
        stats: { femme: 0, beauty: 0, enfants: 0 }, 
        totals: { cash: 0, bank: 0, mobile: 0, onl: 0, daily: 0 },
        counts: { cash: 0, bank: 0, mobile: 0, onl: 0 }
    };
  }
}

// export async function getDailyExpensesReport(date: Date, company_name?: string) {
//   const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
//   const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
//   const fields = 'id,name,expense_line_ids,state,company_id,product_ids,display_name,total_amount,payment_state,payment_mode,journal_id';
//   let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
//   if (company_name && company_name !== 'all') {
//     domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["company_id", "ilike", "${company_name}"]]`
//   }
  
//   const expenseRes = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense.sheet?fields=${fields}&domain=${encodeURIComponent(domain)}`,
//     { cache: 'no-store' }
//   )

//   if (!expenseRes.ok) throw new Error("Erreur API Odoo - Recuperation des dépenses")
//   const expenseData = await expenseRes.json();
//   if (!expenseData.success) throw new Error(expenseData.error || "Erreur Odoo (he.expense)");

//   // Récupérer tous les IDs d'expenses de tous les sheets
//   const allExpenseIds = expenseData.records.flatMap((sheet: any) => 
//     sheet.expense_line_ids || []
//   );

//   if (allExpenseIds.length === 0) {
//     return { 
//       success: true, 
//       records: expenseData.records.map((sheet: any) => ({ ...sheet, expenses: [] })) 
//     };
//   }

//   // Récupérer toutes les expenses en un seul appel
//   const expenseLinesDomain = `[["id", "in", [${allExpenseIds.join(",")}]]]`;
//   const expenseLinesRes = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense?fields=id,total_amount,name,create_date,product_id,company_id,account_id&domain=${encodeURIComponent(expenseLinesDomain)}`,
//     { cache: 'no-store' }
//   );

//   if (!expenseLinesRes.ok) throw new Error("Erreur API Odoo - Recuperation des lignes de dépenses")
//   const expenseLinesData = await expenseLinesRes.json();
//   if (!expenseLinesData.success) throw new Error(expenseLinesData.error || "Erreur Odoo (he.expense)");

//   // Récupérer tous les comptes en un seul appel
//   const accountIds = expenseLinesData.records
//     .map((expense: any) => expense.account_id && expense.account_id[0])
//     .filter((id: number) => id !== undefined);

//   let accountsMap = new Map();
  
//   if (accountIds.length > 0) {
//     const accountsDomain = `[["id", "in", [${accountIds.join(",")}]]]`;
//     const accountsRes = await fetch(
//       `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/account.account?fields=id,name,code,x_studio_categorie_compte&domain=${encodeURIComponent(accountsDomain)}`,
//       { cache: 'no-store' }
//     );

//     if (accountsRes.ok) {
//       const accountsData = await accountsRes.json();
//       if (accountsData.success) {
//         accountsData.records.forEach((account: any) => {
//           accountsMap.set(account.id, account);
//         });
//       }
//     }
//   }

//   // Créer un map des expenses par ID pour un accès rapide
//   const expensesMap = new Map();
//   expenseLinesData.records.forEach((expense: any) => {
//     const accountData = expense.account_id && expense.account_id[0] 
//       ? accountsMap.get(expense.account_id[0])
//       : null;
    
//     expensesMap.set(expense.id, {
//       ...expense,
//       account: accountData
//     });
//   });

//   // Associer les expenses enrichies à chaque sheet
//   const sheetWithExpenses = expenseData.records.map((sheet: any) => ({
//     ...sheet,
//     expenses: (sheet.expense_line_ids || [])
//       .map((expenseId: number) => expensesMap.get(expenseId))
//       .filter((expense: Expense) => expense !== undefined)
//   }));

//   return { success: true, records: sheetWithExpenses };
// }

// // Récupérer les dépenses du jour
// export async function getDailyExpenses(date: Date, company_name?: string) {
//   const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
//   const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
//   let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
//   if (company_name && company_name !== 'all') {
//     domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["company_id", "ilike", "${company_name}"]]`
//   }
  
//   const expenseRes = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense?fields=id,total_amount,name,create_date,product_id,company_id,account_id&domain=${encodeURIComponent(domain)}`,
//     { cache: 'no-store' }
//   )

//   if (!expenseRes.ok) throw new Error("Erreur API Odoo - Recuperation des dépenses")
//   const expenseData = await expenseRes.json();
//   if (!expenseData.success) throw new Error(expenseData.error || "Erreur Odoo (he.expense)");

//   const expenses = expenseData.records as Expense[];
//   const allAccountIds = expenses.flatMap((e: Expense) => e.account_id?.[0] || []);

//   if (allAccountIds.length === 0) {
//     return { success: true, records: expenses };
//   }

//   const accountsDomain = `[["id", "in", [${allAccountIds.join(",")}]]]`;
//   const accountRes = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/account.account?fields=id,x_studio_categorie_compte,name,code&domain=${encodeURIComponent(accountsDomain)}`,
//     { next: { revalidate: 300 } }
//   );

//   if (!accountRes.ok) throw new Error("Erreur API Odoo - Récupération des comptes");
//   const accountsData = await accountRes.json();
//   if (!accountsData.success) throw new Error(accountsData.error || "Erreur Odoo (account.account)");

//   const accounts = accountsData.records;
//   const enrichedExpenses = expenses.map((expense: Expense) => ({
//     ...expense,
//     account: accounts.find((a: AccountAccount) => a.id === expense.account_id?.[0]) || null,
//   }));

//   return { success: true, records: enrichedExpenses };
// }

// Récupérer le taux de change actuel
export async function getExchangeRate(): Promise<number> {
  return 2450.00
}

// Fonction pour filtrer les shops selon les permissions
export function filterShopsByUserAccess(allShops: POSConfig[], profile: Profile): POSConfig[] {
  // Les admins voient tout
  if (profile.role === 'admin') {
    return allShops;
  }
  
  // Si l'utilisateur a accès à tout
  if (profile.assigned_shops.includes('all')) {
    return allShops;
  }
  
  // Filtrer selon les boutiques assignées
  return allShops.filter(shop => 
    profile.assigned_shops.includes(shop.id.toString())
  );
}
export async function getDailyExpensesReport(date: Date, company_name?: string) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd");
  const endDate = format(endOfDay(date), "yyyy-MM-dd");

  // 1. Filtre : Date + État validé
  const domain = [
    ["date", ">=", startDate], // hr.expense stocke souvent en YYYY-MM-DD simple
    ["date", "<=", endDate],
    ["state", "in", ["approved", "done", "reported"]] // On ne veut pas les brouillons/refusés
  ];

  if (company_name && company_name !== 'all') {
    domain.push(["company_id", "ilike", company_name]);
  }

  try {
    // 2. Récupération des dépenses (Flat)
    const expenses = await odooClient.searchRead('hr.expense', {
        domain,
        fields: [
            'id', 'name', 'total_amount', 'date', 'description', 
            'payment_mode', 'company_id', 'account_id', 'product_id',
        ]
    }) as any[];

    if (expenses.length === 0) {
        return { success: true, records: [] };
    }

    // 3. Récupération des Comptes (Pour avoir x_studio_categorie_compte)
    // On extrait les IDs de compte uniques
    const accountIds = expenses
        .map(e => e.account_id ? e.account_id[0] : null)
        .filter((id, index, self) => id && self.indexOf(id) === index);

    let accountsMap = new Map();
    
    if (accountIds.length > 0) {
        const accounts = await odooClient.searchRead('account.account', {
            domain: [['id', 'in', accountIds]],
            fields: ['id', 'name', 'code', 'x_studio_categorie_compte']
        }) as any[];
        
        accounts.forEach((a: any) => accountsMap.set(a.id, a));
    }

    // 4. Construction des objets Expense enrichis
    const formattedExpenses = expenses.map(e => {
        const accountData = e.account_id ? accountsMap.get(e.account_id[0]) : null;
        
        // Logique intelligente pour déterminer si c'est "Epargne" ou "Caisse"
        // Ton UI regarde : expense.journal_id[1].includes('épargne')
        // On va simuler ce journal_id basé sur la catégorie de compte pour que le tri se fasse bien
        
        let fakeJournalName = "Journal Caisse";
        const catCompte = accountData?.x_studio_categorie_compte?.toLowerCase() || "";
        
        // Si la catégorie contient 'epargne' ou 'épargne', on force le nom du journal
        if (catCompte.includes('epargne') || catCompte.includes('épargne') || e.payment_mode === 'company_account') {
            fakeJournalName = "Journal Épargne";
        }

        return {
            id: e.id,
            name: e.name,
            total_amount: e.total_amount,
            create_date: e.date, // Attention format date
            company_id: e.company_id,
            description: e.description,
            payment_mode: e.payment_mode,
            product_id: e.product_id,
            account_id: e.account_id || [0, ''],
            // On reconstruit l'objet account complet
            account: accountData ? {
                id: accountData.id,
                name: accountData.name,
                code: accountData.code,
                x_studio_categorie_compte: accountData.x_studio_categorie_compte
            } : null,
            // On simule le journal_id pour ton UI
            journal_id: [99, fakeJournalName]
        };
    });

    // 5. Création d'une "Feuille Virtuelle" (Virtual Sheet)
    // Ton UI attend un tableau de ExpenseSheet. On met tout dans une seule feuille du jour.
    const virtualSheet = {
        id: 0, // ID fictif
        name: `Dépenses consolidées du ${format(date, 'dd/MM/yyyy')}`,
        state: 'approve',
        total_amount: formattedExpenses.reduce((sum, e) => sum + e.total_amount, 0),
        company_id: [1, company_name || 'Company'], // Placeholder
        expense_line_ids: formattedExpenses.map(e => e.id),
        expenses: formattedExpenses// C'est ici que sont les données importantes
    };

    // On renvoie un tableau contenant cette unique feuille
    return { success: true, records: [virtualSheet] };

  } catch (error) {
    console.error("❌ Erreur Dépenses Report:", error);
    return { success: false, records: [] };
  }
}

// Alias nécessaire car tu l'utilises sous ce nom dans la page aussi
export const getDailyExpenses = getDailyExpensesReport;