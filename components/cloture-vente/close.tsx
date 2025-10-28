import { DollarSign, FileText, Minus, Plus, Save, CheckCircle, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Denomination } from "@/lib/constants"
import { Button } from "../ui/button"
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client"
import { Badge } from "../ui/badge"
import { useState } from "react"

interface ClotureVenteCloseProps {
  denominations: Denomination[]
  decrementDenomination: (index: number) => void
  incrementDenomination: (index: number) => void
  initialData: CloturePageDataType
}

interface CaissePrincipaleRow {
  modePaiement: string
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
  soldeOuverture: number
  entreesEpargne: number
  sortiesEpargne: number
  soldeCloture: number
  validated: boolean
}

export default function ClotureVenteClose({denominations, decrementDenomination, incrementDenomination, initialData}: ClotureVenteCloseProps) {
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Données mock pour la caisse principale
  const caissePrincipaleData: CaissePrincipaleRow[] = [
    {
      modePaiement: "Espèces",
      soldeOuverture: 1500,
      ventesJour: initialData.cashSalesTotal,
      sortiesJour: initialData.expensesTotal,
      clotureTheorique: 1500 + initialData.cashSalesTotal - initialData.expensesTotal,
      cashPhysique: 1500 + initialData.cashSalesTotal - initialData.expensesTotal,
      managerConfirmed: false,
      financierConfirmed: false
    },
    {
      modePaiement: "Banque",
      soldeOuverture: 5000,
      ventesJour: initialData.bankSalesTotal,
      sortiesJour: 0,
      clotureTheorique: 5000 + initialData.bankSalesTotal,
      cashPhysique: 5000 + initialData.bankSalesTotal,
      managerConfirmed: true,
      financierConfirmed: false
    },
    {
      modePaiement: "Mobile Money",
      soldeOuverture: 2000,
      ventesJour: initialData.mobileMoneySalesTotal,
      sortiesJour: 0,
      clotureTheorique: 2000 + initialData.mobileMoneySalesTotal,
      cashPhysique: 2000 + initialData.mobileMoneySalesTotal,
      managerConfirmed: false,
      financierConfirmed: false
    },
    {
      modePaiement: "Online",
      soldeOuverture: 1000,
      ventesJour: initialData.onlSalesTotal,
      sortiesJour: 0,
      clotureTheorique: 1000 + initialData.onlSalesTotal,
      cashPhysique: 1000 + initialData.onlSalesTotal,
      managerConfirmed: true,
      financierConfirmed: true
    }
  ]

  // Données mock pour la caisse secondaire
  const caisseSecondaireData: CaisseSecondaireRow[] = [
    {
      categorie: "Epargne Marchandise",
      soldeOuverture: 5000,
      entreesEpargne: 1500,
      sortiesEpargne: 800,
      soldeCloture: 5700,
      validated: true
    },
    {
      categorie: "Loyer",
      soldeOuverture: 3000,
      entreesEpargne: 2000,
      sortiesEpargne: 0,
      soldeCloture: 5000,
      validated: false
    },
    {
      categorie: "Beauty",
      soldeOuverture: 2500,
      entreesEpargne: 1200,
      sortiesEpargne: 500,
      soldeCloture: 3200,
      validated: true
    },
    {
      categorie: "Finance",
      soldeOuverture: 8000,
      entreesEpargne: 3000,
      sortiesEpargne: 2000,
      soldeCloture: 9000,
      validated: false
    },
    {
      categorie: "Boost",
      soldeOuverture: 1500,
      entreesEpargne: 800,
      sortiesEpargne: 300,
      soldeCloture: 2000,
      validated: true
    }
  ]

  const handleSaveClosure = async () => {
    setIsSubmitting(true)
    // Simulation de sauvegarde
    setTimeout(() => {
      setIsSubmitting(false)
      alert('Clôture sauvegardée avec succès!')
    }, 2000)
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
            <CardHeader className="">
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
                    <div key={denomination.value} className="flex items-center justify-between p-1 border rounded-lg bg-white shadow-sm">
                      <span className="text-sm font-semibold text-gray-800 text-xs">{denomination.value}$</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-4 w-4 p-0 border-gray-300 rounded-12"
                          onClick={() => decrementDenomination(index)}
                          disabled={denomination.quantity === 0}
                        >
                          <Minus className="w-2 h-2" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold text-gray-900">{denomination.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-4 w-4 p-0 border-gray-300"
                          onClick={() => incrementDenomination(index)}
                        >
                          <Plus className="w-1 h-1" />
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
                        <span className="text-sm font-semibold text-gray-800 text-[12px]">{denomination.value.toLocaleString('fr-FR')}FC</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-4 w-4 p-0 border-gray-300"
                            onClick={() => decrementDenomination(globalIndex)}
                            disabled={denomination.quantity === 0}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-4 text-center text-sm font-bold text-gray-900">{denomination.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-4 w-4 p-0 border-gray-300"
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
                    {denominations
                      .filter(d => d.currency === 'USD')
                      .reduce((sum, d) => sum + (d.value * d.quantity), 0)
                      .toLocaleString('fr-FR')} $
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="font-medium text-gray-600">Total CDF:</span>
                  <span className="font-bold text-blue-600">
                    {denominations
                      .filter(d => d.currency === 'CDF')
                      .reduce((sum, d) => sum + (d.value * d.quantity), 0)
                      .toLocaleString('fr-FR')} FC
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
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Observations</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur la clôture, remarques, anomalies..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                            <Button
                              size="sm"
                              variant={row.managerConfirmed ? "default" : "outline"}
                              className={`h-8 text-xs font-medium ${row.managerConfirmed ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-700'}`}
                            >
                              {row.managerConfirmed ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              Manager
                            </Button>
                            <Button
                              size="sm"
                              variant={row.financierConfirmed ? "default" : "outline"}
                              className={`h-8 text-xs font-medium ${row.financierConfirmed ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 text-green-700'}`}
                            >
                              {row.financierConfirmed ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              Financier
                            </Button>
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
                          <Button
                            size="sm"
                            variant={row.validated ? "default" : "outline"}
                            className={`h-8 text-xs font-medium ${row.validated ? 'bg-green-600 hover:bg-green-700' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                          >
                            {row.validated ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {row.validated ? 'Validé' : 'Valider'}
                          </Button>
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