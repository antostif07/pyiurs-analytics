// app/hr/page.tsx
import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import OverviewClient from './_components/OverviewClient';
import { DashboardSkeleton } from './_components/dashboard-skeleton';
import { getHROverview } from './actions';
import { DateRange, ALLOWED_RANGES } from './types';

// 1. Metadata dynamiques
export const metadata: Metadata = {
  title: 'Dashboard RH | Système de Gestion',
  description: 'Vue d’ensemble des indicateurs de performance RH.',
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
};

export default async function HRPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawRange = (params.range as string) || 'today';

  // 3. Validation stricte du paramètre d'URL
  if (!ALLOWED_RANGES.includes(rawRange as DateRange)) {
    notFound(); // Ou redirection vers 'today'
  }

  const range = rawRange as DateRange;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de bord RH</h1>
        <p className="text-slate-500 text-sm">Analysez les performances et présences en temps réel.</p>
      </header>

      {/* 
          L'utilisation de key={range} est parfaite pour forcer 
          le Suspense à se ré-activer lors du changement de filtre.
      */}
      <Suspense key={range} fallback={<DashboardSkeleton />}>
        <HRDataWrapper range={range} />
      </Suspense>
    </div>
  );
}

/**
 * Composant intermédiaire pour isoler le fetch de données.
 * Cela permet de garder la structure de la page (header) statique 
 * pendant que les données chargent.
 */
async function HRDataWrapper({ range }: { range: DateRange }) {
  try {
    const data = await getHROverview(range);
    
    if (!data) {
      throw new Error("Aucune donnée disponible");
    }

    return <OverviewClient data={data} currentRange={range} />;
  } catch (error) {
    // Dans un vrai projet, on loggue l'erreur (Sentry, Logtail...)
    console.error("Failed to fetch HR data:", error);
    
    return (
      <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
        <p className="text-slate-600 mb-4">Une erreur est survenue lors de la récupération des données.</p>
        <button className="text-rose-600 font-semibold hover:underline">
          Réessayer
        </button>
      </div>
    );
  }
}