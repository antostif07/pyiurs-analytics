import { endOfDay, format, startOfDay } from "date-fns";
import { POSConfig, POSOrder, POSOrderLine, POSPayment } from "../types/pos";
import { AccountAccount, Expense } from "../types/cloture";
import { Profile } from "@/contexts/AuthContext";
import { OdooProductTemplate, ProductProduct } from "../types/product_template";

// Récupérer les ventes du jour avec filtre shop
export async function getDailySalesLines(date: Date, shop?: string) {
    const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss");
    const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss");

    const domainArray: any[] = [
        ["date_order", ">=", startDate],
        ["date_order", "<=", endDate]
    ];

    if (shop && shop !== 'all') {
        domainArray.push(["config_id", "=", parseInt(shop)]);
    } else {
        domainArray.push(["config_id", "not in", [19]]);
    }

    const ordersRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,name,create_date,pos_reference,partner_id,config_id,amount_total,lines,payment_ids&domain=${JSON.stringify(domainArray)}`,
        { cache: 'no-store' }
    );

    if (!ordersRes.ok) throw new Error("Erreur API Odoo - Commandes");
    const ordersData = await ordersRes.json();
    const orders = ordersData.records as POSOrder[];

    const emptyStats = { femme: 0, enfants: 0, beauty: 0 };
    if (orders.length === 0) {
        return { success: true, records: [] };
    }
    const allLineIds = orders.flatMap(o => o.lines || []); 
    const allPaymentIds = orders.flatMap(o => o.payment_ids || []);

    const [linesRes, paymentsRes] = await Promise.all([
        // Fetch Lignes
        fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,price_unit,price_subtotal_incl,product_id,order_id&domain=${JSON.stringify([["id", "in", allLineIds]])}`,
        { cache: 'no-store' }
        ),
        // Fetch Paiements
        fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.payment?fields=id,amount,payment_method_id,pos_order_id&domain=${JSON.stringify([["id", "in", allPaymentIds]])}`,
        { cache: 'no-store' }
        )
    ]);

    if (!linesRes.ok || !paymentsRes.ok) throw new Error("Erreur hydratation lignes/paiements");

    const linesData = await linesRes.json();
    const paymentsData = await paymentsRes.json();

    const rawLines = linesData.records as POSOrderLine[];
    const rawPayments = paymentsData.records;

    const productIds = [...new Set(rawLines.map((l: POSOrderLine) => l.product_id[0]))];

    const productsRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/product.product?fields=id,name,categ_id,default_code&domain=${JSON.stringify([["id", "in", productIds]])}`,
        { next: { revalidate: 3600 } } // Cache 1h
    );

    if (!productsRes.ok) throw new Error("Erreur hydratation produits");
    const productsData = await productsRes.json();

    const productsMap = new Map(productsData.records.map((p: any) => [p.id, p]));
    const linesMap = new Map(rawLines.map((l: any) => [l.id, l]));
    const paymentsMap = new Map(rawPayments.map((p: any) => [p.id, p]));

    let totalFemme = 0;
    let totalEnfants = 0;
    let totalBeauty = 0;

    const enrichedOrders = orders.map((order) => {
        const enrichedLines = (order.lines || []).map((lineId: number) => {
            const line = linesMap.get(lineId);
            if (!line) return null;

            const product = productsMap.get(line.product_id[0]) as ProductProduct;
            if (product && product.categ_id) {
                const categoryName = product.categ_id[1].toLowerCase();
                const amount = line.price_subtotal_incl || 0;

                if (categoryName.includes('femme') || categoryName.includes('commerc')) {
                    totalFemme += amount;
                } else if (categoryName.includes('enf')) {
                    totalEnfants += amount;
                } else if (categoryName.includes('beauty')) {
                    totalBeauty += amount;
                }
            }
            
            return {
                ...line,
                product_details: product ? {
                id: product.id,
                name: product.name,
                categ_id: product.categ_id, // [ID, "Nom Categorie"]
                default_code: product.default_code
                } : null,
                // Helper
                category_name: product?.categ_id ? product.categ_id[1] : "Inconnu"
            };
        }).filter(Boolean);

        const enrichedPayments = (order.payment_ids || []).map((paymentId: number) => {
            return paymentsMap.get(paymentId);
        }).filter(Boolean);

        return {
            ...order,
            lines: enrichedLines,
            payments: enrichedPayments,
            // Helper pour le shop
            shop_name: order.config_id ? order.config_id[1] : "Inconnu"
        };
    });

    return {
        success: true,
        records: enrichedOrders as unknown as POSOrder[],
        stats: {
            femme: totalFemme,
            enfants: totalEnfants,
            beauty: totalBeauty
        }
    };
}

