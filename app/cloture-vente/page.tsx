// app/cloture-ventes/page.tsx
import { endOfDay, format, startOfDay } from "date-fns"
import { POSConfig, POSOrder, POSPayment } from "../types/pos"
import ClotureVentesClient from "./cloture-ventes.client"
import { AccountAccount, Expense } from "../types/cloture"
import { clotureService } from "@/lib/cloture-service"
import { createClient } from "@/lib/supabase/server"

interface PageProps {
  searchParams: Promise<{
    date?: string
    shop?: string
  }>
}

// Récupérer les ventes du jour avec filtre shop
async function getDailySales(date: Date, shop?: string) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["config_id", "not in", [19]]]`
  
  if (shop && shop !== 'all') {
    domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["config_id.id", "=", "${shop}"]]`
  }
  
  const ordersRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,name,amount_total,create_date,config_id,payment_ids&domain=${encodeURIComponent(domain)}`,
    { cache: 'no-store' }
  );

  if (!ordersRes.ok) throw new Error("Erreur API Odoo - Ventes du jour")
  const ordersData = await ordersRes.json();
  if (!ordersData.success) throw new Error(ordersData.error || "Erreur Odoo (pos.order)");

  const orders = ordersData.records as POSOrder[];
  const allPaymentIds = orders.flatMap((o: POSOrder) => o.payment_ids || []);

  if (allPaymentIds.length === 0) {
    return { success: true, records: orders.map((o: POSOrder) => ({ ...o, payments: [] })) };
  }

  const paymentsDomain = `[["id", "in", [${allPaymentIds.join(",")}]]]`;
  const paymentsRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.payment?fields=id,amount,payment_method_id,pos_order_id&domain=${encodeURIComponent(paymentsDomain)}`,
    { next: { revalidate: 300 } }
  );

  if (!paymentsRes.ok) throw new Error("Erreur API Odoo - Récupération des paiements");
  const paymentsData = await paymentsRes.json();
  if (!paymentsData.success) throw new Error(paymentsData.error || "Erreur Odoo (pos.payment)");

  const payments = paymentsData.records;
  const enrichedOrders = orders.map((order: POSOrder) => ({
    ...order,
    payments: payments.filter((p: POSPayment) => p.pos_order_id?.[0] === order.id),
  }));

  return { success: true, records: enrichedOrders };
}

async function getDailyExpensesReport(date: Date, company_name?: string) {
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
      .filter((expense: any) => expense !== undefined)
  }));

  return { success: true, records: sheetWithExpenses };
}

