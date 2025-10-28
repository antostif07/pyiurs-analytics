'use client'

import { useState, useMemo, useCallback } from 'react'
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
import ClotureVenteClose from '@/components/cloture-vente/close'
import { Separator } from '@radix-ui/react-select'

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
  }, [router,pathname])

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
        initialData={initialData}
      />

      <Separator className="my-8 " />

      <ClotureVenteClose
        denominations={denominations}
        incrementDenomination={incrementDenomination}
        decrementDenomination={decrementDenomination}
        initialData={initialData}
        // calculations={calculations}
      />
    </main>
  )
}