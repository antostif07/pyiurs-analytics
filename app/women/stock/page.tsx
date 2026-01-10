import { getLifecycleData } from '../services';
import StockClientWrapper from './stock-client';

export const revalidate = 300; // Cache de 5 min par page

// Next.js injecte searchParams automatiquement dans les Server Components
export default async function LifecyclePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams; // Next.js 15+ demande un await
  const page = Number(resolvedSearchParams.page) || 1;
  const pageSize = 50; // On charge 50 modèles par page

  // Appel paginé au service
  const { data, total } = await getLifecycleData(page, pageSize);

  return (
    <div className="p-8 max-w-400 mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Catalogue & Cycle de vie</h1>
            <p className="text-gray-500">
                Performance par Modèle (Page {page})
            </p>
        </div>
      </div>

      <StockClientWrapper 
        data={data} 
        totalCount={total} 
        pageSize={pageSize} 
      />
    </div>
  );
}