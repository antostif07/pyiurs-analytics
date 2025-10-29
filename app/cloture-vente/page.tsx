import { endOfDay, format, startOfDay } from "date-fns"
import { POSConfig, POSOrder, POSPayment } from "../types/pos"
import ClotureVentesClient from "./cloture-ventes.client"
import { AccountAccount, Expense } from "../types/cloture"
import { clotureService } from "@/lib/cloture-service"

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
  
  // Ajouter le filtre shop si spécifié
  if (shop && shop !== 'all') {
    domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["config_id.id", "=", "${shop}"]]`
  }
  
  // 1️⃣ Récupérer les ventes du jour
  const ordersRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,name,amount_total,create_date,config_id,payment_ids&domain=${encodeURIComponent(domain)}`,
    { cache: 'no-store' }
  );

  if (!ordersRes.ok) throw new Error("Erreur API Odoo - Ventes du jour")
  const ordersData = await ordersRes.json();
  if (!ordersData.success) throw new Error(ordersData.error || "Erreur Odoo (pos.order)");

  const orders = ordersData.records as POSOrder[];
  const allPaymentIds = orders.flatMap((o: POSOrder) => o.payment_ids || []);

  // Si aucune vente n’a de paiements
  if (allPaymentIds.length === 0) {
    return { success: true, records: orders.map((o: POSOrder) => ({ ...o, payments: [] })) };
  }

  // 2️⃣ Récupérer tous les paiements liés
  const paymentsDomain = `[["id", "in", [${allPaymentIds.join(",")}]]]`;

  const paymentsRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.payment?fields=id,amount,payment_method_id,pos_order_id&domain=${encodeURIComponent(paymentsDomain)}`,
    { next: { revalidate: 300 } }
  );

  if (!paymentsRes.ok) throw new Error("Erreur API Odoo - Récupération des paiements");

  const paymentsData = await paymentsRes.json();
  if (!paymentsData.success) throw new Error(paymentsData.error || "Erreur Odoo (pos.payment)");

  const payments = paymentsData.records;

  // 3️⃣ Enrichir les ventes avec leurs paiements
  const enrichedOrders = orders.map((order: POSOrder) => ({
    ...order,
    payments: payments.filter((p: POSPayment) => p.pos_order_id?.[0] === order.id),
  }));

  return { success: true, records: enrichedOrders };
}

// Récupérer les lignes de vente pour le détail
async function getDailySalesLines(date: Date, shop?: string) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
  if (shop && shop !== 'all') {
    domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["order_id.config_id.name", "=", "${shop}"]]`
  }
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,price_unit,product_id,order_id&domain=${encodeURIComponent(domain)}`,
    { 
      next: { revalidate: 300 }
    }
  )

  if (!res.ok) throw new Error("Erreur API Odoo - Lignes de vente")
  return res.json()
}

// Récupérer les dépenses du jour
async function getDailyExpenses(date: Date, company_name?: string) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  // Adaptez cette requête selon votre modèle de données des dépenses
  let domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
  if (company_name && company_name !== 'all') {
    domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"], ["company_id", "ilike", "${company_name}"]]`
  }
  
  const expenseRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/hr.expense?fields=id,total_amount,name,create_date,product_id,company_id,account_id&domain=${encodeURIComponent(domain)}`,
    { 
      cache: 'no-store'
    }
  )

  if (!expenseRes.ok) throw new Error("Erreur API Odoo - Recuperation des dépenses")
  const expenseData = await expenseRes.json();
  if (!expenseData.success) throw new Error(expenseData.error || "Erreur Odoo (he.expense)");

  const expenses = expenseData.records as Expense[];
  const allAccountIds = expenses.flatMap((e: Expense) => e.account_id?.[0] || []);

  // 2️⃣ Récupérer tous les comptes liés
  const accountsDomain = `[["id", "in", [${allAccountIds.join(",")}]]]`;


  const accountRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/account.account?fields=id,x_studio_categorie_compte,name,code&domain=${encodeURIComponent(accountsDomain)}`,
    { next: { revalidate: 300 } }
  );

  if (!accountRes.ok) throw new Error("Erreur API Odoo - Récupération des paiements");

  const accountsData = await accountRes.json();
  if (!accountsData.success) throw new Error(accountsData.error || "Erreur Odoo (account.account)");

  const accounts = accountsData.records;
  
  // 3️⃣ Enrichir les ventes avec leurs paiements
  const enrichedOrders = expenses.map((expense: Expense) => ({
    ...expense,
    account: accounts.find((a: AccountAccount) => a.id === expense.account_id?.[0]) || null,
  }));

  return { success: true, records: enrichedOrders };
}

