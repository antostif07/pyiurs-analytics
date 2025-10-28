import { DollarSign, FileText, Minus, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Denomination } from "@/lib/constants"
import { Button } from "../ui/button"
import { CloturePageDataType } from "@/app/cloture-vente/cloture-ventes.client"
import { Badge } from "../ui/badge"

interface ClotureVenteCloseProps {
  denominations: Denomination[]
  decrementDenomination: (index: number) => void
  incrementDenomination: (index: number) => void
  initialData: CloturePageDataType
}

export default function ClotureVenteClose({denominations, decrementDenomination, incrementDenomination, initialData}: ClotureVenteCloseProps) {
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
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Billeterie existante */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Billeterie
                </CardTitle>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                    {/* USD */}
                    <div>
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">USD</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {denominations.filter(d => d.currency === 'USD').map((denomination, index) => (
                        <div key={denomination.value} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">{denomination.value}$</span>
                            <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => decrementDenomination(index)}
                                disabled={denomination.quantity === 0}
                            >
                                <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">{denomination.quantity}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
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
                    <h4 className="font-semibold text-sm text-gray-500 mb-2">CDF</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {denominations.filter(d => d.currency === 'CDF').map((denomination) => {
                        const globalIndex = denominations.findIndex(d => d.currency === 'CDF' && d.value === denomination.value)
                        return (
                            <div key={denomination.value} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">{denomination.value.toLocaleString('fr-FR')}FC</span>
                            <div className="flex items-center gap-1">
                                <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => decrementDenomination(globalIndex)}
                                disabled={denomination.quantity === 0}
                                >
                                <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-bold">{denomination.quantity}</span>
                                <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
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
                </div>
                </CardContent>
            </Card>

            {/* Tableau de Synthèse */}
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Synthèse de Clôture
                </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                {/* Entrées */}
                <div>
                    <h4 className="font-semibold text-green-600 mb-3">ENTRÉES</h4>
                    <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Solde d&apos;ouverture</span>
                        <span className="font-semibold">0 $</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Total Cash (Espèces)</span>
                        <span className="font-semibold text-green-600">
                        {initialData.cashSalesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Mobile Money</span>
                        <span className="font-semibold text-green-600">
                        {initialData.mobileMoneySalesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Banque</span>
                        <span className="font-semibold text-green-600">
                        {initialData.bankSalesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Online</span>
                        <span className="font-semibold text-green-600">
                        {initialData.onlSalesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="border-t pt-2">
                        <div className="flex justify-between items-center font-bold">
                        <span>Total Entrées</span>
                        <span className="text-green-600">
                            {initialData.dailySalesTotal.toLocaleString('fr-FR')} $
                        </span>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Sorties */}
                <div>
                    <h4 className="font-semibold text-red-600 mb-3">SORTIES</h4>
                    <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Dépenses Cash</span>
                        <span className="font-semibold text-red-600">
                        {initialData.expensesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Mobile Money</span>
                        <span className="font-semibold text-red-600">0 $</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Banque</span>
                        <span className="font-semibold text-red-600">0 $</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Online</span>
                        <span className="font-semibold text-red-600">0 $</span>
                    </div>
                    <div className="border-t pt-2">
                        <div className="flex justify-between items-center font-bold">
                        <span>Total Sorties</span>
                        <span className="text-red-600">
                            {initialData.expensesTotal.toLocaleString('fr-FR')} $
                        </span>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Soldes d'épargne */}
                <div>
                    <h4 className="font-semibold text-blue-600 mb-3">SOLDES D&apos;ÉPARGNE</h4>
                    <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Solde d&apos;ouverture Beauty</span>
                        <span className="font-semibold">0 $</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Solde d&apos;ouverture Produits</span>
                        <span className="font-semibold">0 $</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Solde d&apos;ouverture Loyer</span>
                        <span className="font-semibold">0 $</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Solde d&apos;ouverture Personnel</span>
                        <span className="font-semibold">0 $</span>
                    </div>
                    </div>
                </div>

                {/* Totaux de clôture */}
                <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-600 mb-3">SOLDE DE FERMETURE</h4>
                    <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Cash Physique</span>
                        <span className="font-semibold">
                        {initialData.cashSalesTotal.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Mobile Money</span>
                        <span className="font-semibold">
                        {initialData.mobileMoneySalesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Banque</span>
                        <span className="font-semibold">
                        {initialData.bankSalesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm">Online</span>
                        <span className="font-semibold">
                        {initialData.onlSalesTotal.toLocaleString('fr-FR')} $
                        </span>
                    </div>
                    <div className="border-t pt-2">
                        <div className="flex justify-between items-center font-bold text-lg">
                        <span>Solde Total de Fermeture</span>
                        <span className="text-purple-600">
                            {(
                            initialData.cashSalesTotal + 
                            initialData.mobileMoneySalesTotal + 
                            initialData.bankSalesTotal + 
                            initialData.onlSalesTotal
                            ).toLocaleString('fr-FR')} $
                        </span>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Différence et Bouton de clôture */}
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-4">
                    <div>
                        {/* <p className="text-lg font-semibold">Différence</p>
                        <p className={`text-xl font-bold ${getDifferenceColor(calculations.difference)}`}>
                        {calculations.difference.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                        </p>
                        {getDifferenceBadge(calculations.difference)} */}
                    </div>
                    </div>

                    {/* Observations */}
                    <div className="mb-4">
                    <label className="text-sm font-medium block mb-2">Observations</label>
                    {/* <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes sur la clôture..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                        rows={3}
                    /> */}
                    </div>

                    {/* Bouton de clôture */}
                    {/* <Button
                    onClick={handleSaveClosure}
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                    >
                    <Save className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder la Clôture'}
                    </Button> */}

                    {/* {savedClosure && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mt-4">
                        <p className="text-green-800 text-sm">
                        ✅ Clôture sauvegardée le {format(new Date(savedClosure.created_at), 'dd/MM/yyyy à HH:mm')}
                        </p>
                    </div>
                    )} */}
                </div>
                </CardContent>
            </Card>
            </div>
        </div>
        
    )
}