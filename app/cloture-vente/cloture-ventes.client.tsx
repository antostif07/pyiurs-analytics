'use client'

import { useState, useMemo } from 'react'
import Link from "next/link"
import { Calculator, DollarSign, TrendingUp, FileText, Save, Calendar, Plus, Minus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { supabase, CashClosure, CashDenomination } from '@/lib/supabase'
import { POSOrder, POSOrderLine } from '../types/pos'
import { format } from 'date-fns'
import { CashClosure, Expense } from '../types/cloture'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface ClotureVentesClientProps {
  initialData: {
    date: Date
    dailySalesTotal: number
    expensesTotal: number
    expectedCash: number
    exchangeRate: number
    sales: POSOrder[]
    salesLines: POSOrderLine[]
    expenses: Expense[]
    // recentClosures: CashClosure[]
  }
}

interface Denomination {
  currency: 'USD' | 'CDF'
  value: number
  label: string
  quantity: number
}

const USD_DENOMINATIONS: Denomination[] = [
  { currency: 'USD', value: 100, label: '100 USD', quantity: 0 },
  { currency: 'USD', value: 50, label: '50 USD', quantity: 0 },
  { currency: 'USD', value: 20, label: '20 USD', quantity: 0 },
  { currency: 'USD', value: 10, label: '10 USD', quantity: 0 },
  { currency: 'USD', value: 5, label: '5 USD', quantity: 0 },
  { currency: 'USD', value: 1, label: '1 USD', quantity: 0 },
]

const CDF_DENOMINATIONS: Denomination[] = [
  { currency: 'CDF', value: 20000, label: '20,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 10000, label: '10,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 5000, label: '5,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 1000, label: '1,000 CDF', quantity: 0 },
  { currency: 'CDF', value: 500, label: '500 CDF', quantity: 0 },
  { currency: 'CDF', value: 100, label: '100 CDF', quantity: 0 },
]

export default function ClotureVentesClient({ initialData }: ClotureVentesClientProps) {
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
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                ← Retour
              </Link>

              <div className="flex items-center space-x-3">
                <Calculator className="w-8 h-8 text-green-500" />
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    Clôture des Ventes
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">
                    {format(initialData.date, 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Stats principales */}
            <div className="flex gap-3 mt-4 lg:mt-0">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {initialData.dailySalesTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ventes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {initialData.expensesTotal.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dépenses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {initialData.expectedCash.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}$
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Théorique</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Résumé et billeterie */}
          <div className="space-y-6">
            {/* Cartes de résumé */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <DollarSign className="w-8 h-8 mb-2 opacity-90" />
                  <p className="text-sm opacity-90">Cash USD Physique</p>
                  <p className="text-2xl font-bold">
                    {calculations.physicalCashUSD.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-90" />
                  <p className="text-sm opacity-90">Cash CDF Physique</p>
                  <p className="text-2xl font-bold">
                    {calculations.physicalCashCDF.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} CDF
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Taux de change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Taux de change
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium">1 USD = CDF</label>
                    {/* <Input
                      type="number"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value))}
                      className="mt-1"
                    /> */}
                  </div>
                  <div className="text-sm text-gray-500 mt-6">
                    ≈ {calculations.physicalCashCDF.toLocaleString('fr-FR')} CDF
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billeterie USD */}
            <Card>
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
            </Card>

            {/* Billeterie CDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Billeterie CDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {denominations.filter(d => d.currency === 'CDF').map((denomination, index) => {
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
            </Card>
          </div>

          {/* Colonne droite : Calculs et actions */}
          <div className="space-y-6">
            {/* Résultat des calculs */}
            <Card>
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
            </Card>

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
                
                <Button
                  onClick={handleSaveClosure}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder la Clôture'}
                </Button>

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
            <Card>
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
            </Card>

            {/* Dépenses */}
            <Card>
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
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}