import { endOfDay, format, startOfDay } from "date-fns"
import { POSOrder, POSOrderLine } from "../types/pos"
import ClotureVentesClient from "./cloture-ventes.client"
import { Expense } from "../types/cloture"

interface PageProps {
  searchParams: Promise<{
    date?: string
  }>
}

// Récupérer les ventes du jour
async function getDailySales(date: Date) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  const domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order?fields=id,amount_total,create_date&domain=${encodeURIComponent(domain)}`,
    { 
      next: { revalidate: 300 }
    }
  )

  if (!res.ok) throw new Error("Erreur API Odoo - Ventes du jour")
  return res.json()
}

// Récupérer les lignes de vente pour le détail
async function getDailySalesLines(date: Date) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  const domain = `[["create_date", ">=", "${startDate}"], ["create_date", "<=", "${endDate}"]]`
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/pos.order.line?fields=id,qty,price_unit,product_id,order_id&domain=${encodeURIComponent(domain)}`,
    { 
      next: { revalidate: 300 }
    }
  )

  if (!res.ok) throw new Error("Erreur API Odoo - Lignes de vente")
  return res.json()
}

// Récupérer les dépenses du jour (à adapter selon votre structure)
async function getDailyExpenses(date: Date) {
  const startDate = format(startOfDay(date), "yyyy-MM-dd HH:mm:ss")
  const endDate = format(endOfDay(date), "yyyy-MM-dd HH:mm:ss")
  
  // Adaptez cette requête selon votre modèle de données des dépenses
  const domain = `[["date", ">=", "${startDate}"], ["date", "<=", "${endDate}"]]`
  
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/odoo/expense.model?fields=id,amount,description&domain=${encodeURIComponent(domain)}`,
    { 
      next: { revalidate: 300 }
    }
  )

  if (!res.ok) {
    console.log("Aucun modèle de dépense trouvé, utilisation des données mockées")
    // Retourner des données mockées pour l'exemple
    return { records: [] }
  }
  
  return res.json()
}

// Récupérer le taux de change actuel
async function getExchangeRate(): Promise<number> {
  // Ici vous pouvez intégrer avec une API de taux de change
  // Pour l'exemple, on utilise un taux fixe
  return 2500 // 1 USD = 2500 CDF
}

export default async function ClotureVentesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedDate = params.date ? new Date(params.date) : new Date()

  const [salesData, salesLinesData, expensesData, exchangeRate] = await Promise.all([
    getDailySales(selectedDate),
    getDailySalesLines(selectedDate),
    getDailyExpenses(selectedDate),
    getExchangeRate()
  ])

  // Calculer le total des ventes
  const dailySalesTotal = salesData.records.reduce((sum: number, order: POSOrder) => 
    sum + (order.amount_total || 0), 0
  )

  // Calculer le total des dépenses
  const expensesTotal = expensesData.records.reduce((sum: number, expense: Expense) => 
    sum + (expense.amount || 0), 0
  )

  // Calculer l'argent théorique en caisse
  const expectedCash = dailySalesTotal - expensesTotal

  // Récupérer les dernières clôtures (optionnel)
//   const recentClosures = any[]; // À implémenter avec Supabase

  const initialData = {
    date: selectedDate,
    dailySalesTotal,
    expensesTotal,
    expectedCash,
    exchangeRate,
    sales: salesData.records,
    salesLines: salesLinesData.records,
    expenses: expensesData.records,
    // recentClosures
  }

  return (
    <ClotureVentesClient initialData={initialData} />
  )
}