// export async function getDailySales(date: Date, shop?: string) {
//   const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
//   const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
//   let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["config_id", "not in", [19]]]`
  
//   if (shop && shop !== 'all') {
//     domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["config_id.id", "=", "${shop}"]]`
//   }
  
//   const ordersRes = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,name,amount_total,create_date,config_id,payment_ids&domain=${encodeURIComponent(domain)}`,
//     { cache: 'no-store' }
//   );

//   if (!ordersRes.ok) throw new Error("Erreur API Odoo - Ventes du jour")
//   const ordersData = await ordersRes.json();
//   if (!ordersData.success) throw new Error(ordersData.error || "Erreur Odoo (pos.order)");

//   const orders = ordersData.records as POSOrder[];
//   const allPaymentIds = orders.flatMap((o: POSOrder) => o.payment_ids || []);

//   if (allPaymentIds.length === 0) {
//     return { success: true, records: orders.map((o: POSOrder) => ({ ...o, payments: [] })) };
//   }

//   const paymentsDomain = `[["id", "in", [${allPaymentIds.join(",")}]]]`;
//   const paymentsRes = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.payment?fields=id,amount,payment_method_id,pos_order_id&domain=${encodeURIComponent(paymentsDomain)}`,
//     { next: { revalidate: 300 } }
//   );

//   if (!paymentsRes.ok) throw new Error("Erreur API Odoo - Récupération des paiements");
//   const paymentsData = await paymentsRes.json();
//   if (!paymentsData.success) throw new Error(paymentsData.error || "Erreur Odoo (pos.payment)");

//   const payments = paymentsData.records;
//   const enrichedOrders = orders.map((order: POSOrder) => ({
//     ...order,
//     payments: payments.filter((p: POSPayment) => p.pos_order_id?.[0] === order.id),
//   }));

//   return { success: true, records: enrichedOrders };
// }

