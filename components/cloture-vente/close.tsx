'use client'

import { DollarSign, Download, FileText, Mail, MessageCircle, Minus, Plus, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Denomination } from "@/lib/constants"
import { Button } from "../ui/button"
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client"
import { Badge } from "../ui/badge"
import { useState, useMemo, useEffect } from "react"
import { format } from "date-fns"
import { ClotureData, clotureService, NegativeSaleJustification } from "@/lib/cloture-service"
import { Textarea } from "../ui/textarea"
import { CashClosure } from "@/app/types/cloture"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { PDFClotureData, pdfService } from "@/lib/pdf/cloture-service"
import { filterAndSumExpensesByKeywords } from "@/lib/utils"

interface ClotureVenteCloseProps {
  denominations: Denomination[]
  decrementDenomination: (index: number) => void
  incrementDenomination: (index: number) => void
  initialData: CloturePageDataType
  lastClosure: CashClosure | null
  negativeSaleJustifications: NegativeSaleJustification[]
}

interface CaissePrincipaleRow {
  modePaiement: string
  paymentMethod: string
  paymentMethodId?: number
  soldeOuverture: number
  ventesJour: number
  sortiesJour: number
  clotureTheorique: number
  cashPhysique: number
  managerConfirmed: boolean
  financierConfirmed: boolean
}

interface CaisseSecondaireRow {
  categorie: string
  savingsCategory: string
  savingsCategoryId?: number
  soldeOuverture: number
  entreesEpargne: number
  sortiesEpargne: number
  soldeCloture: number
  validated: boolean
}

