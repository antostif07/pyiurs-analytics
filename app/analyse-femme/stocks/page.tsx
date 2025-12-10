import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { format, subDays } from "date-fns";
import { getPerformanceAnalysis } from "../actions/stocks";
import { DateRangeFilter } from "../../../components/DateRangeFilter";
import PerformanceTable from "../components/PerformanceTable";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

export const metadata = { title: "Analyse Collections • Pyiurs Femme" };

export default async function PerformancePage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // Dates par défaut : 30 derniers jours
  const from = params.from || format(subDays(new Date(), 30), "yyyy-MM-dd");
  const to = params.to || format(new Date(), "yyyy-MM-dd");

  const analysisData = await getPerformanceAnalysis(from, to);

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Performance Ref</h1>
          <p className="text-slate-500 mt-1">
            Analysez le succès des produits lancés sur une période donnée.
          </p>
        </div>
        
        {/* Le Sélecteur de Date */}
        <DateRangeFilter />
      </div>

      {/* Résumé rapide (optionnel) */}
      <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 uppercase font-bold">Nouveaux Modèles</span>
              <div className="text-2xl font-bold mt-1">{analysisData.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 uppercase font-bold">Best Sellers</span>
              <div className="text-2xl font-bold mt-1 text-purple-600">
                  {analysisData.filter(d => d.decision === 'BEST_SELLER').length}
              </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 uppercase font-bold">À Solder (Flops)</span>
              <div className="text-2xl font-bold mt-1 text-red-600">
                  {analysisData.filter(d => d.decision === 'DEAD').length}
              </div>
          </div>
      </div>

      <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin text-slate-400"/></div>}>
        <PerformanceTable data={analysisData} />
      </Suspense>

    </main>
  );
}