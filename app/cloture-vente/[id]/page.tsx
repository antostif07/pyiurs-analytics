import { notFound } from "next/navigation"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { ArrowLeft, CheckCircle, Calendar, Building, FileText, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { CashDenomination, MainCashRow, SecondaryCashRow } from "@/app/types/cloture"

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
  
  // Formater la période
  const formatPeriod = () => {
    const opening = new Date(cloture.opening_date)
    const closing = new Date(cloture.closing_date)
    
    if (opening.toDateString() === closing.toDateString()) {
      return format(opening, 'dd MMMM yyyy', { locale: fr })
    } else {
      return `${format(opening, 'dd/MM/yyyy')} - ${format(closing, 'dd/MM/yyyy')}`
    }
  }

  const getValidationBadge = (manager: boolean, financier: boolean) => {
    if (manager && financier) return <Badge className="bg-green-100 text-green-800">✅ Validé</Badge>
    if (manager) return <Badge className="bg-blue-100 text-blue-800">👔 Manager</Badge>
    if (financier) return <Badge className="bg-purple-100 text-purple-800">💰 Financier</Badge>
    return <Badge variant="outline">⏳ En attente</Badge>
  }

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
              <div className="flex items-center gap-4 mt-2 text-gray-600 flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatPeriod()}
                </div>
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {cloture.shop_name || `Boutique #${cloture.shop_id}`}
                </div>
                <Badge variant={isCompleted ? "default" : "secondary"} className={isCompleted ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                  {isCompleted ? "Terminée" : "En Cours"}
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
                  <h3 className="font-semibold text-green-800">Période Clôturée</h3>
                  <p className="text-green-700 text-sm">
                    Cette période a été validée et clôturée. Les données sont figées.
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

        {/* Sections détaillées */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Colonne gauche - Billeterie et informations */}
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Billeterie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* USD */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">USD</h4>
                  <div className="space-y-2">
                    {cloture.cash_denominations
                      ?.filter((d: CashDenomination) => d.currency === 'USD')
                      .map((denom: CashDenomination) => (
                        <div key={denom.id} className="flex justify-between items-center text-sm">
                          <span>{denom.denomination} $</span>
                          <span className="font-semibold">
                            {denom.quantity} × {denom.amount.toLocaleString('fr-FR')} $
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* CDF */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">CDF</h4>
                  <div className="space-y-2">
                    {cloture.cash_denominations
                      ?.filter((d: CashDenomination) => d.currency === 'CDF')
                      .map((denom: CashDenomination) => (
                        <div key={denom.id} className="flex justify-between items-center text-sm">
                          <span>{denom.denomination.toLocaleString('fr-FR')} FC</span>
                          <span className="font-semibold">
                            {denom.quantity} × {denom.amount.toLocaleString('fr-FR')} FC
                          </span>
                        </div>
                      ))}
                  </div>
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
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Cash Physique Total:</span>
                    <span className="text-blue-600">{cloture.calculated_cash?.toLocaleString('fr-FR')} $</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations de validation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Informations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Statut:</span>
                  <Badge variant={
                    cloture.closure_status === 'completed' ? "default" : 
                    cloture.closure_status === 'financier_validated' ? "secondary" : "outline"
                  }>
                    {cloture.closure_status === 'completed' ? 'Terminée' :
                     cloture.closure_status === 'financier_validated' ? 'Financier OK' :
                     cloture.closure_status === 'manager_validated' ? 'Manager OK' : 'Brouillon'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span>Taux de change:</span>
                  <span className="font-semibold">{cloture.exchange_rate?.toLocaleString('fr-FR')} FC/$</span>
                </div>

                {cloture.notes && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Observations:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">{cloture.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Tableaux */}
          <div className="xl:col-span-2 space-y-6">
            {/* Caisse Principale */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Caisse Principale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mode de Paiement</TableHead>
                      <TableHead className="text-right">Ouverture</TableHead>
                      <TableHead className="text-right">Ventes</TableHead>
                      <TableHead className="text-right">Sorties</TableHead>
                      <TableHead className="text-right">Théorique</TableHead>
                      <TableHead className="text-right">Physique</TableHead>
                      <TableHead className="text-center">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cloture.cash_closure_main_cash?.map((row: MainCashRow) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.payment_method_name}</TableCell>
                        <TableCell className="text-right">{row.opening_balance.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-right text-green-600">+{row.daily_sales.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-right text-red-600">-{row.daily_outflows.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-right font-semibold">{row.theoretical_closure.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-right font-semibold">{row.physical_cash.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-center">
                          {getValidationBadge(row.manager_confirmed, row.financier_confirmed)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Caisse Secondaire */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Caisse Secondaire - Épargnes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Ouverture</TableHead>
                      <TableHead className="text-right">Entrées</TableHead>
                      <TableHead className="text-right">Sorties</TableHead>
                      <TableHead className="text-right">Clôture</TableHead>
                      <TableHead className="text-center">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cloture.cash_closure_secondary_cash?.map((row: SecondaryCashRow) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.savings_category_name}</TableCell>
                        <TableCell className="text-right">{row.opening_balance.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-right text-green-600">+{row.savings_inflows.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-right text-red-600">-{row.savings_outflows.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-right font-semibold">{row.closure_balance.toLocaleString('fr-FR')} $</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={row.validated ? "default" : "outline"} className={row.validated ? "bg-green-100 text-green-800" : ""}>
                            {row.validated ? "Validé" : "En attente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}