// Récupérer les dépenses du jour
async function getDailyExpenses(date: Date, company_name?: string) {
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
async function getExchangeRate(): Promise<number> {
  return 2450.00
}

// Récupérer la liste des shops disponibles
async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name&domain=[["id", "not in", [19]]]`,
    { 
      next: { 
        revalidate: 300
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Configuration POS");
  }

  return res.json();
}

// Fonction pour filtrer les shops selon les permissions
function filterShopsByUserAccess(allShops: POSConfig[], userShops: string[], userRole: string): POSConfig[] {
  // Les admins voient tout
  if (userRole === 'admin') {
    return allShops;
  }
  
  // Si l'utilisateur a accès à tout
  if (userShops.includes('all')) {
    return allShops;
  }
  
  // Filtrer selon les boutiques assignées
  return allShops.filter(shop => 
    userShops.includes(shop.id.toString())
  );
}

export default async function ClotureVentesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDate = params.date ? new Date(params.date) : new Date();
  
  // Récupérer l'utilisateur connecté via Supabase SSR
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let selectedShop = params.shop || 'all';
  let userShops: string[] = [];
  let userRole = 'user';
  let userName = 'Utilisateur';
  let isUserRestricted = true;
  
  if (user) {
    try {
      // Récupérer le profil utilisateur
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && !error) {
        userRole = profile.role;
        userName = profile.full_name || user.email || 'Utilisateur';
        
        // Déterminer les boutiques accessibles
        if (profile.role === 'admin' || profile.shop_access_type === 'all') {
          userShops = ['all'];
          isUserRestricted = false;
        } else {
          // S'assurer que assigned_shops est un tableau
          userShops = Array.isArray(profile.assigned_shops) 
            ? profile.assigned_shops 
            : (typeof profile.assigned_shops === 'string' 
                ? JSON.parse(profile.assigned_shops) 
                : []);
          isUserRestricted = true;
        }

        // Gestion automatique du shop sélectionné pour les utilisateurs restreints
        if (isUserRestricted) {
          // Si un seul shop est assigné, le sélectionner automatiquement
          if (userShops.length === 1 && userShops[0] !== 'all') {
            selectedShop = userShops[0];
          }
          
          // Vérifier que le shop demandé est autorisé
          if (params.shop && params.shop !== 'all' && !userShops.includes(params.shop)) {
            // Rediriger vers le premier shop autorisé
            if (userShops.length > 0 && userShops[0] !== 'all') {
              selectedShop = userShops[0];
            } else {
              // Aucun shop autorisé - afficher erreur plus tard
              selectedShop = 'none';
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur récupération profil:', error);
    }
  }

  // Récupérer les données
  const [salesData, exchangeRate, allShopsData, expe] = await Promise.all([
    getDailySales(selectedDate, selectedShop),
    getExchangeRate(),
    getPOSConfig(),
    getDailyExpensesReport(selectedDate, selectedShop)
  ]);

  const allShops = allShopsData.records as POSConfig[];
  
  // Filtrer les shops selon les permissions
  const availableShops = filterShopsByUserAccess(allShops, userShops, userRole);
  
  // Vérifier si l'utilisateur a accès
  const hasAccess = availableShops.length > 0 || userRole === 'admin';
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Accès non autorisé
          </h1>
          <p className="text-gray-600">
            Vous n'avez pas accès à la clôture des ventes.
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Contactez l'administrateur pour obtenir les permissions nécessaires.
          </p>
        </div>
      </div>
    );
  }

  let company_name = 'all';
  let lastClosure = null;

  if (selectedShop !== 'all') {
    lastClosure = await clotureService.getLastClosureByShop(parseInt(selectedShop));
  }

  // Déterminer le nom de la compagnie selon le shop
  switch (selectedShop) {
    case "1": company_name = "PB - 24"; break;
    case "13": company_name = "PB - LMB"; break;
    case "14": company_name = "PB - KTM"; break;
    case "15": company_name = "PB - MTO"; break;
    case "17": company_name = "PB - BC"; break;
    default: company_name = 'all';
  }
  
  const expensesData = await getDailyExpenses(selectedDate, company_name);
  
  // Calculs des totaux
  const cashSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    const cashPayments = order.payments ? order.payments.filter((payment: POSPayment) => 
      payment.payment_method_id[1].toLowerCase().includes('esp')
    ) : [];
    return sum + cashPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
  }, 0);

  const bankSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    const bankPayments = order.payments ? order.payments.filter((payment: POSPayment) => 
      payment.payment_method_id[1].toLowerCase().includes('ban')
    ) : [];
    return sum + bankPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
  }, 0);

  const onlSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    const onlPayments = order.payments ? order.payments.filter((payment: POSPayment) => 
      payment.payment_method_id[1].toLowerCase().includes('onl')
    ) : [];
    return sum + onlPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
  }, 0);

  const mobileMoneySalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    if (!order.payments) return sum;
    const keyWords = ['mobile','money', 'pesa', 'airtel', 'orange'];
    const filteredPayments = order.payments.filter((payment: POSPayment) => {
      const name = payment.payment_method_id?.[1]?.toLowerCase() || '';
      return keyWords.some(keyword => name.includes(keyword));
    });
    return sum + filteredPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
  }, 0);

  const dailySalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => 
    sum + (order.amount_total || 0), 0
  );

  const expensesTotal = expensesData.records.reduce((sum: number, expense: Expense) => 
    sum + (expense.total_amount || 0), 0
  );

  const expectedCash = dailySalesTotal - expensesTotal;
  
  const initialData = {
    date: selectedDate,
    dailySalesTotal,
    expensesTotal,
    expectedCash,
    exchangeRate,
    sales: salesData.records,
    cashSalesTotal,
    bankSalesTotal,
    mobileMoneySalesTotal,
    onlSalesTotal,
    expenses: expe.records,
    shops: availableShops
  };

  const showShopSelector = !isUserRestricted || userShops.length > 1 || userShops.includes('all');

  return (
    <ClotureVentesClient 
      initialData={initialData} 
      searchParams={params} 
      shopLastClosure={lastClosure} 
      userShops={userShops}
      isUserRestricted={isUserRestricted}
      showShopSelector={showShopSelector}
      userRole={userRole}
      userName={userName}
    />
  );
}