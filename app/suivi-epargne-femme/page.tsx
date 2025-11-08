import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export const dynamic = 'force-dynamic'

// Types
interface DailySale {
  date: string
  sales: number
  savings: number
  theoreticalSavings: number
}

interface BoutiqueSalesData {
  boutique: string
  dailySales: DailySale[]
  totalSales: number
  totalSavings: number
  totalTheoreticalSavings: number
}

// Données mockées
const mockBoutiques = ["P24", "P.KTM", "LMB", "MTO", "ONL", "BC"]
const mockMonths = [
  { value: "2024-01", label: "Janvier 2024" },
  { value: "2024-02", label: "Février 2024" },
  { value: "2024-03", label: "Mars 2024" },
  { value: "2024-04", label: "Avril 2024" },
  { value: "2024-05", label: "Mai 2024" },
  { value: "2024-06", label: "Juin 2024" },
]

// Générer des données mockées réalistes
function generateMockData(selectedMonth: string, selectedBoutiques: string[]): BoutiqueSalesData[] {
  const [year, month] = selectedMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  
  return selectedBoutiques.map(boutique => {
    const dailySales: DailySale[] = []
    let totalSales = 0
    let totalSavings = 0
    let totalTheoreticalSavings = 0

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
      
      // Générer des ventes aléatoires réalistes
      const sales = Math.floor(Math.random() * 10) + 200 // 200-1200$ par jour
      const savings = Math.floor(Math.random() * sales * 0.3) // Épargne réelle 0-30% des ventes
      const theoreticalSavings = Math.floor(sales * 0.5) // Épargne théorique = 50% des ventes

      dailySales.push({
        date,
        sales,
        savings,
        theoreticalSavings
      })

      totalSales += sales
      totalSavings += savings
      totalTheoreticalSavings += theoreticalSavings
    }

    return {
      boutique,
      dailySales,
      totalSales,
      totalSavings,
      totalTheoreticalSavings
    }
  })
}

// Composant pour formater les montants
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

// Composant pour les indicateurs de performance
function PerformanceIndicator({ actual, theoretical }: { actual: number; theoretical: number }) {
  const percentage = theoretical > 0 ? (actual / theoretical) * 100 : 0
  const isGood = percentage >= 80
  const isWarning = percentage >= 50 && percentage < 80
  const isBad = percentage < 50

  let bgColor = "bg-gray-100"
  let textColor = "text-gray-700"

  if (isGood) {
    bgColor = "bg-green-100"
    textColor = "text-green-700"
  } else if (isWarning) {
    bgColor = "bg-yellow-100"
    textColor = "text-yellow-700"
  } else if (isBad) {
    bgColor = "bg-red-100"
    textColor = "text-red-700"
  }

  return (
    <Badge variant="secondary" className={`${bgColor} ${textColor} font-medium`}>
      {percentage.toFixed(1)}%
    </Badge>
  )
}

