import { Suspense } from "react";
import CatalogFilters from "./components/catalog-filters";
import CatalogGridClient from "./components/catalog-grid-client";
import CatalogSkeleton from "./components/catalog-skeleton";
import { getFemmeCatalog, getFemmeInternalCategories, getFemmePosCategories } from "./services";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function ProductGridFetcher({ searchParams, defaultPosCategoryId }: { searchParams: any, defaultPosCategoryId: number }) {

  const activePosCategoryId = searchParams.posCategory ? parseInt(searchParams.posCategory) : defaultPosCategoryId;
  const activeCategoryId = searchParams.categoryId ? parseInt(searchParams.categoryId) : undefined;

  const data = await getFemmeCatalog({
    posCategoryId: activePosCategoryId,
    categoryId: activeCategoryId,
    query: searchParams.query,
    color: searchParams.color,
    size: searchParams.size,
    hsCode: searchParams.hsCode,
    barcode: searchParams.barcode,
  });

  return <CatalogGridClient products={data.products} initialPage={1} />;
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Les catégories principales (POS)
  const posCategories = await getFemmePosCategories();
  const defaultPosCategoryId = posCategories.length > 0 ? posCategories[0].id : 0;
  const activePosCategoryId = params.posCategory ? parseInt(params.posCategory) : defaultPosCategoryId;

  // ✅ 2. NOUVEAU : Les sous-catégories (en fonction du POS sélectionné !)
  const productCategories = await getFemmeInternalCategories(activePosCategoryId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Catalogue Femme</h1>
        <p className="text-slate-500 mt-1 mb-6">Explorez et filtrez les références par catégorie.</p>
      </div>

      {/* ✅ On passe les 2 listes au composant client */}
      <CatalogFilters
        posCategories={posCategories}
        productCategories={productCategories}
        activePosCategoryId={activePosCategoryId.toString()}
      />

      <Suspense key={JSON.stringify(params)} fallback={<CatalogSkeleton />}>
        {defaultPosCategoryId !== 0 ? (
          <ProductGridFetcher searchParams={params} defaultPosCategoryId={defaultPosCategoryId} />
        ) : (
          <div className="text-center py-20 text-slate-500">Aucune catégorie Femme trouvée dans Odoo.</div>
        )}
      </Suspense>
    </div>
  );
}