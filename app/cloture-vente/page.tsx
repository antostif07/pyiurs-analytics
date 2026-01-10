import { POSConfig, POSOrder, POSPayment } from "../types/pos"
import { clotureService } from "@/lib/cloture-service"
import { getServerAuth } from "@/lib/supabase/server"
import { filterShopsByUserAccess, getDailyExpenses, getDailyExpensesReport, getDailySalesLines, getExchangeRate, getPOSConfig } from "./actions"
import { Expense, ExpenseSheet } from "../types/cloture"
import ClotureVentesClient from "./cloture-ventes.client"

interface PageProps {
  searchParams: Promise<{
    date?: string
    shop?: string
  }>
}

export default async function ClotureVentesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedDate = params.date ? new Date(params.date) : new Date();
  
  const { user, profile } = await getServerAuth();

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Accès non autorisé
          </h1>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à la clôture des ventes.
          </p>
        </div>
      </div>
    );
  }

  let selectedShop = params.shop || 'all';
  let userName = 'Utilisateur';
  let isUserRestricted = true;
  let company_name = 'all';
  let lastClosure = null;

  // Déterminer le nom de la compagnie selon le shop
  switch (selectedShop) {
    case "1": company_name = "PB - 24"; break;
    case "13": company_name = "PB - LMB"; break;
    case "14": company_name = "PB - KTM"; break;
    case "15": company_name = "PB - MTO"; break;
    case "17": company_name = "PB - BC"; break;
    default: company_name = 'all';
  }

  // Récupérer les données
  const [salesData, exchangeRate, allShopsData, expe] = await Promise.all([
    getDailySalesLines(selectedDate, selectedShop), // Notre nouvelle fonction
    getExchangeRate(),
    getPOSConfig(),
    getDailyExpensesReport(selectedDate, company_name)
  ]);

  const allShops = allShopsData.records as POSConfig[];
  
  // Filtrer les shops selon les permissions
  const availableShops = filterShopsByUserAccess(allShops, profile);
  
  // // Vérifier si l'utilisateur a accès
  const hasAccess = availableShops.length > 0 || profile?.role === 'admin';

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

  if (selectedShop !== 'all') {
    lastClosure = await clotureService.getLastClosureByShop(parseInt(selectedShop));
  }
  
  const expensesTotal = expe.records.reduce((sum: number, sheet) => 
    sum + (sheet.total_amount || 0), 0
  );

  // 2. Cash Attendu
  const expectedCash = salesData.totals.daily - expensesTotal;
  
  // // Calculs des totaux
  // const cashSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
  //   const cashPayments = order.payments ? order.payments.filter((payment: POSPayment) => 
  //     payment.payment_method_id[1].toLowerCase().includes('esp')
  //   ) : [];
  //   return sum + cashPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
  // }, 0);

  // const bankSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
  //   const bankPayments = order.payments ? order.payments.filter((payment: POSPayment) => 
  //     payment.payment_method_id[1].toLowerCase().includes('ban')
  //   ) : [];
  //   return sum + bankPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
  // }, 0);

  // const onlSalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
  //   const onlPayments = order.payments ? order.payments.filter((payment: POSPayment) => 
  //     payment.payment_method_id[1].toLowerCase().includes('onl')
  //   ) : [];
  //   return sum + onlPayments.reduce((pSum: number, p: POSPayment) => pSum + (p.amount || 0), 0);
  // }, 0);

  // const mobileMoneySalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => {
  //   if (!order.payments) return sum;
  //   const keyWords = ['mobile','money', 'pesa', 'airtel', 'orange'];
  //   const filteredPayments = order.payments.filter((payment: POSPayment) => {
  //     const name = payment.payment_method_id?.[1]?.toLowerCase() || '';
  //     return keyWords.some(keyword => name.includes(keyword));
  //   });
  //   return sum + filteredPayments.reduce((pSum, p) => pSum + (p.amount || 0), 0);
  // }, 0);

  // const dailySalesTotal = salesData.records.reduce((sum: number, orderLine: POSOrder) => 
  //   sum + (orderLine.amount_total || 0), 0
  // );

  // const expensesTotal = expensesData.records.reduce((sum: number, expense: Expense) => 
  //   sum + (expense.total_amount || 0), 0
  // );

  // const expectedCash = dailySalesTotal - expensesTotal;
  
  const initialData = {
    date: selectedDate,
    exchangeRate,
    
    // Totaux Financiers (Directement de la fonction optimisée)
    dailySalesTotal: salesData.totals.daily,
    cashSalesTotal: salesData.totals.cash,
    bankSalesTotal: salesData.totals.bank,
    mobileMoneySalesTotal: salesData.totals.mobile,
    onlSalesTotal: salesData.totals.onl,
    
    // Compteurs de transactions (Ajoutés pour PaymentCards)
    counts: salesData.counts, 

    expensesTotal,
    expectedCash,
    
    // Listes pour l'UI
    sales: salesData.records,
    expenses: expe.records,
    shops: availableShops,
    
    // Stats Segments (Directement de la fonction optimisée)
    totalFemme: salesData.stats.femme,
    totalEnfant: salesData.stats.enfants,
    totalBeauty: salesData.stats.beauty
  };

  // const showShopSelector = !isUserRestricted || profile.assigned_shops.length > 1 || profile.shop_access_type === 'all';
  
  
  return (
    <ClotureVentesClient 
      initialData={initialData}
      searchParams={params} 
      shopLastClosure={lastClosure} 
      userShops={profile.assigned_shops}
      isUserRestricted={isUserRestricted}
      showShopSelector={true}
      userRole={profile.role}
      userName={userName}
    />
  );
}