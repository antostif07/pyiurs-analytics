import { notFound } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowLeft, CheckCircle, XCircle, Calendar, Building } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { CashDenomination } from "@/app/types/cloture"

interface ClotureDetailPageProps {
  params: Promise<{
    id: string
  }>
}

async function getClotureDetail(id: string) {
  const { data, error } = await supabase
    .from('cash_closures')
    .select(`
      *,
      cash_closure_main_cash (*),
      cash_closure_secondary_cash (*),
      cash_denominations (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erreur récupération détail:', error)
    return null
  }

  return data
}

export default async function ClotureDetailPage({ params }: ClotureDetailPageProps) {
  const { id } = await params
  const cloture = await getClotureDetail(id)

  if (!cloture) {
    notFound()
  }

  const isCompleted = cloture.closure_status === 'completed'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/cloture-vente/historique">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Détail de la Clôture
              </h1>
              <div className="flex items-center gap-4 mt-2 text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(cloture.closure_date), 'dd MMMM yyyy', { locale: fr })}
                </div>
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {cloture.shop_name || `Boutique #${cloture.shop_id}`}
                </div>
                <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                  {isCompleted ? "✅ Journée Clôturée" : "🔄 En Cours"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Bannière journée clôturée */}
        {isCompleted && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Journée Clôturée</h3>
                  <p className="text-green-700 text-sm">
                    Cette journée a été validée et clôturée. Les données sont figées.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ventes Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {cloture.total_sales?.toLocaleString('fr-FR')} $
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Dépenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {cloture.total_expenses?.toLocaleString('fr-FR')} $
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cash Théorique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {cloture.expected_cash?.toLocaleString('fr-FR')} $
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Différence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                Math.abs(cloture.difference || 0) < 0.01 ? 'text-green-600' : 
                (cloture.difference || 0) > 0 ? 'text-orange-600' : 'text-red-600'
              }`}>
                {cloture.difference?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sections détaillées (similaires à la page de création mais en lecture seule) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Colonne gauche - Billeterie et informations */}
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💵 Billeterie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Afficher les dénominations */}
                <div className="space-y-3">
                  {cloture.cash_denominations?.map((denom: CashDenomination) => (
                    <div key={denom.id} className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">
                        {denom.denomination} {denom.currency}
                      </span>
                      <span className="font-semibold">
                        {denom.quantity} x {denom.amount.toLocaleString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total USD:</span>
                    <span className="font-semibold">{cloture.physical_cash_usd?.toLocaleString('fr-FR')} $</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total CDF:</span>
                    <span className="font-semibold">{cloture.physical_cash_cdf?.toLocaleString('fr-FR')} FC</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations de validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📋 Validation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Statut:</span>
                  <Badge variant={
                    cloture.closure_status === 'completed' ? "default" : 
                    cloture.closure_status === 'financier_validated' ? "secondary" : "outline"
                  }>
                    {cloture.closure_status}
                  </Badge>
                </div>
                {cloture.manager_validated_at && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Manager:</span>
                    <span className="text-green-600">✅ Validé</span>
                  </div>
                )}
                {cloture.financier_validated_at && (
                  <div className="flex justify-between items-center text-sm">
                    <span>Financier:</span>
                    <span className="text-green-600">✅ Validé</span>
                  </div>
                )}
                {cloture.notes && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Notes:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{cloture.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Tableaux (similaires à la création) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Afficher les tableaux de caisse principale et secondaire en lecture seule */}
            {/* Le code serait similaire à ClotureVenteClose mais sans les boutons d'action */}
          </div>
        </div>
      </div>
    </div>
  )
}