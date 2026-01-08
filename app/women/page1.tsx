import { Suspense } from 'react';
import OverviewClient from './components/OverviewClient';
import { RefreshCcw } from 'lucide-react';
import { getFemmeOverview } from './actions';

// Props par défaut de Next.js pour les pages
type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
};

export default async function AnalyseFemmePage({ searchParams }: PageProps) {
  // 1. Lire le paramètre d'URL (ou défaut '7j')
  const params = await searchParams
  const range = (params.range as '7j' | '30j' | '12m') || '7j';

  // 2. Fetcher les données côté serveur (Async)
  const data = await getFemmeOverview(range);

  // 3. Rendre le Client Component avec les données
  return (
    <main className="min-h-screen bg-slate-50 p-8">
       {/* 
          Suspense permet d'afficher un loader pendant que getFemmeData tourne.
          Le 'key={range}' force React à ré-afficher le suspense quand la date change.
       */}
       <Suspense key={range} fallback={<LoadingSkeleton />}>
          <OverviewClient data={data} currentRange={range} />
       </Suspense>
    </main>
  );
}

// Un petit composant de chargement local
function LoadingSkeleton() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
      <RefreshCcw className="w-8 h-8 animate-spin mb-4 text-indigo-500"/>
      <p>Synchronisation avec Odoo en cours...</p>
    </div>
  );
}