export async function getDailyExpensesReport(date: Date, company_name?: string) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  const fields = 'id,name,expense_line_ids,state,company_id,product_ids,display_name,total_amount,payment_state,payment_mode,journal_id';
  let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
  if (company_name && company_name !== 'all') {
    domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["company_id", "ilike", "${company_name}"]]`
  }
  
  const expenseRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense.sheet?fields=${fields}&domain=${encodeURIComponent(domain)}`,
    { cache: 'no-store' }
  )

  if (!expenseRes.ok) throw new Error("Erreur API Odoo - Recuperation des dépenses")
  const expenseData = await expenseRes.json();
  if (!expenseData.success) throw new Error(expenseData.error || "Erreur Odoo (he.expense)");

  // Récupérer tous les IDs d'expenses de tous les sheets
  const allExpenseIds = expenseData.records.flatMap((sheet: any) => 
    sheet.expense_line_ids || []
  );

  if (allExpenseIds.length === 0) {
    return { 
      success: true, 
      records: expenseData.records.map((sheet: any) => ({ ...sheet, expenses: [] })) 
    };
  }

  // Récupérer toutes les expenses en un seul appel
  const expenseLinesDomain = `[["id", "in", [${allExpenseIds.join(",")}]]]`;
  const expenseLinesRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense?fields=id,total_amount,name,create_date,product_id,company_id,account_id&domain=${encodeURIComponent(expenseLinesDomain)}`,
    { cache: 'no-store' }
  );

  if (!expenseLinesRes.ok) throw new Error("Erreur API Odoo - Recuperation des lignes de dépenses")
  const expenseLinesData = await expenseLinesRes.json();
  if (!expenseLinesData.success) throw new Error(expenseLinesData.error || "Erreur Odoo (he.expense)");

  // Récupérer tous les comptes en un seul appel
  const accountIds = expenseLinesData.records
    .map((expense: any) => expense.account_id && expense.account_id[0])
    .filter((id: number) => id !== undefined);

  let accountsMap = new Map();
  
  if (accountIds.length > 0) {
    const accountsDomain = `[["id", "in", [${accountIds.join(",")}]]]`;
    const accountsRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/account.account?fields=id,name,code,x_studio_categorie_compte&domain=${encodeURIComponent(accountsDomain)}`,
      { cache: 'no-store' }
    );

    if (accountsRes.ok) {
      const accountsData = await accountsRes.json();
      if (accountsData.success) {
        accountsData.records.forEach((account: any) => {
          accountsMap.set(account.id, account);
        });
      }
    }
  }

  // Créer un map des expenses par ID pour un accès rapide
  const expensesMap = new Map();
  expenseLinesData.records.forEach((expense: any) => {
    const accountData = expense.account_id && expense.account_id[0] 
      ? accountsMap.get(expense.account_id[0])
      : null;
    
    expensesMap.set(expense.id, {
      ...expense,
      account: accountData
    });
  });

  // Associer les expenses enrichies à chaque sheet
  const sheetWithExpenses = expenseData.records.map((sheet: any) => ({
    ...sheet,
    expenses: (sheet.expense_line_ids || [])
      .map((expenseId: number) => expensesMap.get(expenseId))
      .filter((expense: Expense) => expense !== undefined)
  }));

  return { success: true, records: sheetWithExpenses };
}

// Récupérer les dépenses du jour
export async function getDailyExpenses(date: Date, company_name?: string) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
  if (company_name && company_name !== 'all') {
    domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["company_id", "ilike", "${company_name}"]]`
  }
  
  const expenseRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense?fields=id,total_amount,name,create_date,product_id,company_id,account_id&domain=${encodeURIComponent(domain)}`,
    { cache: 'no-store' }
  )

  if (!expenseRes.ok) throw new Error("Erreur API Odoo - Recuperation des dépenses")
  const expenseData = await expenseRes.json();
  if (!expenseData.success) throw new Error(expenseData.error || "Erreur Odoo (he.expense)");

  const expenses = expenseData.records as Expense[];
  const allAccountIds = expenses.flatMap((e: Expense) => e.account_id?.[0] || []);

  if (allAccountIds.length === 0) {
    return { success: true, records: expenses };
  }

  const accountsDomain = `[["id", "in", [${allAccountIds.join(",")}]]]`;
  const accountRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/account.account?fields=id,x_studio_categorie_compte,name,code&domain=${encodeURIComponent(accountsDomain)}`,
    { next: { revalidate: 300 } }
  );

  if (!accountRes.ok) throw new Error("Erreur API Odoo - Récupération des comptes");
  const accountsData = await accountRes.json();
  if (!accountsData.success) throw new Error(accountsData.error || "Erreur Odoo (account.account)");

  const accounts = accountsData.records;
  const enrichedExpenses = expenses.map((expense: Expense) => ({
    ...expense,
    account: accounts.find((a: AccountAccount) => a.id === expense.account_id?.[0]) || null,
  }));

  return { success: true, records: enrichedExpenses };
}

// Récupérer le taux de change actuel
export async function getExchangeRate(): Promise<number> {
  return 2450.00
}

// Récupérer la liste des shops disponibles
export async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name&domain=[["id", "not in", [19]]]`,
    { 
      next: { 
        revalidate: 1000
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Configuration POS");
  }

  return res.json();
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