export default function ClotureVenteClose({denominations, decrementDenomination, incrementDenomination, initialData, lastClosure, negativeSaleJustifications}: ClotureVenteCloseProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedClosure, setSavedClosure] = useState<CashClosure | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const selectedShopId = parseInt(searchParams.get('shop') || initialData.shops[0]?.id.toString() || '1');

  // Calculs de la billeterie - DOIT ÊTRE EN PREMIER
  const calculations = useMemo(() => {
    const physicalCashUSD = denominations
      .filter(d => d.currency === 'USD')
      .reduce((sum, d) => sum + (d.value * d.quantity), 0)

    const physicalCashCDF = denominations
      .filter(d => d.currency === 'CDF')
      .reduce((sum, d) => sum + (d.value * d.quantity), 0)

    const calculatedCash = physicalCashUSD + (physicalCashCDF / initialData.exchangeRate)
    const difference = calculatedCash - initialData.expectedCash

    return {
      physicalCashUSD,
      physicalCashCDF,
      calculatedCash,
      difference
    }
  }, [denominations, initialData.exchangeRate, initialData.expectedCash])

  // Fonction pour calculer les soldes d'ouverture
  const getOpeningBalances = useMemo(() => {
    const shopId = selectedShopId;
    let soCash = 0;
    let soBank = 0;
    let soMobileMoney = 0;
    let soOnline = 0;
    let soMarchandises = 0;
    let soLoyer = 0;
    let soBeauty = 0;
    let soFinance = 0;
    let soBoost = 0;
    let soSecurity = 0;
    let soPersonnel = 0;

    if (lastClosure) {
      soCash = lastClosure.physical_cash_usd + (lastClosure.physical_cash_cdf / initialData.exchangeRate);
      const lastMainCash = Array.isArray(lastClosure.calculated_cash) ? lastClosure.calculated_cash : [];
      soBank = lastMainCash.find(row => row.payment_method === 'banque')?.physical_cash || 0;
      soMobileMoney = lastMainCash.find(row => row.payment_method === 'mobile_money')?.physical_cash || 0;
      soOnline = lastMainCash.find(row => row.payment_method === 'online')?.physical_cash || 0;
    } else {
      switch (shopId) {
        case 1: 
          soCash = 8.55;
          soBank = 1217.5;
          soMarchandises = 0;
          soLoyer = 128;
          soBeauty = 0;
          soFinance = 60;
          soBoost = 40;
          soSecurity = 0;
          soPersonnel = 0;
          break; // 24
        case 13: 
          soCash = 0; break;
          soMarchandises = 0;
          soLoyer = 0;
          soBeauty = 0;
          soFinance = 0;
          soBoost = 0;
          soSecurity = 0;
          soPersonnel = 0;
        case 14:
          soCash = 21.00;
          soMarchandises = 550;
          soMarchandises = 622;
          soBeauty = 0;
          soFinance = 220;
          soBoost = 40;
          soSecurity = 0;
          soPersonnel = 0;
          break;
        case 15:
          soCash = 144.06;
          soBank = 110;
          soMarchandises = 586;
          soLoyer = 238;
          soBeauty = 78;
          soFinance = 195;
          soBoost = 25;
          soSecurity = 25;
          soPersonnel = 120;
          break;
        case 17: soCash = 2.70; break;
        default: soCash = 0;
      }
    }

    return { soCash, soBank, soMobileMoney, soOnline, soMarchandises, soBeauty, soBoost, soFinance, soLoyer, soPersonnel, soSecurity };
  }, [selectedShopId, lastClosure, initialData.exchangeRate]);

  // Calcul des données de caisse secondaire
  const savingsCalculations = useMemo(() => {
    return {
      marchandisesEntreesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ["[510166]", "[510165]", "510036"], 'any').totalAmount,
      marchandisesSortiesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ['[51003]'], 'any').totalAmount,
      loyerEntreesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ['[51055]'], 'any').totalAmount,
      beautyEntreesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ['510174', '510081'], 'any').totalAmount,
      beautySortiesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ['0829473053'], 'any').totalAmount,
      boostEntreesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ["510071", 'any'], 'any').totalAmount,
      boostSortiesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ['0860524829', '[5100577]'], 'any').totalAmount,
      financeEntreeEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ["5100399", "510101"], "any").totalAmount,
      securityEntreesEpargne: filterAndSumExpensesByKeywords(initialData.expenses, ['[51020]'], 'any').totalAmount,
      personalEntreesEpargne: 0,
    };
  }, [initialData.expenses]);

  // États pour les données des caisses
  const [caissePrincipaleData, setCaissePrincipaleData] = useState<CaissePrincipaleRow[]>([]);
  const [caisseSecondaireData, setCaisseSecondaireData] = useState<CaisseSecondaireRow[]>([]);

  // Mettre à jour les données quand les calculs changent
  useEffect(() => {
    const { soCash, soBank, soMobileMoney, soOnline, soMarchandises, soBeauty, soBoost, soFinance, soLoyer, soPersonnel, soSecurity } = getOpeningBalances;
    const {
      marchandisesEntreesEpargne,
      marchandisesSortiesEpargne, 
      loyerEntreesEpargne,
      beautyEntreesEpargne,
      beautySortiesEpargne, 
      boostEntreesEpargne,
      boostSortiesEpargne,
      financeEntreeEpargne,
      securityEntreesEpargne,
      personalEntreesEpargne
    } = savingsCalculations;

    const sortiesCash = initialData.expensesTotal - marchandisesSortiesEpargne - beautySortiesEpargne

    // Mettre à jour la caisse principale
    setCaissePrincipaleData([
      {
        modePaiement: "Espèces",
        paymentMethod: "especes",
        paymentMethodId: 1,
        soldeOuverture: soCash,
        ventesJour: initialData.cashSalesTotal,
        sortiesJour: sortiesCash,
        clotureTheorique: soCash + initialData.cashSalesTotal - sortiesCash,
        cashPhysique: calculations.calculatedCash,
        managerConfirmed: false,
        financierConfirmed: false
      },
      {
        modePaiement: "Banque",
        paymentMethod: "banque",
        paymentMethodId: 2,
        soldeOuverture: soBank,
        ventesJour: initialData.bankSalesTotal,
        sortiesJour: 0,
        clotureTheorique: soBank + initialData.bankSalesTotal,
        cashPhysique: soBank + initialData.bankSalesTotal,
        managerConfirmed: false,
        financierConfirmed: false
      },
      {
        modePaiement: "Mobile Money",
        paymentMethod: "mobile_money",
        paymentMethodId: 3,
        soldeOuverture: soMobileMoney,
        ventesJour: initialData.mobileMoneySalesTotal,
        sortiesJour: 0,
        clotureTheorique: soMobileMoney + initialData.mobileMoneySalesTotal,
        cashPhysique: soMobileMoney + initialData.mobileMoneySalesTotal,
        managerConfirmed: false,
        financierConfirmed: false
      },
      {
        modePaiement: "Online",
        paymentMethod: "online",
        paymentMethodId: 4,
        soldeOuverture: soOnline,
        ventesJour: initialData.onlSalesTotal,
        sortiesJour: 0,
        clotureTheorique: soOnline + initialData.onlSalesTotal,
        cashPhysique: soOnline + initialData.onlSalesTotal,
        managerConfirmed: false,
        financierConfirmed: false
      }
    ]);

    // Mettre à jour la caisse secondaire
    setCaisseSecondaireData([
      {
        categorie: "Epargne Marchandise",
        savingsCategory: "marchandise",
        savingsCategoryId: 1,
        soldeOuverture: soMarchandises,
        entreesEpargne: marchandisesEntreesEpargne,
        sortiesEpargne: marchandisesSortiesEpargne,
        soldeCloture: soMarchandises + marchandisesEntreesEpargne - marchandisesSortiesEpargne,
        validated: false
      },
      {
        categorie: "Loyer",
        savingsCategory: "loyer",
        savingsCategoryId: 2,
        soldeOuverture: soLoyer,
        entreesEpargne: loyerEntreesEpargne,
        sortiesEpargne: 0,
        soldeCloture: soLoyer + loyerEntreesEpargne,
        validated: false
      },
      {
        categorie: "Beauty",
        savingsCategory: "beauty",
        savingsCategoryId: 3,
        soldeOuverture: soBeauty,
        entreesEpargne: beautyEntreesEpargne,
        sortiesEpargne: beautySortiesEpargne,
        soldeCloture: soBeauty + beautyEntreesEpargne - beautySortiesEpargne,
        validated: false
      },
      {
        categorie: "Finance",
        savingsCategory: "finance",
        savingsCategoryId: 4,
        soldeOuverture: soFinance,
        entreesEpargne: financeEntreeEpargne,
        sortiesEpargne: 0,
        soldeCloture: soFinance + financeEntreeEpargne,
        validated: false
      },
      {
        categorie: "Boost",
        savingsCategory: "boost",
        savingsCategoryId: 5,
        soldeOuverture: soBoost,
        entreesEpargne: boostEntreesEpargne,
        sortiesEpargne: boostSortiesEpargne,
        soldeCloture: soSecurity + boostEntreesEpargne - boostSortiesEpargne,
        validated: false
      },
      {
        categorie: "Sécurité",
        savingsCategory: "security",
        savingsCategoryId: 6,
        soldeOuverture: soSecurity,
        entreesEpargne: securityEntreesEpargne,
        sortiesEpargne: 0,
        soldeCloture: soSecurity + securityEntreesEpargne,
        validated: false
      },
      {
        categorie: "Personnel",
        savingsCategory: "perssonal",
        savingsCategoryId: 6,
        soldeOuverture: soPersonnel,
        entreesEpargne: personalEntreesEpargne,
        sortiesEpargne: 0,
        soldeCloture: soPersonnel + personalEntreesEpargne,
        validated: false
      }
    ]);
  }, [getOpeningBalances, savingsCalculations, calculations.calculatedCash, initialData]);

  // Fonctions pour gérer la validation (restent les mêmes)
  const toggleManagerValidation = (index: number) => {
    setCaissePrincipaleData(prev => prev.map((row, i) => 
      i === index ? { ...row, managerConfirmed: !row.managerConfirmed } : row
    ));
  };

  const toggleFinancierValidation = (index: number) => {
    setCaissePrincipaleData(prev => prev.map((row, i) => 
      i === index ? { ...row, financierConfirmed: !row.financierConfirmed } : row
    ));
  };

  const toggleSecondaryValidation = (index: number) => {
    setCaisseSecondaireData(prev => prev.map((row, i) => 
      i === index ? { ...row, validated: !row.validated } : row
    ));
  };

  const validateAllMainCash = (type: 'manager' | 'financier') => {
    setCaissePrincipaleData(prev => prev.map(row => ({
      ...row,
      ...(type === 'manager' ? { managerConfirmed: true } : { financierConfirmed: true })
    })));
  };

  const validateAllSecondaryCash = () => {
    setCaisseSecondaireData(prev => prev.map(row => ({
      ...row,
      validated: true
    })));
  };

  const handleGeneratePDF = async () => {
    try {
      const selectedShopId = searchParams.get('shop') || initialData.shops[0]?.id.toString()
      const selectedShop = initialData.shops.find(shop => shop.id.toString() === selectedShopId)
      
      if (!savedClosure) {
        toast.error('Veuillez d\'abord sauvegarder la clôture')
        return
      }

      const fullClosureData = await clotureService.getClotureById(savedClosure.id)
      
      if (!fullClosureData) {
        toast.error('Données de clôture non trouvées')
        return
      }

      const pdfData: PDFClotureData = {
        closure: fullClosureData,
        mainCash: fullClosureData.cash_closure_main_cash || [],
        secondaryCash: fullClosureData.cash_closure_secondary_cash || [],
        denominations: fullClosureData.cash_denominations || []
      }

      const pdfBlob = await pdfService.generateCloturePDF(pdfData)
      
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `cloture-${selectedShop?.name}-${format(initialData.date, 'yyyy-MM-dd')}.pdf`
      link.click()
      URL.revokeObjectURL(url)

      toast.success('PDF généré avec succès')

    } catch (error) {
      console.error('Erreur génération PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleShareWhatsApp = async () => {
    toast.info('Fonction WhatsApp en développement')
  }

  const handleSendEmail = async () => {
    toast.info('Fonction email en développement')
  }
  
  const handleSaveClosure = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Vérifier que toutes les lignes du manager sont validées
      const allManagerValidated = caissePrincipaleData.every(row => row.managerConfirmed)
      
      if (!allManagerValidated) {
        setError('Veuillez valider toutes les lignes de la caisse principale par le manager avant de finaliser la clôture.')
        setIsSubmitting(false)
        return
      }

      const negativeSales = initialData.sales.filter(sale => (sale.amount_total || 0) <= 0)
      const justifiedSaleIds = negativeSaleJustifications.map(j => j.sale_id)
      const unjustifiedNegativeSales = negativeSales.filter(sale => !justifiedSaleIds.includes(sale.id))

      if (unjustifiedNegativeSales.length > 0) {
        setError(`Veuillez justifier ${unjustifiedNegativeSales.length} vente${unjustifiedNegativeSales.length > 1 ? 's' : ''} négative${unjustifiedNegativeSales.length > 1 ? 's' : ''} avant de finaliser la clôture.`)
        setIsSubmitting(false)
        return
      }


      const selectedShopId = searchParams.get('shop') || initialData.shops[0]?.id.toString()
      const selectedShop = initialData.shops.find(shop => shop.id.toString() === selectedShopId) || initialData.shops[0]
      
      if (!selectedShop) {
        throw new Error('Aucune boutique sélectionnée')
      }

      const existingClosure = await clotureService.checkExistingClosurePeriod(
        format(initialData.date, 'yyyy-MM-dd'),
        format(initialData.date, 'yyyy-MM-dd'),
        selectedShop.id
      )

      if (existingClosure) {
        setError('Une clôture existe déjà pour cette date et cette boutique.')
        setIsSubmitting(false)
        return
      }

      const clotureData: ClotureData = {
        closure: {
          opening_date: format(initialData.date, 'yyyy-MM-dd'),
          closing_date: format(new Date(), 'yyyy-MM-dd'),
          shop_id: selectedShop.id,
          shop_name: selectedShop.name,
          total_sales: initialData.dailySalesTotal,
          total_expenses: initialData.expensesTotal,
          expected_cash: initialData.expectedCash,
          physical_cash_usd: calculations.physicalCashUSD,
          physical_cash_cdf: calculations.physicalCashCDF,
          exchange_rate: initialData.exchangeRate,
          calculated_cash: calculations.calculatedCash,
          difference: calculations.difference,
          closure_status: 'draft',
          notes: notes,
          created_by: 1
        },
        mainCash: caissePrincipaleData.map(row => ({
          payment_method_id: row.paymentMethodId,
          payment_method: row.paymentMethod,
          payment_method_name: row.modePaiement,
          opening_balance: row.soldeOuverture,
          daily_sales: row.ventesJour,
          daily_outflows: row.sortiesJour,
          theoretical_closure: row.clotureTheorique,
          physical_cash: row.cashPhysique,
          manager_confirmed: row.managerConfirmed,
          financier_confirmed: row.financierConfirmed
        })),
        secondaryCash: caisseSecondaireData.map(row => ({
          savings_category_id: row.savingsCategoryId,
          savings_category: row.savingsCategory,
          savings_category_name: row.categorie,
          opening_balance: row.soldeOuverture,
          savings_inflows: row.entreesEpargne,
          savings_outflows: row.sortiesEpargne,
          closure_balance: row.soldeCloture,
          validated: row.validated
        })),
        denominations: denominations
          .filter(d => d.quantity > 0)
          .map(d => ({
            currency: d.currency,
            denomination: d.value,
            quantity: d.quantity,
            amount: d.value * d.quantity
          })),
        negativeSaleJustifications: negativeSaleJustifications
      }

      const result = await clotureService.createCloture(clotureData)
      setSavedClosure(result)
      
      toast('Clôture sauvegardée avec succès!')

    } catch (error: unknown) {
      console.error('Erreur lors de la sauvegarde:', error)
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Une erreur est survenue lors de la sauvegarde'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (manager: boolean, financier: boolean) => {
    if (manager && financier) return <Badge variant="default" className="bg-green-100 text-green-800">Validé</Badge>
    if (manager) return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Manager OK</Badge>
    return <Badge variant="outline" className="bg-gray-100 text-gray-600">En attente</Badge>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {negativeSaleJustifications.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Badge variant="outline" className="bg-green-100 text-green-700">
              {negativeSaleJustifications.length} vente{negativeSaleJustifications.length > 1 ? 's' : ''} justifiée{negativeSaleJustifications.length > 1 ? 's' : ''}
            </Badge>
            <span className="text-sm font-medium">
              ✅ Toutes les ventes négatives ont été justifiées
            </span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Colonne Gauche - Billeterie */}
        <div className="xl:col-span-1 space-y-6">
          {/* Billeterie */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5" />
                Billeterie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* USD */}
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  USD
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {denominations.filter(d => d.currency === 'USD').map((denomination, index) => (
                    <div key={denomination.value} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                      <span className="text-sm font-semibold text-gray-800">{denomination.value}$</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-gray-300"
                          onClick={() => decrementDenomination(index)}
                          disabled={denomination.quantity === 0}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900">{denomination.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-gray-300"
                          onClick={() => incrementDenomination(index)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* CDF */}
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  CDF
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {denominations.filter(d => d.currency === 'CDF').map((denomination) => {
                    const globalIndex = denominations.findIndex(d => d.currency === 'CDF' && d.value === denomination.value)
                    return (
                      <div key={denomination.value} className="flex items-center justify-between p-3 border rounded-lg bg-white shadow-sm">
                        <span className="text-sm font-semibold text-gray-800">{denomination.value.toLocaleString('fr-FR')}FC</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-gray-300"
                            onClick={() => decrementDenomination(globalIndex)}
                            disabled={denomination.quantity === 0}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold text-gray-900">{denomination.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-gray-300"
                            onClick={() => incrementDenomination(globalIndex)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Résumé Billeterie */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-600">Total USD:</span>
                  <span className="font-bold text-green-600">
                    {calculations.physicalCashUSD.toLocaleString('fr-FR')} $
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="font-medium text-gray-600">Total CDF:</span>
                  <span className="font-bold text-blue-600">
                    {calculations.physicalCashCDF.toLocaleString('fr-FR')} FC
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2 font-semibold">
                  <span className="text-gray-700">Cash Physique Total:</span>
                  <span className="text-purple-600">
                    {calculations.calculatedCash.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes et Clôture */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Save className="w-5 h-5" />
                Finalisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {savedClosure && (
                <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✅ Clôture sauvegardée le {format(new Date(), 'dd/MM/yyyy à HH:mm')}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Observations</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur la clôture, remarques, anomalies..."
                  className="w-full resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={4}
                />
              </div>
              
              <Button
                onClick={handleSaveClosure}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 h-11 text-base font-semibold shadow-md"
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Sauvegarde...' : 'Finaliser la Clôture'}
              </Button>

              <div className="text-xs text-gray-500 text-center">
                Toutes les validations doivent être complétées avant la clôture
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="w-5 h-5" />
                Export & Partage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleGeneratePDF}
                disabled={!savedClosure}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleShareWhatsApp}
                  disabled={!savedClosure}
                  variant="outline"
                  className="justify-start"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                
                <Button
                  onClick={handleSendEmail}
                  disabled={!savedClosure}
                  variant="outline"
                  className="justify-start"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                Disponible après sauvegarde
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne Droite - Tableaux */}
        <div className="xl:col-span-2 space-y-6">
          {/* Caisse Principale */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6 text-blue-600" />
                Caisse Principale
                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                  {caissePrincipaleData.filter(row => row.managerConfirmed && row.financierConfirmed).length}/{caissePrincipaleData.length} validés
                </Badge>
              </CardTitle>
              {/* Boutons de validation globale */}
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => validateAllMainCash('manager')}
                  className="text-xs"
                >
                  ✅ Valider tous Manager
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => validateAllMainCash('financier')}
                  className="text-xs"
                >
                  ✅ Valider tous Financier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                      <th className="text-left p-4 font-semibold text-blue-900">Mode de Paiement</th>
                      <th className="text-right p-4 font-semibold text-blue-900">Solde Ouverture</th>
                      <th className="text-right p-4 font-semibold text-blue-900">Ventes Jour</th>
                      <th className="text-right p-4 font-semibold text-blue-900">Sorties Jour</th>
                      <th className="text-right p-4 font-semibold text-blue-900">Clôture Théorique</th>
                      <th className="text-right p-4 font-semibold text-blue-900">Cash Physique</th>
                      <th className="text-center p-4 font-semibold text-blue-900">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caissePrincipaleData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-blue-50/50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{row.modePaiement}</td>
                        <td className="p-4 text-right font-semibold">{row.soldeOuverture.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-right font-semibold text-green-600">+{row.ventesJour.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-right font-semibold text-red-600">-{row.sortiesJour.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-right font-bold text-purple-600">{row.clotureTheorique.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-right font-bold text-blue-600">{row.cashPhysique.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            {/* Bouton Manager cliquable */}
                            <Button
                              variant={row.managerConfirmed ? "default" : "outline"}
                              size="sm"
                              className={`text-xs h-7 ${row.managerConfirmed ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                              onClick={() => toggleManagerValidation(index)}
                            >
                              {row.managerConfirmed ? "✅ Manager" : "⏳ Manager"}
                            </Button>
                            
                            {/* Bouton Financier cliquable */}
                            <Button
                              variant={row.financierConfirmed ? "default" : "outline"}
                              size="sm"
                              className={`text-xs h-7 ${row.financierConfirmed ? "bg-green-600 hover:bg-green-700" : ""}`}
                              onClick={() => toggleFinancierValidation(index)}
                            >
                              {row.financierConfirmed ? "✅ Financier" : "⏳ Financier"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Total (reste inchangé) */}
                    <tr className="bg-gradient-to-r from-blue-100 to-blue-200 font-bold">
                      <td className="p-4 text-blue-900">TOTAL GÉNÉRAL</td>
                      <td className="p-4 text-right text-blue-900">
                        {caissePrincipaleData.reduce((sum, row) => sum + row.soldeOuverture, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-right text-green-700">
                        +{caissePrincipaleData.reduce((sum, row) => sum + row.ventesJour, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-right text-red-700">
                        -{caissePrincipaleData.reduce((sum, row) => sum + row.sortiesJour, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-right text-purple-700">
                        {caissePrincipaleData.reduce((sum, row) => sum + row.clotureTheorique, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-right text-blue-700">
                        {caissePrincipaleData.reduce((sum, row) => sum + row.cashPhysique, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-center">
                        {getStatusBadge(
                          caissePrincipaleData.every(row => row.managerConfirmed),
                          caissePrincipaleData.every(row => row.financierConfirmed)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Caisse Secondaire */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6 text-green-600" />
                Caisse Secondaire - Épargnes
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                  {caisseSecondaireData.filter(row => row.validated).length}/{caisseSecondaireData.length} validés
                </Badge>
              </CardTitle>
              {/* Bouton de validation globale */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={validateAllSecondaryCash}
                className="mt-2 text-xs"
              >
                ✅ Valider toutes les épargnes
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                      <th className="text-left p-4 font-semibold text-green-900">Catégorie</th>
                      <th className="text-right p-4 font-semibold text-green-900">Solde Ouverture</th>
                      <th className="text-right p-4 font-semibold text-green-900">Entrées Épargne (+)</th>
                      <th className="text-right p-4 font-semibold text-green-900">Sorties Épargne (-)</th>
                      <th className="text-right p-4 font-semibold text-green-900">Solde Clôture</th>
                      <th className="text-center p-4 font-semibold text-green-900">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caisseSecondaireData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-green-50/50 transition-colors">
                        <td className="p-4 font-medium text-gray-900">{row.categorie}</td>
                        <td className="p-4 text-right font-semibold">{row.soldeOuverture.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-right font-semibold text-green-600">+{row.entreesEpargne.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-right font-semibold text-red-600">-{row.sortiesEpargne.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-right font-bold text-blue-600">{row.soldeCloture.toLocaleString('fr-FR')} $</td>
                        <td className="p-4 text-center">
                          {/* Bouton de validation cliquable */}
                          <Button
                            variant={row.validated ? "default" : "outline"}
                            size="sm"
                            className={`text-xs h-7 ${row.validated ? "bg-green-600 hover:bg-green-700" : ""}`}
                            onClick={() => toggleSecondaryValidation(index)}
                          >
                            {row.validated ? "✅ Validé" : "⏳ En attente"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                    
                    <tr className="bg-gradient-to-r from-green-100 to-green-200 font-bold">
                      <td className="p-4 text-green-900">TOTAL GÉNÉRAL</td>
                      <td className="p-4 text-right text-green-900">
                        {caisseSecondaireData.reduce((sum, row) => sum + row.soldeOuverture, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-right text-green-700">
                        +{caisseSecondaireData.reduce((sum, row) => sum + row.entreesEpargne, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-right text-red-700">
                        -{caisseSecondaireData.reduce((sum, row) => sum + row.sortiesEpargne, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-right text-blue-700">
                        {caisseSecondaireData.reduce((sum, row) => sum + row.soldeCloture, 0).toLocaleString('fr-FR')} $
                      </td>
                      <td className="p-4 text-center">
                        <Badge variant={caisseSecondaireData.every(row => row.validated) ? "default" : "secondary"} 
                              className={caisseSecondaireData.every(row => row.validated) ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                          {caisseSecondaireData.every(row => row.validated) ? '✅ Tout validé' : '⏳ En cours'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}