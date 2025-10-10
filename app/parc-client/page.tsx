// app/reports/page.tsx
import Link from "next/link";
import WeeklyTabs from "./components/weekly-tab";
import MonthlyTable from "./components/monthly-tabs";
import PageFilters from "./components/filters";
import ShopByWeek from "./components/shop_by_week";

type PageProps = {
    searchParams: Promise<{
        start_date?: string;
        end_date?: string;
    }>;
}

export default async function ReportsPage({searchParams}: PageProps) {
    const params = await searchParams
    const startDate = params.start_date
    const endDate = params.end_date

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </Link>
              
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Rapport Part Client
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  Analyse détaillée des performances clients et acquisition
                </p>
              </div>
            </div>

            {/* Bouton d'export */}
            <div className="mt-4 lg:mt-0">
              <button className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exporter Rapport
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres Mois/Année avec shadcn/ui Select */}
      <PageFilters />

      {/* Le reste du contenu reste identique */}
      <div className="container mx-auto px-6 pb-8 space-y-8">
        {/* Section Semaine */}
        <WeeklyTabs startDate={startDate} endDate={endDate} />

        {/* Section Mensuelle */}
        <MonthlyTable endDate={endDate} />

        {/* Section Performance Acquisition Shop */}
        <ShopByWeek startDate={startDate} endDate={endDate} />

        {/* Statistiques Résumées */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">CA Total Mensuel</p>
              <p className="text-2xl font-bold">$278 464</p>
              <p className="text-xs opacity-80 mt-1">
                Moyenne: $46 411/mois
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Clients Acquis</p>
              <p className="text-2xl font-bold">1 329</p>
              <p className="text-xs opacity-80 mt-1">
                41.6% du total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">Clients Récupérés</p>
              <p className="text-2xl font-bold">1 813</p>
              <p className="text-xs opacity-80 mt-1">
                56.7% du total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <p className="text-sm opacity-90">ARPU Moyen</p>
              <p className="text-2xl font-bold">$88,41</p>
              <p className="text-xs opacity-80 mt-1">
                Sur 6 mois
              </p>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </main>
  );
}