// Récupérer le taux de change actuel
async function getExchangeRate(): Promise<number> {
  // Ici vous pouvez intégrer avec une API de taux de change
  // Pour l'exemple, on utilise un taux fixe
  return 2450.00 // 1 USD = 2450.00 CDF
}

// Récupérer la liste des shops disponibles
async function getPOSConfig() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.config?fields=id,name&domain=[["id", "not in", [19]]]`,
    { 
      next: { 
        revalidate: 300 // 5 minutes
      } 
    }
  );

  if (!res.ok) {
    throw new Error("Erreur API Odoo - Ventes POS");
  }

  return res.json();
}

export default async function ClotureVentesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedDate = params.date ? new Date(params.date) : new Date()
  const selectedShop = params.shop || 'all'
  let company_name = 'all';
  let startDate: Date
  let endDate: Date
  let lastClosure = null

  // 🔍 Récupérer la dernière clôture du shop
  if (selectedShop !== 'all') {
    lastClosure = await clotureService.getLastClosureByShop(parseInt(selectedShop))

    if (lastClosure) {
      // Si une clôture existe → on part de sa closing_date jusqu’à la date sélectionnée
      startDate = new Date(lastClosure.closing_date)
      endDate = selectedDate > startDate ? selectedDate : startDate
    } else {
      // Sinon → on prend juste la journée sélectionnée
      startDate = startOfDay(selectedDate)
      endDate = endOfDay(selectedDate)
    }
  } else {
    // Si aucun shop sélectionné → on prend la journée actuelle
    startDate = startOfDay(selectedDate)
    endDate = endOfDay(selectedDate)
  }

  const [salesData, salesLinesData, exchangeRate, shops] = await Promise.all([
    getDailySales(selectedDate, selectedShop),
    getDailySalesLines(selectedDate, selectedShop),
    getExchangeRate(),
    getPOSConfig(),
  ])

  switch (selectedShop) {
    case "1": company_name = "PB - 24"; break;
    case "13": company_name = "PB - LMB"; break;
    case "14": company_name = "PB - KTM"; break;
    case "15": company_name = "PB - MTO"; break;
    case "17": company_name = "PB - BC"; break;
    default: company_name = 'all'
  }
  const expensesData = await getDailyExpenses(selectedDate, company_name)
  
  // Total des ventes especes
  const cashSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    const cashPayments = order.payments ? order.payments.filter((payment: POSPayment) => payment.payment_method_id[1].toLowerCase().includes('esp')) : [];
    const cashTotal = cashPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
    return sum + cashTotal;
  }, 0);

  const bankSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    const bankPayments = order.payments ? order.payments.filter((payment: POSPayment) => payment.payment_method_id[1].toLowerCase().includes('ban')) : [];
    const bankTotal = bankPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
    return sum + bankTotal;
  }, 0);

  const onlSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    const onlPayments = order.payments ? order.payments.filter((payment: POSPayment) => payment.payment_method_id[1].toLowerCase().includes('onl')) : [];
    const onlTotal = onlPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
    return sum + onlTotal;
  }, 0);

  const mobileMoneySalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
    if (!order.payments) return sum;

    const keyWords = ['mobile', 'money', 'pesa', 'airtel', 'orange'];

    const filteredPayments = order.payments.filter((payment: POSPayment) => {
      const name = payment.payment_method_id?.[1]?.toLowerCase() || '';
      return keyWords.some(keyword => name.includes(keyword));
    });

    const total = filteredPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
    return sum + total;
  }, 0);

  // Calculer le total des ventes
  const dailySalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => 
    sum + (order.amount_total || 0), 0
  )

  // Calculer le total des dépenses
  const expensesTotal = expensesData.records.reduce((sum: number, expense: Expense) => 
    sum + (expense.total_amount || 0), 0
  )

  // Calculer l'argent théorique en caisse
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
    salesLines: salesLinesData.records,
    expenses: expensesData.records,
    shops: shops.records as POSConfig[]
  }

  return (
    <ClotureVentesClient initialData={initialData} searchParams={params} shopLastClosure={lastClosure} />
  )
}