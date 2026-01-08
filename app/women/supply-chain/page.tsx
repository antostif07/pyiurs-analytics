import { Suspense } from "react";
import { Loader2, Container } from "lucide-react";
import { getHSCycleAnalysis } from "../actions/supply-chain";
import LifecycleTable from "../components/LifecycleTable";

export const metadata = { title: "Cycle de Vie Produit • Pyiurs Admin" };

export default async function LifecyclePage() {
  const data = await getHSCycleAnalysis();

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Container className="w-8 h-8 text-indigo-600"/> Historique d'Approvisionnement
        </h1>
        <p className="text-slate-500 mt-1">
            Analyse des entrées en stock (PB-BC) groupées par Code Douanier (HS Code).
        </p>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Analyse des mouvements de stock...</div>}>
         <LifecycleTable data={data} />
      </Suspense>

    </main>
  );
}