import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { getPologDetailData } from "../services";
import PologDetailClient from "./polog-detail-client";

export default async function PologDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const {id} = await params
    const pologId = decodeURIComponent(id);

  return (
    <main className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <Link href="/revenue/performance-polog" className="flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" /> Retour au rapport global
        </Link>

        <Suspense fallback={<div>Chargement des détails du lot...</div>}>
          <DataLoader pologId={pologId} />
        </Suspense>
      </div>
    </main>
  );
}

async function DataLoader({ pologId }: { pologId: string }) {
  const data = await getPologDetailData(pologId);
  if (!data) return <div>POLOG non trouvé.</div>;
  return <PologDetailClient data={data} />;
}