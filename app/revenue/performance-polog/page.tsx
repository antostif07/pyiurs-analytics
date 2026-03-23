import { Suspense } from "react";
import { getPologPerformanceData } from "./services";
import PologPerformanceClient from "./polog-client";import { TableSkeleton } from "@/components/table-skeleton";
import DateRangePicker from "@/components/DateRangePicker";

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function PologPerformancePage({ searchParams }: Props) {
  const params = await searchParams;

  // Par défaut : Mois en cours
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = now.toISOString().split('T')[0];

  const start = params.start || firstDay;
  const end = params.end || lastDay;

  return (
    <main className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance POLOG</h1>
            <p className="text-slate-500 text-sm">Analyse des produits créés entre le <span className="font-medium text-slate-700">{start}</span> et le <span className="font-medium text-slate-700">{end}</span></p>
          </div>
          <DateRangePicker start={start} end={end} />
        </div>

        {/* Le Wrapper Suspense gère le chargement pendant que Odoo répond */}
        <Suspense key={start + end} fallback={<TableSkeleton />}>
          <PologDataWrapper start={start} end={end} />
        </Suspense>
      </div>
    </main>
  );
}

async function PologDataWrapper({ start, end }: { start: string, end: string }) {
  const { data, allPurchaseOrders } = await getPologPerformanceData(start, end);
  
  if (data.length === 0) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
        <p className="text-slate-500">Aucun produit créé pendant cette période avec un code POLOG.</p>
      </div>
    );
  }

  return <PologPerformanceClient initialData={data} allPurchaseOrders={allPurchaseOrders} />;
}