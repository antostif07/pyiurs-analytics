import DateRangePicker from "@/components/DateRangePicker";
import { getStockFlowData } from "./services";
import StockFlowClient from "./stock-flow-client";
import { Suspense } from "react";

export default async function StockFlowPage({ searchParams }: {searchParams: Promise<{start: string; end: string}>}) {
  const params = await searchParams;
  
  // Défaut : Mois dernier
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const start = params.start || firstDay;
  const end = params.end || lastDay;

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-black">Flux de Stock par Catégorie</h1>
            <p className="text-slate-500">Ouverture vs Fermeture</p>
        </div>
        <DateRangePicker start={start} end={end} />
      </div>

      <Suspense fallback={<div>Calcul des flux en cours...</div>}>
        <DataLoader start={start} end={end} />
      </Suspense>
    </main>
  );
}

async function DataLoader({ start, end }: any) {
  const data = await getStockFlowData(start, end);
  console.log(data);
  
  return <div>Stock</div>
//   return <StockFlowClient data={data} />;
}