'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

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
    date?: string
  }
}

export default function ClotureVentesClient({ initialData, searchParams }: ClotureVentesClientProps) {
  const [selectedShop, setSelectedShop] = useState(searchParams.shop || 'all')
  const [selectedDate, setSelectedDate] = useState(initialData.date)
  const [isClotureExist, setIsClotureExist] = useState(false)
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

  // Vérifier si une clôture existe déjà
  useEffect(() => {
    const checkExistingClosure = async () => {
      if (selectedShop && selectedShop !== 'all') {
        try {
          const { data, error } = await supabase
            .from('cash_closures')
            .select('id')
            .eq('closure_date', format(selectedDate, 'yyyy-MM-dd'))
            .eq('shop_id', parseInt(selectedShop))
            .single()

          setIsClotureExist(!!data && !error)
        } catch (error) {
          setIsClotureExist(false)
        }
      }
    }

    checkExistingClosure()
  }, [selectedDate, selectedShop])

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

  const handleShopChange = useCallback((shop: string) => {
    setSelectedShop(shop)
    
    const params = new URLSearchParams()
    if (shop !== 'all') {
      params.set('shop', shop)
    }
    if (selectedDate) {
      params.set('date', format(selectedDate, 'yyyy-MM-dd'))
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    
    router.replace(newUrl, { scroll: false })
  }, [router, pathname, selectedDate])

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
    
    const params = new URLSearchParams()
    if (selectedShop !== 'all') {
      params.set('shop', selectedShop)
    }
    params.set('date', format(date, 'yyyy-MM-dd'))
    
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    
    router.replace(newUrl, { scroll: false })
  }, [router, pathname, selectedShop])

  const canCreateClosure = selectedShop && selectedShop !== 'all' && !isClotureExist

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <ClotureVenteHeader
        selectedShop={selectedShop}
        selectedDate={selectedDate}
        handleShopChange={handleShopChange}
        handleDateChange={handleDateChange}
        exchangeRate={initialData.exchangeRate}
        shops={initialData.shops}
      />

      {/* Alerte si clôture existe déjà */}
      {isClotureExist && (
        <div className="container mx-auto px-4 py-4">
          <Alert className="bg-yellow-50 border-yellow-200">
            <InfoIcon className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              ⚠️ Une clôture existe déjà pour cette date et cette boutique. 
              <a 
                href={`/cloture-vente/historique?date=${format(selectedDate, 'yyyy-MM-dd')}&shop=${selectedShop}`}
                className="ml-2 text-yellow-900 underline font-semibold"
              >
                Voir la clôture existante
              </a>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Alerte si aucun shop sélectionné */}
      {!canCreateClosure && !isClotureExist && (
        <div className="container mx-auto px-4 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <InfoIcon className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              ℹ️ Veuillez sélectionner une boutique spécifique pour effectuer la clôture.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <PaymentCards
        totalEspeces={initialData.cashSalesTotal}
        totalBanque={initialData.bankSalesTotal}
        totalMobileMoney={initialData.mobileMoneySalesTotal} 
        totalCarte={initialData.onlSalesTotal} 
        transactionsBanque={0} 
        transactionsMobileMoney={0} 
        transactionsCarte={0}        
      />

      <DetailsAndAccounting
        initialData={initialData}
      />

      <Separator className="my-8" />

      {/* Afficher la section de clôture seulement si un shop est sélectionné et aucune clôture n'existe */}
      {canCreateClosure && (
        <ClotureVenteClose
          denominations={denominations}
          incrementDenomination={incrementDenomination}
          decrementDenomination={decrementDenomination}
          initialData={initialData}
        />
      )}
    </main>
  )
}