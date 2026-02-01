// app/analyse-beauty/by-product/page.tsx
import { getBeautyGroupedPerformance } from "../data-fetcher";
import ProductListManager from "./ProductListManager";

export default async function ByProductPage() {
  const initialGroups = await getBeautyGroupedPerformance(0, 50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyse par Modèle</h1>
        <p className="text-sm text-gray-500">Groupement par HS Code</p>
      </div>

      {/* Le manager gère maintenant le tableau ET le bouton charger plus */}
      <ProductListManager initialData={initialGroups} />
    </div>
  );
}