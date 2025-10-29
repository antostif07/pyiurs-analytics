'use client'

import { DollarSign, Download, FileText, Mail, MessageCircle, Minus, Plus, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Denomination } from "@/lib/constants"
import { Button } from "../ui/button"
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client"
import { Badge } from "../ui/badge"
import { useState, useMemo } from "react"
import { format } from "date-fns"
import { ClotureData, clotureService } from "@/lib/cloture-service"
import { Textarea } from "../ui/textarea"
import { CashClosure } from "@/app/types/cloture"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { PDFClotureData, pdfService } from "@/lib/pdf/cloture-service"

interface ClotureVenteCloseProps {
  denominations: Denomination[]
  decrementDenomination: (index: number) => void
  incrementDenomination: (index: number) => void
  initialData: CloturePageDataType
  lastClosure: CashClosure | null
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

export default function ClotureVenteClose({denominations, decrementDenomination, incrementDenomination, initialData, lastClosure}: ClotureVenteCloseProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedClosure, setSavedClosure] = useState<CashClosure | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const selectedShopId = parseInt(searchParams.get('shop') || initialData.shops[0]?.id.toString() || '1');

  const getOpeningBalances = (shopId: number) => {
    let soCash = 0;
    let soBank = 0;
    let soMobileMoney = 0;
    let soOnline = 0;

    // Si dernière clôture existe, utiliser ses données
    if (lastClosure) {
      soCash = lastClosure.physical_cash_usd + (lastClosure.physical_cash_cdf / initialData.exchangeRate);
      // Pour les autres modes, on pourrait récupérer depuis la dernière clôture si disponible
      const lastMainCash = Array.isArray(lastClosure.calculated_cash) ? lastClosure.calculated_cash : [];
      soBank = lastMainCash.find(row => row.payment_method === 'banque')?.physical_cash || 0;
      soMobileMoney = lastMainCash.find(row => row.payment_method === 'mobile_money')?.physical_cash || 0;
      soOnline = lastMainCash.find(row => row.payment_method === 'online')?.physical_cash || 0;
    } else {
      // Si pas de dernière clôture, utiliser les soldes par défaut selon le shop
      switch (shopId) {
        case 1: // PB - 24
          soCash = 37.95;
          soBank = 0;
          soMobileMoney = 0;
          soOnline = 0;
          break;
        
        case 13: // PB - LMB
          soCash = 0;
          soBank = 0;
          soMobileMoney = 0;
          soOnline = 0;
          break;
        
        case 14: // PB - KTM
          soCash = 33.50;
          soBank = 0;
          soMobileMoney = 0;
          soOnline = 0;
          break;
        
        case 15: // PB - MTO
          soCash = 124.06;
          soBank = 0;
          soMobileMoney = 0;
          soOnline = 0;
          break;

        case 17: // PB - BC
          soCash = 2.70;
          soBank = 0;
          soMobileMoney = 0;
          soOnline = 0;
          break;
        
        default:
          soCash = 0;
          soBank = 0;
          soMobileMoney = 0;
          soOnline = 0;
      }
    }

    return { soCash, soBank, soMobileMoney, soOnline };
  };

  // Calculer les soldes d'ouverture pour le shop sélectionné
  const { soCash, soBank, soMobileMoney, soOnline } = getOpeningBalances(selectedShopId);

