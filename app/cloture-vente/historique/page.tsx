import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Search, FileText, Eye, Building, ArrowLeft, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

interface HistoriquePageProps {
  searchParams: Promise<{
    date?: string
    shop?: string
  }>
}

async function getCloturesHistory() {
  const { data, error } = await supabase
    .from('cash_closures')
    .select(`
      *,
      cash_closure_main_cash (*),
      cash_closure_secondary_cash (*),
      cash_denominations (*)
    `)
    .order('closing_date', { ascending: false }) // ← Changé ici
    .limit(50)

  if (error) {
    console.error('Erreur récupération historique:', error)
    return []
  }

  return data || []
}

export default async function HistoriqueCloturesPage() {
  // const params = await searchParams
  const clotures = await getCloturesHistory()

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Brouillon", variant: "outline" as const },
      manager_validated: { label: "Manager OK", variant: "secondary" as const },
      financier_validated: { label: "Financier OK", variant: "default" as const },
      completed: { label: "Terminée", variant: "default" as const }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getDifferenceColor = (difference: number) => {
    if (Math.abs(difference) < 0.01) return 'text-green-600'
    if (difference > 0) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatPeriod = (openingDate: string, closingDate: string) => {
    const opening = new Date(openingDate)
    const closing = new Date(closingDate)
    
    if (opening.toDateString() === closing.toDateString()) {
      // Même jour
      return format(opening, 'dd MMMM yyyy', { locale: fr })
    } else {
      // Période
      return `${format(opening, 'dd/MM')} - ${format(closing, 'dd MMMM yyyy', { locale: fr })}`
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/cloture-vente"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Historique des Clôtures
              </h1>
              <p className="text-gray-600 mt-2">
                Consultation des clôtures passées
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher..."
                className="pl-10 w-64"
              />
            </div>
            <Link href="/cloture-vente">
              <Button>
                Nouvelle Clôture
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clôtures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clotures.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Terminées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {clotures.filter(c => c.closure_status === 'completed').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">En Attente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {clotures.filter(c => c.closure_status !== 'completed').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Boutiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {new Set(clotures.map(c => c.shop_id)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau des clôtures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Liste des Clôtures
            </CardTitle>
            <CardDescription>
              Dernières clôtures enregistrées dans le système
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Période</TableHead> {/* ← Changé ici */}
                  <TableHead>Boutique</TableHead>
                  <TableHead className="text-right">Ventes Total</TableHead>
                  <TableHead className="text-right">Dépenses</TableHead>
                  <TableHead className="text-right">Différence</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clotures.map((cloture) => (
                  <TableRow key={cloture.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatPeriod(cloture.opening_date, cloture.closing_date)} {/* ← Changé ici */}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {cloture.shop_name || `Boutique #${cloture.shop_id}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {cloture.total_sales?.toLocaleString('fr-FR')} $
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {cloture.total_expenses?.toLocaleString('fr-FR')} $
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getDifferenceColor(cloture.difference || 0)}`}>
                      {cloture.difference?.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} $
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(cloture.closure_status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Link href={`/cloture-vente/${cloture.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {clotures.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune clôture enregistrée</p>
                <Link href="/cloture-vente" className="text-blue-600 hover:underline mt-2 inline-block">
                  Créer la première clôture
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}