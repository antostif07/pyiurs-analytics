'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { POSConfig, POSOrder, POSOrderLine } from '../types/pos'
import { format, isBefore, isAfter } from 'date-fns'
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
import { InfoIcon, LockIcon, CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
  shopLastClosure: CashClosure | null
}

export default function ClotureVentesClient({ initialData, searchParams, shopLastClosure }: ClotureVentesClientProps) {
  const [selectedShop, setSelectedShop] = useState(searchParams.shop || 'all')
  const [selectedDate, setSelectedDate] = useState(initialData.date)
  const [isClotureExist, setIsClotureExist] = useState(false)
  const [currentClosure, setCurrentClosure] = useState<CashClosure | null>(null)
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

  // Vérifier si une clôture existe déjà pour la période
  const isDateInClosedPeriod = useMemo(() => {
    if (!shopLastClosure || selectedShop === 'all') return false
    
    const selected = new Date(selectedDate)
    const lastClosing = new Date(shopLastClosure.closing_date)
    
    // La date sélectionnée est-elle dans la période déjà cloturée ?
    return isBefore(selected, lastClosing) || selected.toDateString() === lastClosing.toDateString()
  }, [shopLastClosure, selectedDate, selectedShop])

  // Vérifier si une clôture existe déjà
  useEffect(() => {
    const checkExistingClosure = async () => {
      if (selectedShop && selectedShop !== 'all') {
        try {
          // Vérifier avec le nouveau schéma (opening_date/closing_date)
          const { data, error } = await supabase
            .from('cash_closures')
            .select('*')
            .eq('shop_id', parseInt(selectedShop))
            .lte('opening_date', format(selectedDate, 'yyyy-MM-dd'))
            .gte('closing_date', format(selectedDate, 'yyyy-MM-dd'))
            .maybeSingle()

          setIsClotureExist(!!data && !error)
          if (data) setCurrentClosure(data)
        } catch (error) {
          console.error('Erreur vérification clôture:', error)
          setIsClotureExist(false)
          setCurrentClosure(null)
        }
      } else {
        setIsClotureExist(false)
        setCurrentClosure(null)
      }
    }

    checkExistingClosure()
  }, [selectedDate, selectedShop])

  const canCreateClosure = selectedShop && selectedShop !== 'all' && !isClotureExist && !isDateInClosedPeriod

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

      {/* Alerte si date dans période déjà cloturée */}
      {isDateInClosedPeriod && shopLastClosure && (
        <div className="container mx-auto px-4 py-4">
          <Alert className="bg-orange-50 border-orange-200">
            <LockIcon className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  🔒 Cette date est dans une période déjà clôturée (du {format(new Date(shopLastClosure.opening_date), 'dd/MM/yyyy')} au {format(new Date(shopLastClosure.closing_date), 'dd/MM/yyyy')})
                </span>
              </div>
              
              <Button asChild variant="outline" size="sm" className="border-orange-300 text-orange-700">
                <Link 
                  href={`/cloture-vente/historique?date=${format(selectedDate, 'yyyy-MM-dd')}&shop=${selectedShop}`}
                >
                  Voir la clôture
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Alerte si clôture existe déjà pour la date exacte */}
      {isClotureExist && currentClosure && !isDateInClosedPeriod && (
        <div className="container mx-auto px-4 py-4">
          <Alert className="bg-yellow-50 border-yellow-200">
            <InfoIcon className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>
                  ⚠️ Une clôture existe déjà pour cette date exacte ({format(new Date(currentClosure.opening_date), 'dd/MM/yyyy')} au {format(new Date(currentClosure.closing_date), 'dd/MM/yyyy')})
                </span>
              </div>
              <Button asChild variant="outline" size="sm" className="border-yellow-300 text-yellow-700">
                <Link 
                  href={`/cloture-vente/historique?date=${format(selectedDate, 'yyyy-MM-dd')}&shop=${selectedShop}`}
                >
                  Voir la clôture
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Alerte si aucun shop sélectionné */}
      {!canCreateClosure && !isClotureExist && !isDateInClosedPeriod && (
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

      {/* Afficher la section de clôture seulement si possible */}
      {canCreateClosure && (
        <ClotureVenteClose
          denominations={denominations}
          incrementDenomination={incrementDenomination}
          decrementDenomination={decrementDenomination}
          initialData={initialData}
          lastClosure={shopLastClosure}
        />
      )}
    </main>
  )
}