// Composant principal
async function SalesDashboardContent({ 
  searchParams 
}: { 
  searchParams: Promise<{ month?: string; boutiques?: string }> 
}) {
  const params = await searchParams
  const selectedMonth = params.month || "2024-06"
  const selectedBoutiques = params.boutiques ? params.boutiques.split(',') : mockBoutiques

  const data = generateMockData(selectedMonth, selectedBoutiques)
  const [year, month] = selectedMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  // Calcul des totaux globaux
  const globalTotals = {
    sales: data.reduce((sum, boutique) => sum + boutique.totalSales, 0),
    savings: data.reduce((sum, boutique) => sum + boutique.totalSavings, 0),
    theoreticalSavings: data.reduce((sum, boutique) => sum + boutique.totalTheoreticalSavings, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tableau de Bord des Ventes
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Suivi quotidien des ventes et de l&apos;épargne par boutique
            </p>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="month" className="text-sm font-medium mb-2 block">
                  Mois/Année
                </Label>
                <Select defaultValue={selectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockMonths.map(month => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="boutiques" className="text-sm font-medium mb-2 block">
                  Boutiques
                </Label>
                <Select defaultValue="all">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les boutiques</SelectItem>
                    {mockBoutiques.map(boutique => (
                      <SelectItem key={boutique} value={boutique}>
                        {boutique}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tableau principal */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes Quotidiennes par Boutique</CardTitle>
            <CardDescription>
              {new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-32 sticky left-0 bg-white dark:bg-slate-800 z-10">
                      Boutique
                    </TableHead>
                    <TableHead className="min-w-24 text-right font-bold bg-gray-50 dark:bg-slate-700">
                      Total
                    </TableHead>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                      <TableHead key={day} className="min-w-20 text-center">
                        {day}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Ligne des ventes */}
                  <TableRow className="bg-green-50 dark:bg-green-900/20">
                    <TableCell className="font-medium sticky left-0 bg-green-50 dark:bg-green-900/20">
                      Ventes ($)
                    </TableCell>
                    <TableCell className="text-right font-bold bg-green-100 dark:bg-green-800/30">
                      {formatAmount(globalTotals.sales)}
                    </TableCell>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const dailyTotal = data.reduce((sum, boutique) => 
                        sum + (boutique.dailySales[dayIndex]?.sales || 0), 0
                      )
                      return (
                        <TableCell key={dayIndex} className="text-right">
                          {dailyTotal > 0 ? formatAmount(dailyTotal) : "-"}
                        </TableCell>
                      )
                    })}
                  </TableRow>

                  {/* Ligne de l'épargne théorique */}
                  <TableRow className="bg-blue-50 dark:bg-blue-900/20">
                    <TableCell className="font-medium sticky left-0 bg-blue-50 dark:bg-blue-900/20">
                      Épargne Théorique ($)
                    </TableCell>
                    <TableCell className="text-right font-bold bg-blue-100 dark:bg-blue-800/30">
                      {formatAmount(globalTotals.theoreticalSavings)}
                    </TableCell>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const dailyTotal = data.reduce((sum, boutique) => 
                        sum + (boutique.dailySales[dayIndex]?.theoreticalSavings || 0), 0
                      )
                      return (
                        <TableCell key={dayIndex} className="text-right">
                          {dailyTotal > 0 ? formatAmount(dailyTotal) : "-"}
                        </TableCell>
                      )
                    })}
                  </TableRow>

                  {/* Ligne de l'épargne réelle */}
                  <TableRow className="bg-purple-50 dark:bg-purple-900/20">
                    <TableCell className="font-medium sticky left-0 bg-purple-50 dark:bg-purple-900/20">
                      Épargne Réelle ($)
                    </TableCell>
                    <TableCell className="text-right font-bold bg-purple-100 dark:bg-purple-800/30">
                      {formatAmount(globalTotals.savings)}
                    </TableCell>
                    {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const dailyTotal = data.reduce((sum, boutique) => 
                        sum + (boutique.dailySales[dayIndex]?.savings || 0), 0
                      )
                      return (
                        <TableCell key={dayIndex} className="text-right">
                          {dailyTotal > 0 ? formatAmount(dailyTotal) : "-"}
                        </TableCell>
                      )
                    })}
                  </TableRow>

                  {/* Lignes par boutique */}
                  {/* {data.map((boutiqueData) => (
                    <TableRow key={boutiqueData.boutique}>
                      <TableCell className="font-medium sticky left-0 bg-white dark:bg-slate-800">
                        {boutiqueData.boutique}
                      </TableCell>
                      <TableCell className="text-right font-bold bg-gray-50 dark:bg-slate-700">
                        <div className="space-y-1">
                          <div className="text-green-600">{formatAmount(boutiqueData.totalSales)}</div>
                          <div className="text-blue-600 text-sm">{formatAmount(boutiqueData.totalTheoreticalSavings)}</div>
                          <div className="text-purple-600 text-sm">{formatAmount(boutiqueData.totalSavings)}</div>
                          <div className="pt-1">
                            <PerformanceIndicator 
                              actual={boutiqueData.totalSavings} 
                              theoretical={boutiqueData.totalTheoreticalSavings} 
                            />
                          </div>
                        </div>
                      </TableCell>
                      {boutiqueData.dailySales.map((day, dayIndex) => (
                        <TableCell key={dayIndex} className="text-right">
                          <div className="space-y-1">
                            <div className="text-green-600 font-medium">
                              {day.sales > 0 ? formatAmount(day.sales) : "-"}
                            </div>
                            <div className="text-blue-600 text-xs">
                              {day.theoreticalSavings > 0 ? formatAmount(day.theoreticalSavings) : "-"}
                            </div>
                            <div className="text-purple-600 text-xs">
                              {day.savings > 0 ? formatAmount(day.savings) : "-"}
                            </div>
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))} */}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Légende */}
        {/* <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Ventes de la journée</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Épargne théorique (50% des ventes)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span>Épargne réelle réalisée</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">≥80%</Badge>
                <span>Performance excellente</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-700">50-79%</Badge>
                <span>Performance moyenne</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-700">{'<50%'}</Badge>
                <span>Performance faible</span>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}

// Composant de fallback pour le loading
function SalesDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        {/* Squelette pour le reste du contenu */}
      </div>
    </div>
  )
}

// Page principale
export default async function SalesDashboardPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ month?: string; boutiques?: string }> 
}) {
  return (
    <Suspense fallback={<SalesDashboardSkeleton />}>
      <SalesDashboardContent searchParams={searchParams} />
    </Suspense>
  )
}