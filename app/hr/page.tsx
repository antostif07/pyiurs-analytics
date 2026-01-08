import { Suspense } from 'react';
import OverviewClient from './components/OverviewClient';
import { getHROverview } from './actions';
import { Loader2 } from 'lucide-react';

// Props par défaut de Next.js pour les pages
type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
};

export default async function HRPage({ searchParams }: PageProps) {
  // 1. Lire le paramètre d'URL (ou défaut 'today')
  const params = await searchParams;
  const range = (params.range as string) || 'today';

  // 2. Fetcher les données côté serveur (Async)
  const data = await getHROverview(range);

  // 3. Rendre le Client Component avec les données
  return (
       /* 
          Suspense permet d'afficher un loader pendant que getHROverview tourne.
          Le 'key={range}' force React à ré-afficher le suspense quand le filtre change.
       */
       <Suspense key={range} fallback={<LoadingSkeleton />}>
          <OverviewClient data={data} currentRange={range} />
       </Suspense>
  );
}

// Un petit composant de chargement local
function LoadingSkeleton() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-rose-500"/>
      <p>Chargement des données RH...</p>
    </div>
  );
}