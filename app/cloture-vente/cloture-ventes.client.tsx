'use client'

import { useState, useMemo, useCallback } from 'react'
import { DollarSign, FileText, Save, Plus, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
// import { supabase, CashClosure, CashDenomination } from '@/lib/supabase'
import { POSConfig, POSOrder, POSOrderLine } from '../types/pos'
import { format } from 'date-fns'
import { CashClosure, Expense } from '../types/cloture'
import { supabase } from '@/lib/supabase'
import ClotureVenteHeader from '@/components/cloture-vente/header'
import { usePathname, useRouter } from 'next/navigation'
import PaymentCards from '@/components/cloture-vente/payment-cards'
import DetailsAndAccounting from '@/components/cloture-vente/details-and-accounting'
import { CDF_DENOMINATIONS, Denomination, USD_DENOMINATIONS } from '@/lib/constants'

export type CloturePageDataType = {
  date: Date
  dailySalesTotal: number
  cashSalesTotal: number
  bankSalesTotal: number
  mobileMoneySalesTotal: number
  onlSalesTotal: number
  expensesTotal: number
  expectedCash: number
  exchangeRate: number
  sales: POSOrder[]
  salesLines: POSOrderLine[]
  expenses: Expense[]
  shops: POSConfig[]
}

interface ClotureVentesClientProps {
  initialData: CloturePageDataType
  searchParams: {
    shop?: string
  }
}

export default function ClotureVentesClient({ initialData, searchParams }: ClotureVentesClientProps) {
  const [selectedShop, setSelectedShop] = useState(searchParams.shop || 'all')
  const pathname = usePathname();
  const router = useRouter();
  const [denominations, setDenominations] = useState<Denomination[]>([
    ...USD_DENOMINATIONS,
    ...CDF_DENOMINATIONS
  ])
  const [exchangeRate, setExchangeRate] = useState(initialData.exchangeRate)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedClosure, setSavedClosure] = useState<CashClosure | null>(null)

  // Calculs dérivés
  const calculations = useMemo(() => {
    const physicalCashUSD = denominations
      .filter(d => d.currency === 'USD')
      .reduce((sum, d) => sum + (d.value * d.quantity), 0)

    const physicalCashCDF = denominations
      .filter(d => d.currency === 'CDF')
      .reduce((sum, d) => sum + (d.value * d.quantity), 0)

    const calculatedCash = physicalCashUSD + (physicalCashCDF / exchangeRate)
    const difference = calculatedCash - initialData.expectedCash

    return {
      physicalCashUSD,
      physicalCashCDF,
      calculatedCash,
      difference
    }
  }, [denominations, exchangeRate, initialData.expectedCash])

  const updateDenomination = (index: number, quantity: number) => {
    const newDenominations = [...denominations]
    newDenominations[index].quantity = Math.max(0, quantity)
    setDenominations(newDenominations)
  }

  const incrementDenomination = (index: number) => {
    updateDenomination(index, denominations[index].quantity + 1)
  }

  const decrementDenomination = (index: number) => {
    updateDenomination(index, denominations[index].quantity - 1)
  }

  const handleSaveClosure = async () => {
    setIsSubmitting(true)
    try {
      // Sauvegarder la clôture principale
      const { data: closure, error: closureError } = await supabase
        .from('cash_closures')
        .insert({
          closure_date: format(initialData.date, 'yyyy-MM-dd'),
          daily_sales_total: initialData.dailySalesTotal,
          expenses_total: initialData.expensesTotal,
          expected_cash: initialData.expectedCash,
          physical_cash_usd: calculations.physicalCashUSD,
          physical_cash_cdf: calculations.physicalCashCDF,
          exchange_rate: exchangeRate,
          calculated_cash: calculations.calculatedCash,
          difference: calculations.difference,
          notes: notes
        })
        .select()
        .single()

      if (closureError) throw closureError

      // Sauvegarder les détails de billeterie
      const denominationRecords = denominations
        .filter(d => d.quantity > 0)
        .map(d => ({
          cash_closure_id: closure.id,
          currency: d.currency,
          denomination: d.value,
          quantity: d.quantity,
          amount: d.value * d.quantity
        }))

      if (denominationRecords.length > 0) {
        const { error: denominationsError } = await supabase
          .from('cash_denominations')
          .insert(denominationRecords)

        if (denominationsError) throw denominationsError
      }

      setSavedClosure(closure)
      alert('Clôture sauvegardée avec succès!')
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShopChange = useCallback((shop: string) => {
    setSelectedShop(shop)
    
    const params = new URLSearchParams()
    if (shop !== 'all') {
      params.set('shop', shop)
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    
    router.replace(newUrl, { scroll: false })
  }, [router])

  const getDifferenceColor = (difference: number) => {
    if (Math.abs(difference) < 0.01) return 'text-green-600'
    if (difference > 0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getDifferenceBadge = (difference: number) => {
    if (Math.abs(difference) < 0.01) return <Badge variant="default">Parfait</Badge>
    if (difference > 0) return <Badge variant="secondary">Excédent</Badge>
    return <Badge variant="destructive">Manquant</Badge>
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <ClotureVenteHeader
        selectedShop={selectedShop}
        handleShopChange={handleShopChange}
        exchangeRate={initialData.exchangeRate}
        shops={initialData.shops}
      />
      <PaymentCards
        totalEspeces={initialData.cashSalesTotal}
        totalBanque={initialData.bankSalesTotal}
        totalMobileMoney={initialData.mobileMoneySalesTotal} totalCarte={initialData.onlSalesTotal} transactionsBanque={0} transactionsMobileMoney={0} transactionsCarte={0}        
      />

      <DetailsAndAccounting
        denominations={denominations}
        decrementDenomination={decrementDenomination}
        incrementDenomination={incrementDenomination}
        initialData={initialData}
      />

      {/* Contenu principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Résumé et billeterie */}
          <div className="space-y-6">

            {/* Billeterie USD */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Billeterie USD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {denominations.filter(d => d.currency === 'USD').map((denomination, index) => (
                    <div key={denomination.value} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="font-medium">{denomination.label}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => decrementDenomination(index)}
                          disabled={denomination.quantity === 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-bold">{denomination.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => incrementDenomination(index)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <span className="w-20 text-right font-mono">
                          {(denomination.value * denomination.quantity).toLocaleString('fr-FR')} $
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card> */}

            {/* Billeterie CDF */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Billeterie CDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {denominations.filter(d => d.currency === 'CDF').map((denomination) => {
                    const globalIndex = denominations.findIndex(d => 
                      d.currency === 'CDF' && d.value === denomination.value
                    )
                    return (
                      <div key={denomination.value} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{denomination.label}</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => decrementDenomination(globalIndex)}
                            disabled={denomination.quantity === 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-12 text-center font-bold">{denomination.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => incrementDenomination(globalIndex)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <span className="w-20 text-right font-mono">
                            {(denomination.value * denomination.quantity).toLocaleString('fr-FR')} CDF
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card> */}
          </div>

          {/* Colonne droite : Calculs et actions */}
          <div className="space-y-6">
            {/* Résultat des calculs */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Résultat de la Clôture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Cash théorique attendu</p>
                    <p className="text-xl font-bold text-blue-600">
                      {initialData.expectedCash.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cash physique calculé</p>
                    <p className="text-xl font-bold text-green-600">
                      {calculations.calculatedCash.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">Différence</p>
                    <div className="flex items-center gap-2">
                      <p className={`text-xl font-bold ${getDifferenceColor(calculations.difference)}`}>
                        {calculations.difference.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                      </p>
                      {getDifferenceBadge(calculations.difference)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card> */}

            {/* Notes et sauvegarde */}
            <Card>
              <CardHeader>
                <CardTitle>Notes & Sauvegarde</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Observations</label>
                  {/* <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes sur la clôture..."
                    className="mt-1"
                    rows={3}
                  /> */}
                </div>
                
                {/* <Button
                  onClick={handleSaveClosure}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder la Clôture'}
                </Button> */}

                {savedClosure && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">
                      ✅ Clôture sauvegardée le {format(new Date(savedClosure.created_at), 'dd/MM/yyyy à HH:mm')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Détail des ventes */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Détail des Ventes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {initialData.sales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="font-medium">Commande #{sale.id}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(sale.create_date), 'HH:mm')}
                        </p>
                      </div>
                      <p className="font-bold">
                        {(sale.amount_total || 0).toLocaleString('fr-FR')} $
                      </p>
                    </div>
                  ))}
                  {initialData.sales.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      + {initialData.sales.length - 5} autres ventes
                    </p>
                  )}
                </div>
              </CardContent>
            </Card> */}

            {/* Dépenses */}
            {/* <Card>
              <CardHeader>
                <CardTitle>Dépenses du Jour</CardTitle>
              </CardHeader>
              <CardContent>
                {initialData.expenses.length > 0 ? (
                  <div className="space-y-2">
                    {initialData.expenses.map((expense) => (
                      <div key={expense.id} className="flex justify-between items-center p-2 border rounded">
                        <p className="text-sm">{expense.description || 'Dépense'}</p>
                        <p className="font-bold text-red-600">
                          {(expense.amount || 0).toLocaleString('fr-FR')} $
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">Aucune dépense enregistrée</p>
                )}
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
    </main>
  )
}