  const handleGeneratePDF = async () => {
    try {
      // Récupérer toutes les données complètes de la clôture
      const selectedShopId = searchParams.get('shop') || initialData.shops[0]?.id.toString()
      const selectedShop = initialData.shops.find(shop => shop.id.toString() === selectedShopId)
      
      if (!savedClosure) {
        toast.error('Veuillez d\'abord sauvegarder la clôture')
        return
      }

      // Récupérer les données complètes depuis Supabase
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
      
      // Téléchargement
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
    // Implémentation pour WhatsApp
    toast.info('Fonction WhatsApp en développement')
  }

  const handleSendEmail = async () => {
    // Implémentation pour email
    toast.info('Fonction email en développement')
  }

  // Calculs de la billeterie
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

  // const soCash = lastClosure ? lastClosure.physical_cash_usd + (lastClosure.physical_cash_cdf / initialData.exchangeRate) : 0;
  // const soBank = 0;
  // const soMobileMoney = 0;
  // const soOnline = 0;

  // Données pour la caisse principale
  const caissePrincipaleData: CaissePrincipaleRow[] = [
    {
      modePaiement: "Espèces",
      paymentMethod: "especes",
      paymentMethodId: 1,
      soldeOuverture: soCash,
      ventesJour: initialData.cashSalesTotal,
      sortiesJour: initialData.expensesTotal,
      clotureTheorique: soCash + initialData.cashSalesTotal - initialData.expensesTotal,
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
      cashPhysique: initialData.bankSalesTotal,
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
      cashPhysique: initialData.mobileMoneySalesTotal,
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
      cashPhysique: initialData.onlSalesTotal,
      managerConfirmed: false,
      financierConfirmed: false
    }
  ]

  // Données pour la caisse secondaire
  const caisseSecondaireData: CaisseSecondaireRow[] = [
    {
      categorie: "Epargne Marchandise",
      savingsCategory: "marchandise",
      savingsCategoryId: 1,
      soldeOuverture: 0,
      entreesEpargne: 0,
      sortiesEpargne: 0,
      soldeCloture: 0,
      validated: false
    },
    {
      categorie: "Loyer",
      savingsCategory: "loyer",
      savingsCategoryId: 2,
      soldeOuverture: 0,
      entreesEpargne: 0,
      sortiesEpargne: 0,
      soldeCloture: 0,
      validated: false
    },
    {
      categorie: "Beauty",
      savingsCategory: "beauty",
      savingsCategoryId: 3,
      soldeOuverture: 0,
      entreesEpargne: 0,
      sortiesEpargne: 0,
      soldeCloture: 0,
      validated: false
    },
    {
      categorie: "Finance",
      savingsCategory: "finance",
      savingsCategoryId: 4,
      soldeOuverture: 0,
      entreesEpargne: 0,
      sortiesEpargne: 0,
      soldeCloture: 0,
      validated: false
    },
    {
      categorie: "Boost",
      savingsCategory: "boost",
      savingsCategoryId: 5,
      soldeOuverture: 0,
      entreesEpargne: 0,
      sortiesEpargne: 0,
      soldeCloture: 0,
      validated: false
    }
  ]
  
  const handleSaveClosure = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Récupérer le shop sélectionné depuis l'URL ou utiliser le premier shop
      const selectedShopId = searchParams.get('shop') || initialData.shops[0]?.id.toString()
      const selectedShop = initialData.shops.find(shop => shop.id.toString() === selectedShopId) || initialData.shops[0]
      
      if (!selectedShop) {
        throw new Error('Aucune boutique sélectionnée')
      }

      // Vérifier si une clôture existe déjà
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

      // Préparer les données pour Supabase
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
          created_by: 1 // À remplacer par l'ID utilisateur réel
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
          }))
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
                            <Badge variant={row.managerConfirmed ? "default" : "outline"} className={row.managerConfirmed ? "bg-blue-600" : ""}>
                              {row.managerConfirmed ? "✅ Manager" : "⏳ Manager"}
                            </Badge>
                            <Badge variant={row.financierConfirmed ? "default" : "outline"} className={row.financierConfirmed ? "bg-green-600" : ""}>
                              {row.financierConfirmed ? "✅ Financier" : "⏳ Financier"}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Total */}
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
                          <Badge variant={row.validated ? "default" : "outline"} className={row.validated ? "bg-green-600" : ""}>
                            {row.validated ? "✅ Validé" : "⏳ En attente"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {/* Total */}
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