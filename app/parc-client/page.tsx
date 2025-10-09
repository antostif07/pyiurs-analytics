// app/reports/page.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import WeeklyTabs from "./components/weekly-tab";
import MonthlyTable from "./components/monthly-tabs";
import PageFilters from "./components/filters";

// Données mockées basées sur votre capture d'écran
const mockReportData = {
  weekly: [
    {
      semaine: "W36",
      partGlobal: "19840",
      revPartClient: "$5 960",
      chrgBase: "75 (00.38%)",
      arpu: "$79",
      partAcq: "24 (32.00%)",
      revAcq: "$2226 (37.34%)",
      partRec: "$1 (68%)",
      partGlobal2: "19849",
      revPartClient2: "$2 165",
      chrgBase2: "28 (00.14%)",
      arpu2: "$77",
      partAcq2: "6 (21.43%)",
      revAcq2: "$863 (39.86%)",
      partRec2: "22 (79%)"
    },
    {
      semaine: "W37",
      partGlobal: "19845",
      revPartClient: "$6 120",
      chrgBase: "80 (00.40%)",
      arpu: "$82",
      partAcq: "28 (35.00%)",
      revAcq: "$2450 (40.00%)",
      partRec: "$1 (65%)",
      partGlobal2: "19852",
      revPartClient2: "$2 280",
      chrgBase2: "32 (00.16%)",
      arpu2: "$79",
      partAcq2: "8 (25.00%)",
      revAcq2: "$912 (40.00%)",
      partRec2: "24 (75%)"
    }
  ],
  monthly: [
    {
      month: "Janvier",
      revPartClient: "$35 433",
      chgBase: "348 (2%)",
      arpu: "$101,82",
      partAcq: "107 (30.75%)",
      revAcq: "$12351 (34.86%)",
      partRec: "241 (69%)",
      revRec: "$23 082 (65%)"
    },
    {
      month: "Février",
      revPartClient: "$36 780",
      chgBase: "378 (2%)",
      arpu: "$97,30",
      partAcq: "132 (34.92%)",
      revAcq: "$14309 (38.90%)",
      partRec: "246 (65%)",
      revRec: "$22 471 (61%)"
    },
    {
      month: "Mars",
      revPartClient: "$103 133",
      chgBase: "1226 (7%)",
      arpu: "$84,12",
      partAcq: "659 (53.75%)",
      revAcq: "$55469 (53.78%)",
      partRec: "567 (46%)",
      revRec: "$47 664 (46%)"
    },
    {
      month: "Avril",
      revPartClient: "$35 742",
      chgBase: "435 (2%)",
      arpu: "$82,16",
      partAcq: "151 (34.71%)",
      revAcq: "$15965 (44.67%)",
      partRec: "284 (65%)",
      revRec: "$19 777 (55%)"
    },
    {
      month: "Mai",
      revPartClient: "$33 225",
      chgBase: "384 (2%)",
      arpu: "$86,52",
      partAcq: "117 (30.47%)",
      revAcq: "$11920 (35.88%)",
      partRec: "267 (70%)",
      revRec: "$21 305 (64%)"
    },
    {
      month: "Juin",
      revPartClient: "$29 151",
      chgBase: "371 (2%)",
      arpu: "$78,57",
      partAcq: "163 (43.94%)",
      revAcq: "$11621 (39.86%)",
      partRec: "208 (56%)",
      revRec: "$17 530 (60%)"
    }
  ],
  acquisition: {
    boutiques: [
      { name: "P24", w36: 10, w37: 2 },
      { name: "PKTM", w36: 1, w37: 1 },
      { name: "PMTO", w36: 7, w37: 1 },
      { name: "PONL", w36: 3, w37: 2 },
      { name: "ZARINA", w36: 3, w37: null }
    ],
    total: { w36: 24, w37: 6 }
  },
  telephone: [
    { nom: "Madame Ami", totalAchat: "$120", total: "$2 477" },
    { nom: "BIBICHE IVOLO", totalAchat: "", total: "$2 439" },
    { nom: "M r Abdoi brazza", totalAchat: "$275", total: "" },
    { nom: "Madame Gabriella", totalAchat: "$3 471", total: "" },
    { nom: "Madame Acha Rachidi", totalAchat: "$479", total: "" },
    { nom: "Madame Chistralia", totalAchat: "$325", total: "" }
  ],
  totalGeneral: "$3 262 916"
};

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
        <MonthlyTable />

        {/* Section Performance Acquisition Shop */}
        <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Performance Acquisition Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-semibold">Boutique</th>
                      <th className="text-left py-3 px-4 font-semibold">W36</th>
                      <th className="text-left py-3 px-4 font-semibold">W37</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockReportData.acquisition.boutiques.map((boutique) => (
                      <tr key={boutique.name} className="border-b border-gray-100 dark:border-slate-700">
                        <td className="py-3 px-4 font-medium">{boutique.name}</td>
                        <td className="py-3 px-4">{boutique.w36}</td>
                        <td className="py-3 px-4">{boutique.w37 || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-slate-700/30 font-semibold">
                      <td className="py-3 px-4">Total Mols</td>
                      <td className="py-3 px-4">{mockReportData.acquisition.total.w36}</td>
                      <td className="py-3 px-4">{mockReportData.acquisition.total.w37}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

        {/* Statistiques Résumées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        </div>
      </div>
    </main>
  );
}